package com.churchapp.repository;

import com.churchapp.entity.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface PostRepository extends JpaRepository<Post, UUID> {

    // Basic queries
    Page<Post> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);
    List<Post> findByParentPostIdOrderByCreatedAtAsc(UUID parentPostId);
    List<Post> findByQuotedPostIdOrderByCreatedAtDesc(UUID quotedPostId);

    // Posts by type and category
    Page<Post> findByPostTypeOrderByCreatedAtDesc(Post.PostType postType, Pageable pageable);
    Page<Post> findByCategoryOrderByCreatedAtDesc(String category, Pageable pageable);
    Page<Post> findByPostTypeAndCategoryOrderByCreatedAtDesc(Post.PostType postType, String category, Pageable pageable);

    // Anonymous posts
    Page<Post> findByIsAnonymousFalseOrderByCreatedAtDesc(Pageable pageable);
    Page<Post> findByUserIdAndIsAnonymousFalseOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    // Feed queries
    @Query("SELECT p FROM Post p WHERE p.isReply = false AND p.isAnonymous = false ORDER BY p.createdAt DESC")
    Page<Post> findMainPostsForFeed(Pageable pageable);

    @Query("SELECT p FROM Post p WHERE p.user.id IN :followingIds AND p.isReply = false AND p.isAnonymous = false ORDER BY p.createdAt DESC")
    Page<Post> findPostsByFollowingUsers(@Param("followingIds") List<UUID> followingIds, Pageable pageable);

    // Trending posts (posts with high engagement in last 7 days)
    @Query("SELECT p FROM Post p WHERE p.createdAt >= :since AND p.isAnonymous = false " +
           "ORDER BY (p.likesCount + p.commentsCount + p.sharesCount) DESC")
    Page<Post> findTrendingPosts(@Param("since") LocalDateTime since, Pageable pageable);

    // Search posts by content, author name, category, location, and hashtags
    // Optionally filter by post type
    @Query("SELECT p FROM Post p " +
           "WHERE p.isAnonymous = false " +
           "AND (:postType IS NULL OR p.postType = :postType) " +
           "AND (" +
           "     LOWER(p.content) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
           "     OR LOWER(p.user.name) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
           "     OR (p.category IS NOT NULL AND LOWER(p.category) LIKE LOWER(CONCAT('%', :searchTerm, '%'))) " +
           "     OR (p.location IS NOT NULL AND LOWER(p.location) LIKE LOWER(CONCAT('%', :searchTerm, '%')))" +
           ") " +
           "ORDER BY p.createdAt DESC")
    Page<Post> findByContentContaining(@Param("searchTerm") String searchTerm, @Param("postType") Post.PostType postType, Pageable pageable);
    
    // Separate query for hashtag search
    // Optionally filter by post type
    @Query("SELECT DISTINCT p FROM Post p " +
           "JOIN PostHashtag ph ON ph.id.postId = p.id " +
           "JOIN Hashtag h ON h.id = ph.id.hashtagId " +
           "WHERE p.isAnonymous = false " +
           "AND (:postType IS NULL OR p.postType = :postType) " +
           "AND LOWER(h.tag) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
           "ORDER BY p.createdAt DESC")
    Page<Post> findByHashtagContaining(@Param("searchTerm") String searchTerm, @Param("postType") Post.PostType postType, Pageable pageable);

    // Posts by user with replies included
    @Query("SELECT p FROM Post p WHERE p.user.id = :userId ORDER BY p.createdAt DESC")
    Page<Post> findAllByUserIdIncludingReplies(@Param("userId") UUID userId, Pageable pageable);

    // Thread queries
    @Query("SELECT p FROM Post p WHERE p.id = :postId OR p.parentPost.id = :postId ORDER BY p.createdAt ASC")
    List<Post> findThreadByPostId(@Param("postId") UUID postId);

    // Statistics queries
    @Query("SELECT COUNT(p) FROM Post p WHERE p.createdAt >= :since")
    long countByCreatedAtAfter(@Param("since") LocalDateTime since);

    @Query("SELECT COUNT(p) FROM Post p WHERE p.user.id = :userId")
    long countByUserId(@Param("userId") UUID userId);

    @Query("SELECT COUNT(p) FROM Post p WHERE p.user.id = :userId AND p.createdAt >= :since")
    long countByUserIdSince(@Param("userId") UUID userId, @Param("since") LocalDateTime since);

    // Recent posts for specific post types (for dashboard integration)
    @Query("SELECT p FROM Post p WHERE p.postType = :postType AND p.isAnonymous = false ORDER BY p.createdAt DESC")
    Page<Post> findRecentPostsByType(@Param("postType") Post.PostType postType, Pageable pageable);

    // Posts with media
    @Query("SELECT p FROM Post p WHERE p.mediaUrls IS NOT EMPTY AND p.isAnonymous = false ORDER BY p.createdAt DESC")
    Page<Post> findPostsWithMedia(Pageable pageable);

    // Posts by location
    Page<Post> findByLocationOrderByCreatedAtDesc(String location, Pageable pageable);

    // Bulk operations for cleanup
    void deleteByUserId(UUID userId);
    void deleteByCreatedAtBefore(LocalDateTime cutoffDate);
}
