package com.churchapp.service;

import com.churchapp.dto.PostResponse;
import com.churchapp.entity.MediaFile;
import com.churchapp.entity.Post;
import com.churchapp.entity.PostBookmark;
import com.churchapp.entity.PostLike;
import com.churchapp.repository.MediaFileRepository;
import com.churchapp.repository.PostBookmarkRepository;
import com.churchapp.repository.PostLikeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PostResponseMapper {

    private final PostLikeRepository postLikeRepository;
    private final PostBookmarkRepository postBookmarkRepository;
    private final MediaUrlService mediaUrlService;
    private final MediaFileRepository mediaFileRepository;

    public Page<PostResponse> mapPage(Page<Post> posts, UUID viewerId) {
        if (posts == null) {
            return Page.empty();
        }

        if (posts.getContent().isEmpty()) {
            return new PageImpl<>(Collections.emptyList(), posts.getPageable(), posts.getTotalElements());
        }

        List<Post> content = posts.getContent();
        List<PostResponse> mapped = mapList(content, viewerId);
        return new PageImpl<>(mapped, posts.getPageable(), posts.getTotalElements());
    }

    public List<PostResponse> mapList(List<Post> posts, UUID viewerId) {
        if (posts == null || posts.isEmpty()) {
            return Collections.emptyList();
        }

        if (viewerId == null) {
            return posts.stream()
                .map(this::mapPostWithOptimizedUrls)
                .collect(Collectors.toList());
        }

        List<UUID> postIds = posts.stream()
            .map(Post::getId)
            .collect(Collectors.toList());

        Set<UUID> likedPostIds = postLikeRepository.findById_UserIdAndId_PostIdIn(viewerId, postIds).stream()
            .map(PostLike::getId)
            .map(PostLike.PostLikeId::getPostId)
            .collect(Collectors.toSet());

        Set<UUID> bookmarkedPostIds = postBookmarkRepository.findById_UserIdAndId_PostIdIn(viewerId, postIds).stream()
            .map(PostBookmark::getId)
            .map(PostBookmark.PostBookmarkId::getPostId)
            .collect(Collectors.toSet());

        return posts.stream()
            .map(post -> mapPostInternal(post, likedPostIds.contains(post.getId()), bookmarkedPostIds.contains(post.getId())))
            .collect(Collectors.toList());
    }

    public PostResponse mapPost(Post post, UUID viewerId) {
        if (post == null) {
            return null;
        }

        if (viewerId == null) {
            return mapPostWithOptimizedUrls(post);
        }

        boolean liked = postLikeRepository.existsById_PostIdAndId_UserId(post.getId(), viewerId);
        boolean bookmarked = postBookmarkRepository.existsById_PostIdAndId_UserId(post.getId(), viewerId);
        return mapPostInternal(post, liked, bookmarked);
    }

    private PostResponse mapPostInternal(Post post, boolean liked, boolean bookmarked) {
        PostResponse response = mapPostWithOptimizedUrls(post);
        response.setLikedByCurrentUser(liked);
        response.setBookmarkedByCurrentUser(bookmarked);
        return response;
    }
    
    /**
     * Map Post to PostResponse with optimized URLs
     * Uses MediaUrlService to resolve best URLs (optimized if available, original otherwise)
     * Dynamically refreshes thumbnail URLs from MediaFile records so thumbnails appear
     * as soon as they're generated (even if post was created before thumbnail generation completed)
     */
    private PostResponse mapPostWithOptimizedUrls(Post post) {
        PostResponse response = PostResponse.fromEntity(post);
        
        // Store original URLs before converting to optimized (needed for thumbnail lookup)
        List<String> originalMediaUrls = post.getMediaUrls() != null 
            ? new ArrayList<>(post.getMediaUrls()) 
            : new ArrayList<>();
        
        // Resolve optimized URLs if available
        if (response.getMediaUrls() != null && !response.getMediaUrls().isEmpty()) {
            response.setMediaUrls(mediaUrlService.getBestUrls(response.getMediaUrls()));
        }
        
        // Dynamically refresh thumbnail URLs from MediaFile records
        // This ensures thumbnails appear as soon as they're generated, even if the post
        // was created before MediaConvert completed thumbnail generation
        // Use original URLs for lookup since MediaFile records are keyed by originalUrl
        if (originalMediaUrls != null && !originalMediaUrls.isEmpty() && response.getMediaTypes() != null) {
            List<String> refreshedThumbnails = refreshThumbnailUrls(
                originalMediaUrls,  // Use original URLs for MediaFile lookup
                response.getMediaTypes(),
                response.getThumbnailUrls()
            );
            response.setThumbnailUrls(refreshedThumbnails);
        }
        
        return response;
    }
    
    /**
     * Refresh thumbnail URLs by looking up MediaFile records
     * This solves the issue where thumbnails are generated asynchronously after post creation
     * 
     * @param mediaUrls List of media URLs from the post
     * @param mediaTypes List of media types (e.g., "video/mp4", "image/jpeg")
     * @param existingThumbnails Thumbnail URLs already stored in the post (may contain nulls)
     * @return Refreshed list of thumbnail URLs (with nulls replaced if thumbnails are now available)
     */
    private List<String> refreshThumbnailUrls(List<String> mediaUrls, List<String> mediaTypes, List<String> existingThumbnails) {
        if (mediaUrls == null || mediaUrls.isEmpty()) {
            return existingThumbnails != null ? existingThumbnails : new ArrayList<>();
        }
        
        List<String> refreshedThumbnails = new ArrayList<>();
        
        for (int i = 0; i < mediaUrls.size(); i++) {
            String mediaUrl = mediaUrls.get(i);
            String mediaType = i < mediaTypes.size() ? mediaTypes.get(i) : null;
            String existingThumbnail = (existingThumbnails != null && i < existingThumbnails.size()) 
                ? existingThumbnails.get(i) 
                : null;
            
            // If we already have a thumbnail, use it
            if (existingThumbnail != null && !existingThumbnail.trim().isEmpty()) {
                refreshedThumbnails.add(existingThumbnail);
                continue;
            }
            
            // Only videos need thumbnails
            if (mediaType != null && mediaType.startsWith("video/")) {
                // Look up MediaFile to see if thumbnail has been generated
                try {
                    // Try to find MediaFile by original URL
                    // Note: mediaUrl might be optimized URL, so we need to check both
                    Optional<MediaFile> mediaFileOpt = mediaFileRepository.findByOriginalUrl(mediaUrl);
                    
                    // If not found by original URL, try optimized URL
                    if (mediaFileOpt.isEmpty()) {
                        mediaFileOpt = mediaFileRepository.findByOptimizedUrl(mediaUrl);
                    }
                    
                    if (mediaFileOpt.isPresent()) {
                        MediaFile mediaFile = mediaFileOpt.get();
                        if (mediaFile.getThumbnailUrl() != null && !mediaFile.getThumbnailUrl().trim().isEmpty()) {
                            // Thumbnail is now available! Use it
                            String thumbnailUrl = mediaUrlService.ensureCloudFrontUrl(mediaFile.getThumbnailUrl());
                            refreshedThumbnails.add(thumbnailUrl);
                            log.debug("✅ Refreshed thumbnail for video {}: {}", mediaUrl, thumbnailUrl);
                            continue;
                        }
                    }
                } catch (Exception e) {
                    // If lookup fails, log but don't break - just use existing thumbnail (null)
                    log.warn("⚠️ Error looking up thumbnail for video {}: {}", mediaUrl, e.getMessage());
                }
            }
            
            // No thumbnail available yet - keep existing (null)
            refreshedThumbnails.add(existingThumbnail);
        }
        
        return refreshedThumbnails;
    }
}

