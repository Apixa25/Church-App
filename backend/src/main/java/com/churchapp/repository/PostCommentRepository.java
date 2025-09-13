package com.churchapp.repository;

import com.churchapp.entity.PostComment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface PostCommentRepository extends JpaRepository<PostComment, UUID> {

    // Find comments by post
    Page<PostComment> findByPostIdOrderByCreatedAtAsc(UUID postId, Pageable pageable);
    List<PostComment> findByPostIdOrderByCreatedAtAsc(UUID postId);

    // Find comments by user
    Page<PostComment> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    // Find replies to a comment
    List<PostComment> findByParentCommentIdOrderByCreatedAtAsc(UUID parentCommentId);

    // Find top-level comments (no parent)
    Page<PostComment> findByPostIdAndParentCommentIdIsNullOrderByCreatedAtAsc(UUID postId, Pageable pageable);

    // Count comments for a post
    long countByPostId(UUID postId);

    // Count comments by user
    long countByUserId(UUID userId);

    // Count replies to a comment
    long countByParentCommentId(UUID parentCommentId);

    // Find comments with media
    @Query("SELECT pc FROM PostComment pc WHERE pc.mediaUrls IS NOT EMPTY ORDER BY pc.createdAt DESC")
    Page<PostComment> findCommentsWithMedia(Pageable pageable);

    // Search comments by content
    @Query("SELECT pc FROM PostComment pc WHERE LOWER(pc.content) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
           "ORDER BY pc.createdAt DESC")
    Page<PostComment> findByContentContaining(@Param("searchTerm") String searchTerm, Pageable pageable);

    // Recent comments across all posts
    @Query("SELECT pc FROM PostComment pc ORDER BY pc.createdAt DESC")
    Page<PostComment> findRecentComments(Pageable pageable);

    // Comments by post type (join with post)
    @Query("SELECT pc FROM PostComment pc JOIN pc.post p WHERE p.postType = :postType ORDER BY pc.createdAt DESC")
    Page<PostComment> findCommentsByPostType(@Param("postType") Post.PostType postType, Pageable pageable);

    // Anonymous comments
    Page<PostComment> findByIsAnonymousTrueOrderByCreatedAtDesc(Pageable pageable);
    long countByIsAnonymousTrue();

    // Comments since date
    @Query("SELECT pc FROM PostComment pc WHERE pc.createdAt >= :since ORDER BY pc.createdAt DESC")
    Page<PostComment> findCommentsSince(@Param("since") LocalDateTime since, Pageable pageable);

    // Delete comments by post
    @Modifying
    @Query("DELETE FROM PostComment pc WHERE pc.post.id = :postId")
    void deleteByPostId(@Param("postId") UUID postId);

    // Delete comments by user
    @Modifying
    @Query("DELETE FROM PostComment pc WHERE pc.user.id = :userId")
    void deleteByUserId(@Param("userId") UUID userId);

    // Delete replies to a comment
    @Modifying
    @Query("DELETE FROM PostComment pc WHERE pc.parentComment.id = :parentCommentId")
    void deleteByParentCommentId(@Param("parentCommentId") UUID parentCommentId);

    // Get comment thread (comment and all its replies)
    @Query("SELECT pc FROM PostComment pc WHERE pc.id = :commentId OR pc.parentComment.id = :commentId " +
           "ORDER BY pc.createdAt ASC")
    List<PostComment> findCommentThread(@Param("commentId") UUID commentId);

    // Bulk operations
    @Modifying
    @Query("DELETE FROM PostComment pc WHERE pc.post.id IN :postIds")
    void deleteByPostIds(@Param("postIds") List<UUID> postIds);

    @Modifying
    @Query("DELETE FROM PostComment pc WHERE pc.createdAt < :cutoffDate")
    void deleteByCreatedAtBefore(@Param("cutoffDate") LocalDateTime cutoffDate);
}
