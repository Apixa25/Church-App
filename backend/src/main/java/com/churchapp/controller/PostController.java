package com.churchapp.controller;

import com.churchapp.dto.*;
import com.churchapp.entity.Post;
import com.churchapp.service.FeedService;
import com.churchapp.service.NotificationService;
import com.churchapp.service.PostInteractionService;
import com.churchapp.service.PostService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8100", "capacitor://localhost"})
public class PostController {

    private final PostService postService;
    private final PostInteractionService postInteractionService;
    private final FeedService feedService;
    private final NotificationService notificationService;

    // ========== POST CRUD OPERATIONS ==========

    @PostMapping
    public ResponseEntity<PostResponse> createPost(
            @RequestBody CreatePostRequest request,
            @AuthenticationPrincipal User user) {

        try {
            Post post = postService.createPost(
                user.getUsername(),
                request.getContent(),
                request.getMediaUrls(),
                request.getMediaTypes(),
                request.getPostType(),
                request.getCategory(),
                request.getLocation(),
                request.isAnonymous()
            );

            PostResponse response = PostResponse.fromEntity(post);
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

            PostResponse response = PostResponse.fromEntity(reply);
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

            PostResponse response = PostResponse.fromEntity(quote);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{postId}")
    public ResponseEntity<PostResponse> getPost(@PathVariable UUID postId) {
        Optional<Post> post = postService.getPost(postId);

        if (post.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        PostResponse response = PostResponse.fromEntity(post.get());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<Page<PostResponse>> getUserPosts(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size);
        Page<Post> posts = postService.getUserPosts(userId, pageable);
        Page<PostResponse> responses = posts.map(PostResponse::fromEntity);

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

    @GetMapping("/feed")
    public ResponseEntity<Page<PostResponse>> getFeed(
            @RequestParam(defaultValue = "chronological") String feedType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal User user) {

        try {
            FeedService.FeedType type = FeedService.FeedType.valueOf(feedType.toUpperCase());
            Pageable pageable = PageRequest.of(page, size);

            // Get user ID from email (simplified - in real app you'd have user service)
            UUID userId = UUID.randomUUID(); // Placeholder - implement proper user lookup

            Page<Post> posts = feedService.getFeed(userId, type, pageable);
            Page<PostResponse> responses = posts.map(PostResponse::fromEntity);

            return ResponseEntity.ok(responses);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/feed/trending")
    public ResponseEntity<Page<PostResponse>> getTrendingFeed(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size);
        Page<Post> posts = feedService.getFeed(null, FeedService.FeedType.TRENDING, pageable);
        Page<PostResponse> responses = posts.map(PostResponse::fromEntity);

        return ResponseEntity.ok(responses);
    }

    @GetMapping("/feed/category/{category}")
    public ResponseEntity<Page<PostResponse>> getPostsByCategory(
            @PathVariable String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size);
        Page<Post> posts = feedService.getPostsByCategory(category, pageable);
        Page<PostResponse> responses = posts.map(PostResponse::fromEntity);

        return ResponseEntity.ok(responses);
    }

    @GetMapping("/feed/type/{postType}")
    public ResponseEntity<Page<PostResponse>> getPostsByType(
            @PathVariable String postType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        try {
            Post.PostType type = Post.PostType.valueOf(postType.toUpperCase());
            Pageable pageable = PageRequest.of(page, size);
            Page<Post> posts = feedService.getPostsByType(type, pageable);
            Page<PostResponse> responses = posts.map(PostResponse::fromEntity);

            return ResponseEntity.ok(responses);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/search")
    public ResponseEntity<Page<PostResponse>> searchPosts(
            @RequestParam String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        if (query == null || query.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        Pageable pageable = PageRequest.of(page, size);
        Page<Post> posts = feedService.searchPosts(query, pageable);
        Page<PostResponse> responses = posts.map(PostResponse::fromEntity);

        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{postId}/thread")
    public ResponseEntity<List<PostResponse>> getPostThread(@PathVariable UUID postId) {
        List<Post> thread = feedService.getPostThread(postId);
        List<PostResponse> responses = thread.stream()
            .map(PostResponse::fromEntity)
            .collect(java.util.stream.Collectors.toList());

        return ResponseEntity.ok(responses);
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

        // This would integrate with AWS S3 service
        // For now, return placeholder response

        List<String> mediaUrls = List.of("https://example.com/media1.jpg");
        return ResponseEntity.ok(mediaUrls);
    }

    // ========== STATISTICS ==========

    @GetMapping("/stats/feed")
    public ResponseEntity<FeedService.FeedStats> getFeedStats() {
        FeedService.FeedStats stats = feedService.getFeedStats();
        return ResponseEntity.ok(stats);
    }
}
