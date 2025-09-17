package com.churchapp.service;

import com.churchapp.entity.*;
import com.churchapp.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PostService {

    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final HashtagRepository hashtagRepository;
    private final PostHashtagRepository postHashtagRepository;
    private final PostLikeRepository postLikeRepository;
    private final PostCommentRepository postCommentRepository;
    private final PostShareRepository postShareRepository;
    private final PostBookmarkRepository postBookmarkRepository;

    @Transactional
    public Post createPost(String userEmail, String content, List<String> mediaUrls,
                          List<String> mediaTypes, Post.PostType postType,
                          String category, String location, boolean isAnonymous) {

        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new RuntimeException("User not found"));

        // Validate content length
        if (content == null || content.trim().isEmpty()) {
            throw new IllegalArgumentException("Post content cannot be empty");
        }
        if (content.length() > 2000) {
            throw new IllegalArgumentException("Post content cannot exceed 2000 characters");
        }

        Post post = new Post();
        post.setUser(user);
        post.setContent(content.trim());
        post.setMediaUrls(mediaUrls != null ? mediaUrls : List.of());
        post.setMediaTypes(mediaTypes != null ? mediaTypes : List.of());
        post.setPostType(postType != null ? postType : Post.PostType.GENERAL);
        post.setCategory(category);
        post.setLocation(location);
        post.setIsAnonymous(isAnonymous);

        Post savedPost = postRepository.save(post);
        log.info("Created new post with ID: {} by user: {}", savedPost.getId(), userEmail);

        // Process hashtags in content
        processHashtags(savedPost);

        return savedPost;
    }

    @Transactional
    public Post createReply(String userEmail, UUID parentPostId, String content,
                           List<String> mediaUrls, List<String> mediaTypes, boolean isAnonymous) {

        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Post parentPost = postRepository.findById(parentPostId)
            .orElseThrow(() -> new RuntimeException("Parent post not found"));

        Post reply = new Post();
        reply.setUser(user);
        reply.setContent(content.trim());
        reply.setMediaUrls(mediaUrls != null ? mediaUrls : List.of());
        reply.setMediaTypes(mediaTypes != null ? mediaTypes : List.of());
        reply.setParentPost(parentPost);
        reply.setIsReply(true);
        reply.setIsAnonymous(isAnonymous);

        Post savedReply = postRepository.save(reply);

        // Increment comment count on parent post
        parentPost.incrementCommentsCount();
        postRepository.save(parentPost);

        log.info("Created reply with ID: {} to post: {}", savedReply.getId(), parentPostId);

        // Process hashtags in reply
        processHashtags(savedReply);

        return savedReply;
    }

    @Transactional
    public Post createQuote(String userEmail, UUID quotedPostId, String content,
                           List<String> mediaUrls, List<String> mediaTypes) {

        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Post quotedPost = postRepository.findById(quotedPostId)
            .orElseThrow(() -> new RuntimeException("Quoted post not found"));

        Post quote = new Post();
        quote.setUser(user);
        quote.setContent(content.trim());
        quote.setMediaUrls(mediaUrls != null ? mediaUrls : List.of());
        quote.setMediaTypes(mediaTypes != null ? mediaTypes : List.of());
        quote.setQuotedPost(quotedPost);
        quote.setIsQuote(true);

        Post savedQuote = postRepository.save(quote);

        // Increment shares count on quoted post
        quotedPost.incrementSharesCount();
        postRepository.save(quotedPost);

        log.info("Created quote with ID: {} of post: {}", savedQuote.getId(), quotedPostId);

        // Process hashtags in quote
        processHashtags(savedQuote);

        return savedQuote;
    }

    public Optional<Post> getPost(UUID postId) {
        return postRepository.findById(postId);
    }

    public Page<Post> getUserPosts(UUID userId, Pageable pageable) {
        return postRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    public Page<Post> getFeed(String userEmail, String feedType, Pageable pageable) {
        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new RuntimeException("User not found"));

        switch (feedType.toLowerCase()) {
            case "following":
                return getFollowingFeed(user.getId(), pageable);
            case "trending":
                return getTrendingFeed(pageable);
            case "chronological":
            default:
                return postRepository.findMainPostsForFeed(pageable);
        }
    }

    private Page<Post> getFollowingFeed(UUID userId, Pageable pageable) {
        // Get users that this user follows
        List<UUID> followingIds = userRepository.findById(userId)
            .map(user -> {
                // This would need to be implemented in UserRepository
                // For now, return empty list - we'll implement this later
                return List.<UUID>of();
            })
            .orElse(List.of());

        if (followingIds.isEmpty()) {
            // If user follows no one, return general feed
            return postRepository.findMainPostsForFeed(pageable);
        }

        return postRepository.findPostsByFollowingUsers(followingIds, pageable);
    }

    private Page<Post> getTrendingFeed(Pageable pageable) {
        LocalDateTime since = LocalDateTime.now().minusDays(7);
        return postRepository.findTrendingPosts(since, pageable);
    }

    public Page<Post> searchPosts(String searchTerm, Pageable pageable) {
        return postRepository.findByContentContaining(searchTerm, pageable);
    }

    public List<Post> getPostThread(UUID postId) {
        return postRepository.findThreadByPostId(postId);
    }

    @Transactional
    public void deletePost(String userEmail, UUID postId) {
        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Post post = postRepository.findById(postId)
            .orElseThrow(() -> new RuntimeException("Post not found"));

        // Check if user owns the post
        if (!post.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("You can only delete your own posts");
        }

        // Clean up related data
        cleanupPostData(postId);

        // Delete the post
        postRepository.delete(post);

        log.info("Deleted post with ID: {} by user: {}", postId, userEmail);
    }

    @Transactional
    public void likePost(String userEmail, UUID postId) {
        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Post post = postRepository.findById(postId)
            .orElseThrow(() -> new RuntimeException("Post not found"));

        // Check if already liked
        if (postLikeRepository.existsById_PostIdAndId_UserId(postId, user.getId())) {
            throw new RuntimeException("Post already liked");
        }

        // Create like
        PostLike.PostLikeId likeId = new PostLike.PostLikeId(postId, user.getId());
        PostLike like = new PostLike();
        like.setId(likeId);

        postLikeRepository.save(like);

        // Update post like count
        post.incrementLikesCount();
        postRepository.save(post);

        log.info("User {} liked post {}", userEmail, postId);
    }

    @Transactional
    public void unlikePost(String userEmail, UUID postId) {
        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Post post = postRepository.findById(postId)
            .orElseThrow(() -> new RuntimeException("Post not found"));

        // Find and delete like
        Optional<PostLike> like = postLikeRepository.findById_PostIdAndId_UserId(postId, user.getId());
        if (like.isPresent()) {
            postLikeRepository.delete(like.get());

            // Update post like count
            post.decrementLikesCount();
            postRepository.save(post);

            log.info("User {} unliked post {}", userEmail, postId);
        }
    }

    public boolean isPostLikedByUser(UUID postId, UUID userId) {
        return postLikeRepository.existsById_PostIdAndId_UserId(postId, userId);
    }

    @Transactional
    public void sharePost(String userEmail, UUID postId) {
        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Post post = postRepository.findById(postId)
            .orElseThrow(() -> new RuntimeException("Post not found"));

        // Check if already shared
        if (postShareRepository.existsByPostIdAndUserId(postId, user.getId())) {
            throw new RuntimeException("Post already shared");
        }

        // Create share
        PostShare share = new PostShare();
        share.setPost(post);
        share.setUser(user);
        share.setShareType(PostShare.ShareType.REPOST);

        postShareRepository.save(share);

        // Update post share count
        post.incrementSharesCount();
        postRepository.save(post);

        log.info("User {} shared post {}", userEmail, postId);
    }

    @Transactional
    public void bookmarkPost(String userEmail, UUID postId) {
        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Post post = postRepository.findById(postId)
            .orElseThrow(() -> new RuntimeException("Post not found"));

        // Check if already bookmarked
        if (postBookmarkRepository.existsById_PostIdAndId_UserId(postId, user.getId())) {
            throw new RuntimeException("Post already bookmarked");
        }

        // Create bookmark
        PostBookmark.PostBookmarkId bookmarkId = new PostBookmark.PostBookmarkId(postId, user.getId());
        PostBookmark bookmark = new PostBookmark();
        bookmark.setId(bookmarkId);

        postBookmarkRepository.save(bookmark);

        // Update post bookmark count
        post.incrementBookmarksCount();
        postRepository.save(post);

        log.info("User {} bookmarked post {}", userEmail, postId);
    }

    @Transactional
    public void unbookmarkPost(String userEmail, UUID postId) {
        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Post post = postRepository.findById(postId)
            .orElseThrow(() -> new RuntimeException("Post not found"));

        // Find and delete bookmark
        Optional<PostBookmark> bookmark = postBookmarkRepository.findById_PostIdAndId_UserId(postId, user.getId());
        if (bookmark.isPresent()) {
            postBookmarkRepository.delete(bookmark.get());

            // Update post bookmark count
            post.decrementBookmarksCount();
            postRepository.save(post);

            log.info("User {} unbookmarked post {}", userEmail, postId);
        }
    }

    private void processHashtags(Post post) {
        // Extract hashtags from content using regex
        String hashtagPattern = "#(\\w+)";
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile(hashtagPattern);
        java.util.regex.Matcher matcher = pattern.matcher(post.getContent());

        while (matcher.find()) {
            String tag = matcher.group(1);
            Optional<Hashtag> existingHashtag = hashtagRepository.findByTag(tag);

            Hashtag hashtag;
            if (existingHashtag.isPresent()) {
                hashtag = existingHashtag.get();
                hashtag.incrementUsageCount();
            } else {
                hashtag = new Hashtag();
                hashtag.setTag(tag);
                hashtag.setUsageCount(1);
            }

            hashtag = hashtagRepository.save(hashtag);

            // Create post-hashtag relationship
            PostHashtag.PostHashtagId postHashtagId = new PostHashtag.PostHashtagId(post.getId(), hashtag.getId());
            PostHashtag postHashtag = new PostHashtag();
            postHashtag.setId(postHashtagId);
            postHashtagRepository.save(postHashtag);
        }
    }

    private void cleanupPostData(UUID postId) {
        // Delete associated likes, comments, shares, bookmarks
        postLikeRepository.deleteByPostId(postId);
        postCommentRepository.deleteByPostId(postId);
        postShareRepository.deleteByPostId(postId);
        postBookmarkRepository.deleteByPostId(postId);
        postHashtagRepository.deleteByPostId(postId);
    }

    // Statistics methods
    public long getUserPostCount(UUID userId) {
        return postRepository.countByUserId(userId);
    }

    public long getUserPostCountSince(UUID userId, LocalDateTime since) {
        return postRepository.countByUserIdSince(userId, since);
    }
}
