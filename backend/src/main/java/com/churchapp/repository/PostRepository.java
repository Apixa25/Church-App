package com.churchapp.repository;

import com.churchapp.entity.Post;
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
    @Query("SELECT p FROM Post p WHERE p.isReply = false AND p.isAnonymous = false " +
           "AND (:blockedUserIds IS NULL OR p.user.id NOT IN :blockedUserIds) " +
           "ORDER BY p.createdAt DESC")
    Page<Post> findMainPostsForFeed(@Param("blockedUserIds") List<UUID> blockedUserIds, Pageable pageable);

    @Query("SELECT p FROM Post p WHERE p.user.id IN :followingIds AND p.isReply = false AND p.isAnonymous = false " +
           "AND (:blockedUserIds IS NULL OR p.user.id NOT IN :blockedUserIds) " +
           "ORDER BY p.createdAt DESC")
    Page<Post> findPostsByFollowingUsers(
        @Param("followingIds") List<UUID> followingIds,
        @Param("blockedUserIds") List<UUID> blockedUserIds,
        Pageable pageable
    );

    // Trending posts (posts with high engagement in last 7 days)
    // Excludes posts from blocked users
    @Query("SELECT p FROM Post p WHERE p.createdAt >= :since AND p.isAnonymous = false " +
           "AND (:blockedUserIds IS NULL OR p.user.id NOT IN :blockedUserIds) " +
           "ORDER BY (p.likesCount + p.commentsCount + p.sharesCount) DESC")
    Page<Post> findTrendingPosts(
        @Param("since") LocalDateTime since,
        @Param("blockedUserIds") List<UUID> blockedUserIds,
        Pageable pageable
    );

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

    @Query("SELECT COALESCE(SUM(p.sharesCount), 0) FROM Post p WHERE p.user.id = :userId")
    long sumSharesCountByUserId(@Param("userId") UUID userId);

    @Query("SELECT COUNT(p) FROM Post p WHERE p.user.id = :userId AND p.createdAt >= :since")
    long countByUserIdSince(@Param("userId") UUID userId, @Param("since") LocalDateTime since);

    // Recent posts for specific post types (for dashboard integration)
    @Query("SELECT p FROM Post p WHERE p.postType = :postType AND p.isAnonymous = false ORDER BY p.createdAt DESC")
    Page<Post> findRecentPostsByType(@Param("postType") Post.PostType postType, Pageable pageable);

    // Posts with media
    @Query("SELECT p FROM Post p WHERE p.mediaUrls IS NOT EMPTY AND p.isAnonymous = false ORDER BY p.createdAt DESC")
    Page<Post> findPostsWithMedia(Pageable pageable);

    // Posts with media by specific user
    @Query("SELECT p FROM Post p WHERE p.user.id = :userId AND p.mediaUrls IS NOT EMPTY AND p.isAnonymous = false ORDER BY p.createdAt DESC")
    Page<Post> findPostsWithMediaByUserId(@Param("userId") UUID userId, Pageable pageable);

    // Posts by location
    Page<Post> findByLocationOrderByCreatedAtDesc(String location, Pageable pageable);

    // Bulk operations for cleanup
    void deleteByUserId(UUID userId);
    void deleteByCreatedAtBefore(LocalDateTime cutoffDate);

    // ========================================================================
    // MULTI-TENANT ORGANIZATION/GROUP QUERIES
    // ========================================================================

    // Multi-tenant feed query - shows posts from:
    // 1. User's primary organizations (all visibility levels) - supports dual-primary system (churchPrimary + familyPrimary)
    // 2. User's secondary organizations (PUBLIC only)
    // 3. User's unmuted groups
    // 4. Followed users (when filter is ALL or EVERYTHING) - regardless of organization/group
    // Excludes posts from blocked users
    @Query("SELECT DISTINCT p FROM Post p WHERE " +
           "(" +
           "  (p.organization.id IN :primaryOrgIds) " +
           "  OR (p.organization.id IN :secondaryOrgIds AND p.visibility = 'PUBLIC') " +
           "  OR (p.group.id IN :groupIds)" +
           "  OR (:followingIds IS NOT NULL AND p.user.id IN :followingIds)" +
           ") " +
           "AND p.isReply = false " +
           "AND p.isAnonymous = false " +
           "AND (:blockedUserIds IS NULL OR p.user.id NOT IN :blockedUserIds) " +
           "ORDER BY p.createdAt DESC")
    Page<Post> findMultiTenantFeed(
        @Param("primaryOrgIds") List<UUID> primaryOrgIds,
        @Param("secondaryOrgIds") List<UUID> secondaryOrgIds,
        @Param("groupIds") List<UUID> groupIds,
        @Param("blockedUserIds") List<UUID> blockedUserIds,
        @Param("followingIds") List<UUID> followingIds,
        Pageable pageable
    );

    // Feed for users with NO primary organization (social-only users)
    // Includes posts from followed users when filter is ALL or EVERYTHING
    // Excludes posts from blocked users
    @Query("SELECT DISTINCT p FROM Post p WHERE " +
           "(p.group.id IN :groupIds OR p.organization.id = :globalOrgId " +
           " OR (:followingIds IS NOT NULL AND p.user.id IN :followingIds)) " +
           "AND p.isReply = false " +
           "AND p.isAnonymous = false " +
           "AND p.visibility = 'PUBLIC' " +
           "AND (:blockedUserIds IS NULL OR p.user.id NOT IN :blockedUserIds) " +
           "ORDER BY p.createdAt DESC")
    Page<Post> findGlobalUserFeed(
        @Param("groupIds") List<UUID> groupIds,
        @Param("globalOrgId") UUID globalOrgId,
        @Param("blockedUserIds") List<UUID> blockedUserIds,
        @Param("followingIds") List<UUID> followingIds,
        Pageable pageable
    );

    // Organization-scoped feed
    @Query("SELECT p FROM Post p WHERE " +
           "p.organization.id = :orgId " +
           "AND p.isReply = false " +
           "ORDER BY p.createdAt DESC")
    Page<Post> findByOrganizationId(@Param("orgId") UUID orgId, Pageable pageable);

    // Get all posts for an organization (for metrics calculation)
    @Query("SELECT p FROM Post p WHERE p.organization.id = :orgId")
    List<Post> findAllByOrganizationId(@Param("orgId") UUID orgId);

    // Group-scoped feed
    @Query("SELECT p FROM Post p WHERE " +
           "p.group.id = :groupId " +
           "AND p.isReply = false " +
           "ORDER BY p.createdAt DESC")
    Page<Post> findByGroupId(@Param("groupId") UUID groupId, Pageable pageable);

    // Count posts by organization
    @Query("SELECT COUNT(p) FROM Post p WHERE p.organization.id = :orgId")
    Long countByOrganizationId(@Param("orgId") UUID orgId);

    // Count posts by group
    @Query("SELECT COUNT(p) FROM Post p WHERE p.group.id = :groupId")
    Long countByGroupId(@Param("groupId") UUID groupId);

    // Trending posts within an organization
    // Excludes posts from blocked users
    @Query("SELECT p FROM Post p WHERE " +
           "p.organization.id = :orgId " +
           "AND p.createdAt >= :since " +
           "AND (:blockedUserIds IS NULL OR p.user.id NOT IN :blockedUserIds) " +
           "ORDER BY (p.likesCount + p.commentsCount + p.sharesCount) DESC")
    Page<Post> findTrendingPostsByOrganization(
        @Param("orgId") UUID orgId,
        @Param("since") LocalDateTime since,
        @Param("blockedUserIds") List<UUID> blockedUserIds,
        Pageable pageable
    );

    // User posts within an organization (for analytics)
    @Query("SELECT p FROM Post p WHERE " +
           "p.userPrimaryOrgIdSnapshot = :orgId " +
           "AND p.createdAt >= :since")
    List<Post> findByUserPrimaryOrgSnapshot(
        @Param("orgId") UUID orgId,
        @Param("since") LocalDateTime since
    );

    // Delete all posts by organization
    @Modifying
    @Query("DELETE FROM Post p WHERE p.organization.id = :orgId")
    void deleteByOrganizationId(@Param("orgId") UUID orgId);

    // ========== ORGANIZATION-FILTERED QUERIES (for ORG_ADMIN analytics) ==========
    
    @Query("SELECT COUNT(p) FROM Post p WHERE p.organization.id IN :orgIds")
    long countByOrganizationIdIn(@Param("orgIds") List<UUID> orgIds);
    
    @Query("SELECT COUNT(p) FROM Post p WHERE p.organization.id IN :orgIds AND p.createdAt >= :since")
    long countByOrganizationIdInAndCreatedAtAfter(@Param("orgIds") List<UUID> orgIds, @Param("since") LocalDateTime since);
}
