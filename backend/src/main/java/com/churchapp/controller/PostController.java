package com.churchapp.controller;

import com.churchapp.dto.*;
import com.churchapp.entity.Post;
import com.churchapp.entity.PostComment;
import com.churchapp.repository.PostRepository;
import com.churchapp.repository.UserRepository;
import com.churchapp.service.FeedService;
import com.churchapp.service.FileUploadService;
import com.churchapp.service.MediaUrlService;
import com.churchapp.service.NotificationService;
import com.churchapp.service.PostAnalyticsService;
import com.churchapp.service.PostInteractionService;
import com.churchapp.service.PostResponseMapper;
import com.churchapp.service.PostService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/posts")
@RequiredArgsConstructor
@Slf4j
public class PostController {

    private final PostService postService;
    private final PostInteractionService postInteractionService;
    private final FeedService feedService;
    private final NotificationService notificationService;
    private final FileUploadService fileUploadService;
    private final PostResponseMapper postResponseMapper;
    private final PostAnalyticsService postAnalyticsService;
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final MediaUrlService mediaUrlService;
    private final com.churchapp.service.PostCommentReadStatusService postCommentReadStatusService;

    // ========== POST CRUD OPERATIONS ==========

    @PostMapping
    public ResponseEntity<PostResponse> createPost(
            @RequestBody CreatePostRequest request,
            @AuthenticationPrincipal User user) {

        try {
            log.info("📝 Creating post - externalUrl: {}, content length: {}, mediaUrls count: {}", 
                request.getExternalUrl() != null ? request.getExternalUrl() : "null",
                request.getContent() != null ? request.getContent().length() : 0,
                request.getMediaUrls() != null ? request.getMediaUrls().size() : 0);
            
            // Use new multi-tenant createPost method with optional org/group context
            Post post = postService.createPost(
                user.getUsername(),
                request.getContent(),
                request.getMediaUrls(),
                request.getMediaTypes(),
                request.getPostType(),
                request.getCategory(),
                request.getLocation(),
                request.isAnonymous(),
                request.getOrganizationId(),  // Multi-tenant: optional org context
                request.getGroupId(),          // Multi-tenant: optional group context
                request.getExternalUrl()       // Social media embed: optional external URL
            );

            PostResponse response = postResponseMapper.mapPost(post, resolveUserId(user));
            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (IllegalArgumentException e) {
            log.error("Invalid request creating post: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("Error creating post for user {}: {}", user != null ? user.getUsername() : "unknown", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/reply/{postId}")
    public ResponseEntity<PostResponse> createReply(
            @PathVariable UUID postId,
            @RequestBody CreateReplyRequest request,
            @AuthenticationPrincipal User user) {

        try {
            Post reply = postService.createReply(
                user.getUsername(),
                postId,
                request.getContent(),
                request.getMediaUrls(),
                request.getMediaTypes(),
                request.isAnonymous()
            );

            PostResponse response = postResponseMapper.mapPost(reply, resolveUserId(user));
            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/quote/{postId}")
    public ResponseEntity<PostResponse> createQuote(
            @PathVariable UUID postId,
            @RequestBody CreateQuoteRequest request,
            @AuthenticationPrincipal User user) {

        try {
            Post quote = postService.createQuote(
                user.getUsername(),
                postId,
                request.getContent(),
                request.getMediaUrls(),
                request.getMediaTypes()
            );

            PostResponse response = postResponseMapper.mapPost(quote, resolveUserId(user));
            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{postId}")
    public ResponseEntity<PostResponse> getPost(
            @PathVariable UUID postId,
            @AuthenticationPrincipal User user) {
        Optional<Post> post = postService.getPost(postId);

        if (post.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        // Record post view
        UUID viewerId = null;
        if (user != null) {
            try {
                com.churchapp.entity.User viewer = userRepository.findByEmail(user.getUsername()).orElse(null);
                if (viewer != null) {
                    viewerId = viewer.getId();
                }
            } catch (Exception e) {
                // If we can't get viewer ID, continue without recording view
            }
        }
        postAnalyticsService.recordPostView(postId, viewerId);

        PostResponse response = postResponseMapper.mapPost(post.get(), resolveUserId(user));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<Page<PostResponse>> getUserPosts(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal User user) {

        Pageable pageable = PageRequest.of(page, size);
        
        // Get viewer's user ID for mutual blocking filter
        UUID viewerUserId = resolveUserId(user);
        
        Page<Post> posts = postService.getUserPosts(userId, viewerUserId, pageable);
        Page<PostResponse> responses = postResponseMapper.mapPage(posts, viewerUserId);

        return ResponseEntity.ok(responses);
    }

    @GetMapping("/user/{userId}/comments")
    public ResponseEntity<Page<CommentResponse>> getUserComments(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal User user) {

        Pageable pageable = PageRequest.of(page, size);
        
        // Get viewer's user ID to filter blocked users
        UUID viewerUserId = null;
        if (user != null) {
            try {
                com.churchapp.entity.User viewer = userRepository.findByEmail(user.getUsername()).orElse(null);
                if (viewer != null) {
                    viewerUserId = viewer.getId();
                }
            } catch (Exception e) {
                // If we can't get viewer ID, continue without filtering
            }
        }
        
        Page<PostComment> comments = postInteractionService.getUserComments(userId, viewerUserId, pageable);
        Page<CommentResponse> responses = comments.map(CommentResponse::fromEntity);

        return ResponseEntity.ok(responses);
    }

    /**
     * Get comments that others have made on posts owned by a specific user
     * This is for the "Comments on my content" tab in user profiles
     */
    @GetMapping("/user/{userId}/comments-received")
    public ResponseEntity<Page<CommentResponse>> getCommentsReceivedByUser(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal User user) {

        Pageable pageable = PageRequest.of(page, size);

        // Get viewer's user ID to filter blocked users
        UUID viewerUserId = resolveUserId(user);

        Page<PostComment> comments = postInteractionService.getCommentsReceivedByUser(userId, viewerUserId, pageable);
        Page<CommentResponse> responses = comments.map(comment -> {
            CommentResponse response = CommentResponse.fromEntity(comment);
            // Resolve optimized URLs if available
            if (response.getMediaUrls() != null && !response.getMediaUrls().isEmpty()) {
                response.setMediaUrls(mediaUrlService.getBestUrls(response.getMediaUrls()));
            }
            return response;
        });

        return ResponseEntity.ok(responses);
    }

    /**
     * Check if user has new comments received since they last viewed the Comments tab
     * Returns { "hasNew": true/false } for the "New" badge on Comments tab
     */
    @GetMapping("/user/{userId}/has-new-comments")
    public ResponseEntity<Map<String, Boolean>> hasNewCommentsReceived(
            @PathVariable UUID userId,
            @AuthenticationPrincipal User user) {

        // Only allow users to check their own status
        UUID viewerUserId = resolveUserId(user);
        if (viewerUserId == null || !viewerUserId.equals(userId)) {
            return ResponseEntity.ok(Map.of("hasNew", false));
        }

        try {
            boolean hasNew = postInteractionService.hasNewCommentsReceived(userId);
            return ResponseEntity.ok(Map.of("hasNew", hasNew));
        } catch (Exception e) {
            log.error("Error checking for new comments for user {}: {}", userId, e.getMessage());
            return ResponseEntity.ok(Map.of("hasNew", false));
        }
    }

    @GetMapping("/user/{userId}/media")
    public ResponseEntity<Page<PostResponse>> getUserMediaPosts(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal User user) {

        Pageable pageable = PageRequest.of(page, size);
        
        // Get viewer's user ID for mutual blocking filter
        UUID viewerUserId = resolveUserId(user);
        
        Page<Post> posts = postService.getUserPostsWithMedia(userId, viewerUserId, pageable);
        Page<PostResponse> responses = postResponseMapper.mapPage(posts, viewerUserId);

        return ResponseEntity.ok(responses);
    }

    @DeleteMapping("/{postId}")
    public ResponseEntity<Void> deletePost(
            @PathVariable UUID postId,
            @AuthenticationPrincipal User user) {

        try {
            postService.deletePost(user.getUsername(), postId);
            return ResponseEntity.noContent().build();

        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ========== FEED OPERATIONS ==========

    /**
     * Multi-tenant feed endpoint
     * Returns posts based on user's feed preferences (primary org, secondary orgs, groups)
     */
    @GetMapping("/feed")
    public ResponseEntity<Page<PostResponse>> getFeed(
            @RequestParam(defaultValue = "community") String feedType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal User user) {

        try {
            UUID viewerId = resolveUserId(user);
            Pageable pageable = PageRequest.of(page, size);

            Page<Post> posts;

            // Route to appropriate feed based on feedType
            if ("trending".equalsIgnoreCase(feedType)) {
                posts = postService.getTrendingFeed(viewerId, pageable);
            } else if ("following".equalsIgnoreCase(feedType)) {
                posts = postService.getFollowingFeed(viewerId, pageable);
            } else {
                // Default to multi-tenant chronological feed (community)
                posts = postService.getMultiTenantFeed(viewerId, pageable);
            }

            Page<PostResponse> responses = postResponseMapper.mapPage(posts, viewerId);
            return ResponseEntity.ok(responses);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get posts for a specific organization
     */
    @GetMapping("/feed/organization/{orgId}")
    public ResponseEntity<Page<PostResponse>> getOrganizationFeed(
            @PathVariable UUID orgId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal User user) {

        try {
            Pageable pageable = PageRequest.of(page, size);
            Page<Post> posts = postService.getOrganizationFeed(orgId, pageable);
            Page<PostResponse> responses = postResponseMapper.mapPage(posts, resolveUserId(user));

            return ResponseEntity.ok(responses);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get posts for a specific group
     */
    @GetMapping("/feed/group/{groupId}")
    public ResponseEntity<Page<PostResponse>> getGroupFeed(
            @PathVariable UUID groupId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal User user) {

        try {
            Pageable pageable = PageRequest.of(page, size);
            Page<Post> posts = postService.getGroupFeed(groupId, pageable);
            Page<PostResponse> responses = postResponseMapper.mapPage(posts, resolveUserId(user));

            return ResponseEntity.ok(responses);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/feed/trending")
    public ResponseEntity<Page<PostResponse>> getTrendingFeed(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal User user) {

        Pageable pageable = PageRequest.of(page, size);
        UUID viewerId = resolveUserId(user);
        Page<Post> posts = feedService.getFeed(viewerId, FeedService.FeedType.TRENDING, pageable);
        Page<PostResponse> responses = postResponseMapper.mapPage(posts, viewerId);

        return ResponseEntity.ok(responses);
    }

    @GetMapping("/feed/category/{category}")
    public ResponseEntity<Page<PostResponse>> getPostsByCategory(
            @PathVariable String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal User user) {

        Pageable pageable = PageRequest.of(page, size);
        Page<Post> posts = feedService.getPostsByCategory(category, pageable);
        Page<PostResponse> responses = postResponseMapper.mapPage(posts, resolveUserId(user));

        return ResponseEntity.ok(responses);
    }

    @GetMapping("/feed/type/{postType}")
    public ResponseEntity<Page<PostResponse>> getPostsByType(
            @PathVariable String postType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal User user) {

        try {
            Post.PostType type = Post.PostType.valueOf(postType.toUpperCase());
            Pageable pageable = PageRequest.of(page, size);
            UUID currentUserId = resolveUserId(user);
            // Pass currentUserId so user can see their own anonymous posts
            Page<Post> posts = feedService.getPostsByType(type, currentUserId, pageable);
            Page<PostResponse> responses = postResponseMapper.mapPage(posts, currentUserId);

            return ResponseEntity.ok(responses);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/search")
    public ResponseEntity<Page<PostResponse>> searchPosts(
            @RequestParam String query,
            @RequestParam(required = false) String postType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal User user) {

        if (query == null || query.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        UUID currentUserId = resolveUserId(user);
        log.info("🔍 Searching posts for query: '{}', postType: '{}', page: {}, size: {}, user: {}", query, postType, page, size, currentUserId);
        Pageable pageable = PageRequest.of(page, size);
        
        Post.PostType type = null;
        if (postType != null && !postType.trim().isEmpty()) {
            try {
                type = Post.PostType.valueOf(postType.toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("Invalid postType: {}", postType);
            }
        }
        
        // Pass currentUserId so user can see their own anonymous posts in search results
        Page<Post> posts = feedService.searchPosts(query, type, currentUserId, pageable);
        log.info("📝 Found {} posts (total: {}) for query: '{}'", posts.getContent().size(), posts.getTotalElements(), query);
        Page<PostResponse> responses = postResponseMapper.mapPage(posts, currentUserId);

        return ResponseEntity.ok(responses);
    }

    @GetMapping("/bookmarks")
    public ResponseEntity<Page<PostResponse>> getBookmarkedPosts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal User user) {

        UUID viewerId = resolveUserId(user);
        if (viewerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Pageable pageable = PageRequest.of(page, size);
        Page<Post> bookmarkedPosts = postInteractionService.getUserBookmarkedPosts(viewerId, pageable);
        Page<PostResponse> responses = postResponseMapper.mapPage(bookmarkedPosts, viewerId);

        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{postId}/thread")
    public ResponseEntity<List<PostResponse>> getPostThread(
            @PathVariable UUID postId,
            @AuthenticationPrincipal User user) {
        List<Post> thread = feedService.getPostThread(postId);
        List<PostResponse> responses = postResponseMapper.mapList(thread, resolveUserId(user));

        return ResponseEntity.ok(responses);
    }

    private UUID resolveUserId(User securityUser) {
        if (securityUser == null) {
            return null;
        }

        return userRepository.findByEmail(securityUser.getUsername())
            .map(com.churchapp.entity.User::getId)
            .orElse(null);
    }

    // ========== INTERACTION OPERATIONS ==========

    @PostMapping("/{postId}/like")
    public ResponseEntity<Void> likePost(
            @PathVariable UUID postId,
            @AuthenticationPrincipal User user) {

        try {
            postInteractionService.likePost(user.getUsername(), postId);
            notificationService.notifyPostLike(postId, UUID.randomUUID()); // Placeholder user ID
            return ResponseEntity.ok().build();

        } catch (Exception e) {
            log.error("Error liking post {}: {}", postId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/{postId}/like")
    public ResponseEntity<Void> unlikePost(
            @PathVariable UUID postId,
            @AuthenticationPrincipal User user) {

        try {
            postInteractionService.unlikePost(user.getUsername(), postId);
            return ResponseEntity.ok().build();

        } catch (Exception e) {
            log.error("Error unliking post {}: {}", postId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/{postId}/comments")
    public ResponseEntity<CommentResponse> addComment(
            @PathVariable UUID postId,
            @RequestBody CreateCommentRequest request,
            @AuthenticationPrincipal User user) {

        try {
            var comment = postInteractionService.addComment(
                user.getUsername(),
                postId,
                request.getContent(),
                request.getMediaUrls(),
                request.getMediaTypes(),
                request.getParentCommentId(),
                request.isAnonymous()
            );

            CommentResponse response = CommentResponse.fromEntity(comment);
            // Resolve optimized URLs if available
            if (response.getMediaUrls() != null && !response.getMediaUrls().isEmpty()) {
                response.setMediaUrls(mediaUrlService.getBestUrls(response.getMediaUrls()));
            }

            // Send notification to post author (FIXED: use actual user ID)
            UUID userId = resolveUserId(user);
            if (userId != null) {
                notificationService.notifyPostComment(postId, userId, request.getContent());
            }

            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{postId}/comments")
    public ResponseEntity<Page<CommentResponse>> getPostComments(
            @AuthenticationPrincipal User user,
            @PathVariable UUID postId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size);
        
        // Get viewer's user ID to filter blocked users
        UUID viewerUserId = null;
        if (user != null) {
            try {
                com.churchapp.entity.User viewer = userRepository.findByEmail(user.getUsername()).orElse(null);
                if (viewer != null) {
                    viewerUserId = viewer.getId();
                }
            } catch (Exception e) {
                // If we can't get viewer ID, continue without filtering
            }
        }
        
        Page<PostComment> comments = postInteractionService.getPostComments(postId, viewerUserId, pageable);
        Page<CommentResponse> responses = comments.map(CommentResponse::fromEntity);

        return ResponseEntity.ok(responses);
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable UUID commentId,
            @AuthenticationPrincipal User user) {

        try {
            postInteractionService.deleteComment(user.getUsername(), commentId);
            return ResponseEntity.noContent().build();

        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ========== COMMENT READ STATUS ENDPOINTS (for inline "new comments" indicators) ==========

    /**
     * Get count of new comments on a post since user last viewed it
     * Used for inline "3 new comments" badges on post cards
     */
    @GetMapping("/{postId}/new-comments-count")
    public ResponseEntity<Map<String, Integer>> getNewCommentsCount(
            @PathVariable UUID postId,
            @AuthenticationPrincipal User user) {

        UUID userId = resolveUserId(user);
        if (userId == null) {
            return ResponseEntity.ok(Map.of("newCount", 0));
        }

        try {
            int newCount = postCommentReadStatusService.getNewCommentCount(userId, postId);
            return ResponseEntity.ok(Map.of("newCount", newCount));
        } catch (Exception e) {
            log.error("Error getting new comment count for post {}: {}", postId, e.getMessage());
            return ResponseEntity.ok(Map.of("newCount", 0));
        }
    }

    /**
     * Mark all comments on a post as read
     * Called when user opens the post's comment thread
     */
    @PostMapping("/{postId}/mark-comments-read")
    public ResponseEntity<Void> markCommentsAsRead(
            @PathVariable UUID postId,
            @AuthenticationPrincipal User user) {

        UUID userId = resolveUserId(user);
        if (userId == null) {
            return ResponseEntity.badRequest().build();
        }

        try {
            postCommentReadStatusService.markPostAsRead(userId, postId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Error marking comments as read for post {}: {}", postId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Mark comments tab as viewed - updates the lastCommentsTabViewedAt timestamp
     * Called when user clicks on "Comments" tab in their profile
     * This clears the "New" badge
     */
    @PostMapping("/user/{userId}/mark-comments-tab-viewed")
    public ResponseEntity<Void> markCommentsTabViewed(
            @PathVariable UUID userId,
            @AuthenticationPrincipal User user) {

        // Only allow users to mark their own tab as viewed
        UUID viewerUserId = resolveUserId(user);
        if (viewerUserId == null || !viewerUserId.equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        try {
            postInteractionService.markCommentsTabViewed(userId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Error marking comments tab viewed for user {}: {}", userId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get new comment counts for multiple posts (batch operation)
     * Used when loading feed to efficiently get counts for all posts at once
     */
    @PostMapping("/batch/new-comments-count")
    public ResponseEntity<Map<String, Integer>> getNewCommentsCountBatch(
            @RequestBody List<UUID> postIds,
            @AuthenticationPrincipal User user) {

        UUID userId = resolveUserId(user);
        if (userId == null) {
            return ResponseEntity.ok(Map.of());
        }

        try {
            Map<String, Integer> counts = postCommentReadStatusService.getNewCommentCounts(userId, postIds);
            return ResponseEntity.ok(counts);
        } catch (Exception e) {
            log.error("Error getting batch comment counts: {}", e.getMessage());
            return ResponseEntity.ok(Map.of());
        }
    }

    // ========== POST SHARING ==========

    @PostMapping("/{postId}/share")
    public ResponseEntity<Void> sharePost(
            @PathVariable UUID postId,
            @RequestBody SharePostRequest request,
            @AuthenticationPrincipal User user) {

        try {
            postInteractionService.sharePost(user.getUsername(), postId,
                request.getShareType(), request.getContent());
            notificationService.notifyPostShare(postId, UUID.randomUUID());
            return ResponseEntity.ok().build();

        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/user/{userId}/share-stats")
    public ResponseEntity<Map<String, Long>> getUserShareStats(@PathVariable UUID userId) {
        long sharesReceived = postInteractionService.getSharesReceivedByUser(userId);
        return ResponseEntity.ok(Map.of("sharesReceived", sharesReceived));
    }

    @PostMapping("/{postId}/bookmark")
    public ResponseEntity<Void> bookmarkPost(
            @PathVariable UUID postId,
            @AuthenticationPrincipal User user) {

        try {
            postInteractionService.bookmarkPost(user.getUsername(), postId);
            return ResponseEntity.ok().build();

        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/{postId}/bookmark")
    public ResponseEntity<Void> unbookmarkPost(
            @PathVariable UUID postId,
            @AuthenticationPrincipal User user) {

        try {
            postInteractionService.unbookmarkPost(user.getUsername(), postId);
            return ResponseEntity.ok().build();

        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ========== MEDIA UPLOAD ==========

    /**
     * Generate presigned URL for direct S3 upload (new approach - bypasses Nginx)
     * POST /api/posts/generate-upload-url
     */
    @PostMapping("/generate-upload-url")
    public ResponseEntity<?> generatePresignedUploadUrl(
            @RequestBody PresignedUploadRequest request,
            @AuthenticationPrincipal User user) {
        
        try {
            log.info("Generating presigned URL for user: {}, file: {}, size: {}", 
                    user.getUsername(), request.getFileName(), request.getFileSize());
            
            // Generate presigned URL (validation happens inside)
            PresignedUploadResponse response = fileUploadService.generatePresignedUploadUrl(
                    request.getFileName(),
                    request.getContentType(),
                    request.getFileSize(),
                    request.getFolder()
            );
            
            return ResponseEntity.ok(response);
            
        } catch (IllegalArgumentException e) {
            log.warn("Invalid upload request from user {}: {}", user.getUsername(), e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Error generating presigned URL for user: {}", user.getUsername(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to generate upload URL"));
        }
    }
    
    /**
     * Confirm upload completion after direct S3 upload
     * POST /api/posts/confirm-upload
     */
    @PostMapping("/confirm-upload")
    public ResponseEntity<?> confirmUpload(
            @RequestBody UploadCompletionRequest request,
            @AuthenticationPrincipal User user) {
        
        try {
            log.info("Confirming upload completion for user: {}, key: {}", 
                    user.getUsername(), request.getS3Key());
            
            // Extract folder from S3 key (format: "folder/originals/filename")
            // This ensures we use the correct folder (profile-pictures, banners, posts, etc.)
            String folder = extractFolderFromS3Key(request.getS3Key());
            log.info("Extracted folder '{}' from S3 key: {}", folder, request.getS3Key());
            
            // Handle upload completion (verify, create MediaFile record, start processing)
            String fileUrl = fileUploadService.handleUploadCompletion(
                    request.getS3Key(),
                    request.getFileName(),
                    request.getContentType(),
                    request.getFileSize(),
                    folder
            );
            
            return ResponseEntity.ok(Map.of("fileUrl", fileUrl, "success", true));
            
        } catch (Exception e) {
            log.error("Error confirming upload for user: {}", user.getUsername(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to confirm upload", "success", false));
        }
    }
    
    /**
     * Extract folder name from S3 key
     * S3 key format: "folder/originals/filename" or "folder/optimized/filename"
     * Returns the first part (folder name)
     */
    private String extractFolderFromS3Key(String s3Key) {
        if (s3Key == null || s3Key.isEmpty()) {
            log.warn("Empty S3 key provided, defaulting to 'posts'");
            return "posts";
        }
        
        // S3 key format: "folder/originals/filename" or "folder/optimized/filename"
        int firstSlash = s3Key.indexOf('/');
        if (firstSlash > 0) {
            return s3Key.substring(0, firstSlash);
        }
        
        // If no slash found, default to posts (shouldn't happen in normal operation)
        log.warn("Could not extract folder from S3 key '{}', defaulting to 'posts'", s3Key);
        return "posts";
    }

    /**
     * Legacy endpoint - upload media through backend (kept for backward compatibility)
     * POST /api/posts/upload-media
     * @deprecated Use generate-upload-url + confirm-upload instead
     */
    @PostMapping("/upload-media")
    @Deprecated
    public ResponseEntity<List<String>> uploadMedia(
            @RequestParam("files") MultipartFile[] files,
            @AuthenticationPrincipal User user) {

        try {
            log.info("Uploading {} media files for user: {}", files.length, user.getUsername());
            
            // Validate input
            if (files == null || files.length == 0) {
                log.warn("No files provided for upload");
                return ResponseEntity.badRequest().build();
            }
            
            // Limit number of files (max 4 as per frontend)
            if (files.length > 4) {
                log.warn("Too many files provided: {}, max allowed: 4", files.length);
                return ResponseEntity.badRequest().build();
            }
            
            List<String> mediaUrls = new ArrayList<>();
            
            // Upload each file to S3
            for (MultipartFile file : files) {
                if (!file.isEmpty()) {
                    try {
                        // Upload to S3 in the "posts" folder
                        String mediaUrl = fileUploadService.uploadFile(file, "posts");
                        mediaUrls.add(mediaUrl);
                        log.info("Successfully uploaded file: {} -> {}", file.getOriginalFilename(), mediaUrl);
                    } catch (Exception e) {
                        log.error("Failed to upload file: {}", file.getOriginalFilename(), e);
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                .build();
                    }
                }
            }
            
            log.info("Successfully uploaded {} media files", mediaUrls.size());
            return ResponseEntity.ok(mediaUrls);
            
        } catch (Exception e) {
            log.error("Error uploading media files for user: {}", user.getUsername(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ========== ANALYTICS ==========

    /**
     * Get post engagement stats
     * GET /api/posts/{postId}/analytics
     */
    @GetMapping("/{postId}/analytics")
    public ResponseEntity<Map<String, Object>> getPostAnalytics(
            @AuthenticationPrincipal User user,
            @PathVariable UUID postId) {
        try {
            // Verify user owns the post or is admin
            Optional<Post> postOpt = postService.getPost(postId);
            if (postOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            
            Post post = postOpt.get();
            UUID userId = null;
            if (user != null) {
                com.churchapp.entity.User currentUser = userRepository.findByEmail(user.getUsername()).orElse(null);
                if (currentUser != null) {
                    userId = currentUser.getId();
                }
            }
            
            // Only post owner or admin can view analytics
            if (userId == null || (!post.getUser().getId().equals(userId) && 
                !(user != null && (user.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")))))) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            
            Map<String, Object> stats = postAnalyticsService.getPostEngagementStats(postId);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            log.error("Error fetching post analytics: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Record a post view (called when post is displayed)
     * POST /api/posts/{postId}/view
     */
    @PostMapping("/{postId}/view")
    public ResponseEntity<Map<String, String>> recordPostView(
            @AuthenticationPrincipal User user,
            @PathVariable UUID postId) {
        try {
            UUID viewerId = null;
            if (user != null) {
                com.churchapp.entity.User viewer = userRepository.findByEmail(user.getUsername()).orElse(null);
                if (viewer != null) {
                    viewerId = viewer.getId();
                }
            }
            
            postAnalyticsService.recordPostView(postId, viewerId);
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "Post view recorded");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error recording post view: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to record post view");
            return ResponseEntity.badRequest().body(error);
        }
    }

    // ========== STATISTICS ==========

    @GetMapping("/stats/feed")
    public ResponseEntity<FeedService.FeedStats> getFeedStats() {
        FeedService.FeedStats stats = feedService.getFeedStats();
        return ResponseEntity.ok(stats);
    }

    // ========== BATCH IMPRESSIONS (Scalable view counting) ==========

    /**
     * Record multiple post impressions in a single batch request.
     * Designed for high-volume, low-latency impression tracking.
     * No deduplication - every impression counts (like early Twitter).
     *
     * POST /api/posts/impressions
     * Body: { "postIds": ["uuid1", "uuid2", ...] }
     */
    @PostMapping("/impressions")
    public ResponseEntity<Void> recordImpressions(@RequestBody Map<String, List<String>> request) {
        log.info("👁️ [Impressions] Received batch impression request: {}", request);
        try {
            List<String> postIdStrings = request.get("postIds");
            if (postIdStrings == null || postIdStrings.isEmpty()) {
                log.info("👁️ [Impressions] Empty postIds list, returning 202");
                return ResponseEntity.accepted().build(); // Nothing to do, but don't error
            }

            log.info("👁️ [Impressions] Processing {} post IDs", postIdStrings.size());

            // Convert strings to UUIDs, filtering out invalid ones
            List<UUID> postIds = new ArrayList<>();
            for (String idStr : postIdStrings) {
                try {
                    postIds.add(UUID.fromString(idStr));
                } catch (IllegalArgumentException e) {
                    log.warn("👁️ [Impressions] Invalid UUID in impressions batch: {}", idStr);
                }
            }

            if (!postIds.isEmpty()) {
                // Single batch UPDATE query - highly efficient
                log.info("👁️ [Impressions] Incrementing views_count for {} posts: {}", postIds.size(), postIds);
                postRepository.incrementViewsCounts(postIds);
                log.info("👁️ [Impressions] Successfully recorded {} impressions", postIds.size());
            }

            // Return 202 Accepted immediately (fire-and-forget semantics)
            return ResponseEntity.accepted().build();
        } catch (Exception e) {
            log.error("👁️ [Impressions] Error recording batch impressions: {}", e.getMessage(), e);
            // Still return 202 - impression tracking failures shouldn't affect UX
            return ResponseEntity.accepted().build();
        }
    }
}
