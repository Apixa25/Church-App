package com.churchapp.service;

import com.churchapp.dto.PostResponse;
import com.churchapp.entity.Post;
import com.churchapp.entity.PostBookmark;
import com.churchapp.entity.PostLike;
import com.churchapp.repository.PostBookmarkRepository;
import com.churchapp.repository.PostLikeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PostResponseMapper {

    private final PostLikeRepository postLikeRepository;
    private final PostBookmarkRepository postBookmarkRepository;
    private final MediaUrlService mediaUrlService;

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
     */
    private PostResponse mapPostWithOptimizedUrls(Post post) {
        PostResponse response = PostResponse.fromEntity(post);
        // Resolve optimized URLs if available
        if (response.getMediaUrls() != null && !response.getMediaUrls().isEmpty()) {
            response.setMediaUrls(mediaUrlService.getBestUrls(response.getMediaUrls()));
        }
        return response;
    }
}

