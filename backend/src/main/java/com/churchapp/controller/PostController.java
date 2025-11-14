package com.churchapp.controller;

import com.churchapp.dto.*;
import com.churchapp.entity.Post;
import com.churchapp.entity.PostComment;
import com.churchapp.repository.UserRepository;
import com.churchapp.service.FeedService;
import com.churchapp.service.FileUploadService;
import com.churchapp.service.NotificationService;
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
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/posts")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8100", "capacitor://localhost"})
public class PostController {

    private final PostService postService;
    private final PostInteractionService postInteractionService;
    private final FeedService feedService;
    private final NotificationService notificationService;
    private final FileUploadService fileUploadService;
    private final PostResponseMapper postResponseMapper;
    private final UserRepository userRepository;

    // ========== POST CRUD OPERATIONS ==========

    @PostMapping
    public ResponseEntity<PostResponse> createPost(
            @RequestBody CreatePostRequest request,
            @AuthenticationPrincipal User user) {

        try {
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
                request.getGroupId()           // Multi-tenant: optional group context
            );

            PostResponse response = postResponseMapper.mapPost(post, resolveUserId(user));
            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
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
        Page<Post> posts = postService.getUserPosts(userId, pageable);
        Page<PostResponse> responses = postResponseMapper.mapPage(posts, resolveUserId(user));

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

            // Use multi-tenant feed for default/community feed
            if ("trending".equalsIgnoreCase(feedType)) {
                posts = postService.getTrendingFeed(viewerId, pageable);
            } else {
                // Default to multi-tenant chronological feed
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
            Page<Post> posts = feedService.getPostsByType(type, pageable);
            Page<PostResponse> responses = postResponseMapper.mapPage(posts, resolveUserId(user));

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

        log.info("🔍 Searching posts for query: '{}', postType: '{}', page: {}, size: {}", query, postType, page, size);
        Pageable pageable = PageRequest.of(page, size);
        
        Post.PostType type = null;
        if (postType != null && !postType.trim().isEmpty()) {
            try {
                type = Post.PostType.valueOf(postType.toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("Invalid postType: {}", postType);
            }
        }
        
        Page<Post> posts = feedService.searchPosts(query, type, pageable);
        log.info("📝 Found {} posts (total: {}) for query: '{}'", posts.getContent().size(), posts.getTotalElements(), query);
        Page<PostResponse> responses = postResponseMapper.mapPage(posts, resolveUserId(user));

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

        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        } catch (Exception e) {
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

        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        } catch (Exception e) {
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
            notificationService.notifyPostComment(postId, UUID.randomUUID(), request.getContent());

            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{postId}/comments")
    public ResponseEntity<Page<CommentResponse>> getPostComments(
            @PathVariable UUID postId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size);
        Page<PostComment> comments = postInteractionService.getPostComments(postId, pageable);
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

    @PostMapping("/upload-media")
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

    // ========== STATISTICS ==========

    @GetMapping("/stats/feed")
    public ResponseEntity<FeedService.FeedStats> getFeedStats() {
        FeedService.FeedStats stats = feedService.getFeedStats();
        return ResponseEntity.ok(stats);
    }
}
