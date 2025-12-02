package com.churchapp.repository;

import com.churchapp.entity.PostView;
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
public interface PostViewRepository extends JpaRepository<PostView, UUID> {

    // Get all views for a post
    Page<PostView> findByPostIdOrderByViewedAtDesc(UUID postId, Pageable pageable);
    List<PostView> findByPostIdOrderByViewedAtDesc(UUID postId);

    // Count total views for a post
    long countByPostId(UUID postId);

    // Count views in a time period
    @Query("SELECT COUNT(pv) FROM PostView pv WHERE pv.postId = :postId AND pv.viewedAt >= :since")
    long countByPostIdAndViewedAtAfter(@Param("postId") UUID postId, @Param("since") LocalDateTime since);

    // Count unique viewers for a post
    @Query("SELECT COUNT(DISTINCT pv.viewerId) FROM PostView pv WHERE pv.postId = :postId AND pv.viewerId IS NOT NULL")
    long countUniqueViewers(@Param("postId") UUID postId);

    // Count unique viewers in time period
    @Query("SELECT COUNT(DISTINCT pv.viewerId) FROM PostView pv WHERE pv.postId = :postId AND pv.viewerId IS NOT NULL AND pv.viewedAt >= :since")
    long countUniqueViewersSince(@Param("postId") UUID postId, @Param("since") LocalDateTime since);

    // Check if user already viewed today (to prevent duplicates)
    // Use date range comparison instead of DATE() function for JPQL compatibility
    @Query("SELECT COUNT(pv) > 0 FROM PostView pv WHERE pv.postId = :postId AND pv.viewerId = :viewerId AND pv.viewedAt >= :startOfDay AND pv.viewedAt < :startOfNextDay")
    boolean hasViewedToday(@Param("postId") UUID postId, @Param("viewerId") UUID viewerId, @Param("startOfDay") LocalDateTime startOfDay, @Param("startOfNextDay") LocalDateTime startOfNextDay);

    // Get views for multiple posts (for user's posts analytics)
    @Query("SELECT pv.postId, COUNT(pv) as viewCount FROM PostView pv WHERE pv.postId IN :postIds GROUP BY pv.postId")
    List<Object[]> countViewsByPostIds(@Param("postIds") List<UUID> postIds);

    // Get views grouped by date for a post
    // Use native query for DATE() function support
    @Query(value = "SELECT DATE(pv.viewed_at) as viewDate, COUNT(pv.id) as viewCount FROM post_views pv WHERE pv.post_id = :postId GROUP BY DATE(pv.viewed_at) ORDER BY viewDate DESC", nativeQuery = true)
    List<Object[]> getViewsByDate(@Param("postId") UUID postId);
    
    /**
     * Insert post view with conflict handling (upsert)
     * Uses PostgreSQL's ON CONFLICT DO NOTHING to handle race conditions gracefully
     * This prevents duplicate key violations when multiple requests try to record the same view
     * Note: Uses the unique index columns (post_id, viewer_id, DATE(viewed_at)) for conflict detection
     */
    @Query(value = "INSERT INTO post_views (id, post_id, viewer_id, viewed_at, time_spent_seconds) " +
            "VALUES (gen_random_uuid(), :postId, :viewerId, NOW(), :timeSpentSeconds) " +
            "ON CONFLICT (post_id, viewer_id, DATE(viewed_at)) WHERE viewer_id IS NOT NULL DO NOTHING", 
            nativeQuery = true)
    void insertPostViewIfNotExists(@Param("postId") UUID postId, 
                                   @Param("viewerId") UUID viewerId, 
                                   @Param("timeSpentSeconds") Integer timeSpentSeconds);
}

