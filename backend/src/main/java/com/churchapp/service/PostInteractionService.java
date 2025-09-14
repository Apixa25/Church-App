package com.churchapp.service;

import com.churchapp.entity.*;
import com.churchapp.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PostInteractionService {

    private final PostLikeRepository postLikeRepository;
    private final PostCommentRepository postCommentRepository;
    private final PostShareRepository postShareRepository;
    private final PostBookmarkRepository postBookmarkRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;

    // ========== LIKE OPERATIONS ==========

    @Transactional
    public void likePost(String userEmail, UUID postId) {
        User user = getUserByEmail(userEmail);
        Post post = getPostById(postId);

        validatePostAccess(post);

        if (postLikeRepository.existsById_PostIdAndId_UserId(postId, user.getId())) {
            throw new IllegalStateException("Post already liked by user");
        }

        PostLike.PostLikeId likeId = new PostLike.PostLikeId(postId, user.getId());
        PostLike like = new PostLike();
        like.setId(likeId);
        postLikeRepository.save(like);

        post.incrementLikesCount();
        postRepository.save(post);

        log.info("User {} liked post {}", userEmail, postId);
    }

    @Transactional
    public void unlikePost(String userEmail, UUID postId) {
        User user = getUserByEmail(userEmail);
        Post post = getPostById(postId);

        Optional<PostLike> like = postLikeRepository.findById_PostIdAndId_UserId(postId, user.getId());
        if (like.isEmpty()) {
            throw new IllegalStateException("Post not liked by user");
        }

        postLikeRepository.delete(like.get());
        post.decrementLikesCount();
        postRepository.save(post);

        log.info("User {} unliked post {}", userEmail, postId);
    }

    public boolean isPostLikedByUser(UUID postId, UUID userId) {
        return postLikeRepository.existsById_PostIdAndId_UserId(postId, userId);
    }

    public Page<PostLike> getPostLikes(UUID postId, Pageable pageable) {
        return postLikeRepository.findRecentLikesByPostId(postId, pageable);
    }

    public long getPostLikeCount(UUID postId) {
        return postLikeRepository.countById_PostId(postId);
    }

    // ========== COMMENT OPERATIONS ==========

    @Transactional
    public PostComment addComment(String userEmail, UUID postId, String content,
                                 List<String> mediaUrls, List<String> mediaTypes,
                                 UUID parentCommentId, boolean isAnonymous) {

        User user = getUserByEmail(userEmail);
        Post post = getPostById(postId);

        validatePostAccess(post);

        if (content == null || content.trim().isEmpty()) {
            throw new IllegalArgumentException("Comment content cannot be empty");
        }
        if (content.length() > 1000) {
            throw new IllegalArgumentException("Comment content cannot exceed 1000 characters");
        }

        PostComment comment = new PostComment();
        comment.setPost(post);
        comment.setUser(user);
        comment.setContent(content.trim());
        comment.setMediaUrls(mediaUrls != null ? mediaUrls : List.of());
        comment.setMediaTypes(mediaTypes != null ? mediaTypes : List.of());
        comment.setIsAnonymous(isAnonymous);

        if (parentCommentId != null) {
            PostComment parentComment = postCommentRepository.findById(parentCommentId)
                .orElseThrow(() -> new IllegalArgumentException("Parent comment not found"));
            comment.setParentComment(parentComment);
        }

        PostComment savedComment = postCommentRepository.save(comment);

        // Update comment count on post
        post.incrementCommentsCount();
        postRepository.save(post);

        log.info("User {} added comment {} to post {}", userEmail, savedComment.getId(), postId);
        return savedComment;
    }

    @Transactional
    public void deleteComment(String userEmail, UUID commentId) {
        User user = getUserByEmail(userEmail);
        PostComment comment = getCommentById(commentId);

        if (!comment.getUser().getId().equals(user.getId())) {
            throw new IllegalStateException("Can only delete own comments");
        }

        // Delete the comment and all its replies
        deleteCommentRecursively(comment);

        // Update comment count on post
        Post post = comment.getPost();
        post.decrementCommentsCount();
        postRepository.save(post);

        log.info("User {} deleted comment {}", userEmail, commentId);
    }

    private void deleteCommentRecursively(PostComment comment) {
        // Delete all replies first
        List<PostComment> replies = postCommentRepository.findByParentCommentIdOrderByCreatedAtAsc(comment.getId());
        for (PostComment reply : replies) {
            deleteCommentRecursively(reply);
        }

        // Delete the comment itself
        postCommentRepository.delete(comment);
    }

    @Transactional
    public void likeComment(String userEmail, UUID commentId) {
        User user = getUserByEmail(userEmail);
        PostComment comment = getCommentById(commentId);

        // Note: For simplicity, we're not tracking comment likes separately
        // In a full implementation, you'd have a CommentLike entity
        comment.incrementLikesCount();
        postCommentRepository.save(comment);

        log.info("User {} liked comment {}", userEmail, commentId);
    }

    public Page<PostComment> getPostComments(UUID postId, Pageable pageable) {
        return postCommentRepository.findByPostIdOrderByCreatedAtAsc(postId, pageable);
    }

    public List<PostComment> getCommentReplies(UUID commentId) {
        return postCommentRepository.findByParentCommentIdOrderByCreatedAtAsc(commentId);
    }

    public long getPostCommentCount(UUID postId) {
        return postCommentRepository.countByPostId(postId);
    }

    // ========== SHARE OPERATIONS ==========

    @Transactional
    public PostShare sharePost(String userEmail, UUID postId, PostShare.ShareType shareType, String content) {
        User user = getUserByEmail(userEmail);
        Post post = getPostById(postId);

        validatePostAccess(post);

        if (postShareRepository.existsByPostIdAndUserId(postId, user.getId())) {
            throw new IllegalStateException("Post already shared by user");
        }

        PostShare share = new PostShare();
        share.setPost(post);
        share.setUser(user);
        share.setShareType(shareType);
        share.setContent(content);

        PostShare savedShare = postShareRepository.save(share);

        post.incrementSharesCount();
        postRepository.save(post);

        log.info("User {} shared post {} with type {}", userEmail, postId, shareType);
        return savedShare;
    }

    @Transactional
    public void unsharePost(String userEmail, UUID postId) {
        User user = getUserByEmail(userEmail);
        Post post = getPostById(postId);

        Optional<PostShare> share = postShareRepository.findByPostIdAndUserId(postId, user.getId());
        if (share.isEmpty()) {
            throw new IllegalStateException("Post not shared by user");
        }

        postShareRepository.delete(share.get());
        post.decrementSharesCount();
        postRepository.save(post);

        log.info("User {} unshared post {}", userEmail, postId);
    }

    public Page<PostShare> getPostShares(UUID postId, Pageable pageable) {
        return postShareRepository.findByPostIdOrderByCreatedAtDesc(postId, pageable);
    }

    public long getPostShareCount(UUID postId) {
        return postShareRepository.countByPostId(postId);
    }

    // ========== BOOKMARK OPERATIONS ==========

    @Transactional
    public void bookmarkPost(String userEmail, UUID postId) {
        User user = getUserByEmail(userEmail);
        Post post = getPostById(postId);

        validatePostAccess(post);

        if (postBookmarkRepository.existsById_PostIdAndId_UserId(postId, user.getId())) {
            throw new IllegalStateException("Post already bookmarked by user");
        }

        PostBookmark.PostBookmarkId bookmarkId = new PostBookmark.PostBookmarkId(postId, user.getId());
        PostBookmark bookmark = new PostBookmark();
        bookmark.setId(bookmarkId);
        postBookmarkRepository.save(bookmark);

        post.incrementBookmarksCount();
        postRepository.save(post);

        log.info("User {} bookmarked post {}", userEmail, postId);
    }

    @Transactional
    public void unbookmarkPost(String userEmail, UUID postId) {
        User user = getUserByEmail(userEmail);
        Post post = getPostById(postId);

        Optional<PostBookmark> bookmark = postBookmarkRepository.findById_PostIdAndId_UserId(postId, user.getId());
        if (bookmark.isEmpty()) {
            throw new IllegalStateException("Post not bookmarked by user");
        }

        postBookmarkRepository.delete(bookmark.get());
        post.decrementBookmarksCount();
        postRepository.save(post);

        log.info("User {} unbookmarked post {}", userEmail, postId);
    }

    public boolean isPostBookmarkedByUser(UUID postId, UUID userId) {
        return postBookmarkRepository.existsById_PostIdAndId_UserId(postId, userId);
    }

    public Page<PostBookmark> getUserBookmarks(UUID userId, Pageable pageable) {
        return postBookmarkRepository.findById_UserIdOrderByCreatedAtDesc(userId, pageable);
    }

    public long getPostBookmarkCount(UUID postId) {
        return postBookmarkRepository.countById_PostId(postId);
    }

    // ========== HELPER METHODS ==========

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private Post getPostById(UUID postId) {
        return postRepository.findById(postId)
            .orElseThrow(() -> new IllegalArgumentException("Post not found"));
    }

    private PostComment getCommentById(UUID commentId) {
        return postCommentRepository.findById(commentId)
            .orElseThrow(() -> new IllegalArgumentException("Comment not found"));
    }

    private void validatePostAccess(Post post) {
        // Add any access control logic here
        // For example, check if post is from a private group, etc.
    }

    // ========== STATISTICS METHODS ==========

    public long getUserLikeCount(UUID userId) {
        return postLikeRepository.countById_UserId(userId);
    }

    public long getUserCommentCount(UUID userId) {
        return postCommentRepository.countByUserId(userId);
    }

    public long getUserShareCount(UUID userId) {
        return postShareRepository.countByUserId(userId);
    }

    public long getUserBookmarkCount(UUID userId) {
        return postBookmarkRepository.countById_UserId(userId);
    }
}
