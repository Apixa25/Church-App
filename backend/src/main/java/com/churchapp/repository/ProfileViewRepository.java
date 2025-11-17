package com.churchapp.repository;

import com.churchapp.entity.ProfileView;
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
public interface ProfileViewRepository extends JpaRepository<ProfileView, UUID> {

    // Get all profile views for a user (who viewed their profile)
    Page<ProfileView> findByViewedUserIdOrderByViewedAtDesc(UUID viewedUserId, Pageable pageable);
    List<ProfileView> findByViewedUserIdOrderByViewedAtDesc(UUID viewedUserId);

    // Get recent profile views (last N days)
    @Query("SELECT pv FROM ProfileView pv WHERE pv.viewedUserId = :viewedUserId AND pv.viewedAt >= :since ORDER BY pv.viewedAt DESC")
    List<ProfileView> findRecentProfileViews(@Param("viewedUserId") UUID viewedUserId, @Param("since") LocalDateTime since);

    // Count total profile views for a user
    long countByViewedUserId(UUID viewedUserId);

    // Count profile views in a time period
    @Query("SELECT COUNT(pv) FROM ProfileView pv WHERE pv.viewedUserId = :viewedUserId AND pv.viewedAt >= :since")
    long countByViewedUserIdAndViewedAtAfter(@Param("viewedUserId") UUID viewedUserId, @Param("since") LocalDateTime since);

    // Check if viewer already viewed today (to prevent duplicates)
    @Query("SELECT COUNT(pv) > 0 FROM ProfileView pv WHERE pv.viewerId = :viewerId AND pv.viewedUserId = :viewedUserId AND DATE(pv.viewedAt) = CURRENT_DATE")
    boolean hasViewedToday(@Param("viewerId") UUID viewerId, @Param("viewedUserId") UUID viewedUserId);

    // Get unique viewers count
    @Query("SELECT COUNT(DISTINCT pv.viewerId) FROM ProfileView pv WHERE pv.viewedUserId = :viewedUserId")
    long countUniqueViewers(@Param("viewedUserId") UUID viewedUserId);

    // Get unique viewers in time period
    @Query("SELECT COUNT(DISTINCT pv.viewerId) FROM ProfileView pv WHERE pv.viewedUserId = :viewedUserId AND pv.viewedAt >= :since")
    long countUniqueViewersSince(@Param("viewedUserId") UUID viewedUserId, @Param("since") LocalDateTime since);
}

