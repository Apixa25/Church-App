package com.churchapp.repository;

import com.churchapp.entity.PrayerInteraction;
import com.churchapp.entity.PrayerRequest;
import com.churchapp.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PrayerInteractionRepository extends JpaRepository<PrayerInteraction, UUID> {
    
    // Find interactions by prayer request
    List<PrayerInteraction> findByPrayerRequestOrderByTimestampDesc(PrayerRequest prayerRequest);
    
    List<PrayerInteraction> findByPrayerRequestIdOrderByTimestampDesc(UUID prayerRequestId);
    
    Page<PrayerInteraction> findByPrayerRequestOrderByTimestampDesc(PrayerRequest prayerRequest, Pageable pageable);
    
    // Find interactions by user
    List<PrayerInteraction> findByUserOrderByTimestampDesc(User user);
    
    List<PrayerInteraction> findByUserIdOrderByTimestampDesc(UUID userId);
    
    // Find by type
    List<PrayerInteraction> findByPrayerRequestAndTypeOrderByTimestampDesc(
        PrayerRequest prayerRequest, 
        PrayerInteraction.InteractionType type
    );
    
    // Check if user already interacted with a prayer in a specific way
    Optional<PrayerInteraction> findByPrayerRequestAndUserAndType(
        PrayerRequest prayerRequest, 
        User user, 
        PrayerInteraction.InteractionType type
    );
    
    boolean existsByPrayerRequestAndUserAndType(
        PrayerRequest prayerRequest, 
        User user, 
        PrayerInteraction.InteractionType type
    );
    
    // Count interactions by type for a prayer
    long countByPrayerRequestAndType(PrayerRequest prayerRequest, PrayerInteraction.InteractionType type);
    
    long countByPrayerRequestIdAndType(UUID prayerRequestId, PrayerInteraction.InteractionType type);
    
    // Count total interactions for a prayer
    long countByPrayerRequest(PrayerRequest prayerRequest);
    
    long countByPrayerRequestId(UUID prayerRequestId);
    
    // Get interaction counts grouped by type
    @Query("SELECT pi.type, COUNT(pi) FROM PrayerInteraction pi WHERE pi.prayerRequest.id = :prayerRequestId GROUP BY pi.type")
    List<Object[]> getInteractionCountsByType(@Param("prayerRequestId") UUID prayerRequestId);
    
    // Recent interactions for dashboard
    List<PrayerInteraction> findByTimestampAfterOrderByTimestampDesc(LocalDateTime timestamp, Pageable pageable);
    
    // Comments only (excluding reactions)
    @Query("SELECT pi FROM PrayerInteraction pi WHERE pi.prayerRequest.id = :prayerRequestId AND pi.type = 'COMMENT' ORDER BY pi.timestamp DESC")
    List<PrayerInteraction> findCommentsByPrayerRequestId(@Param("prayerRequestId") UUID prayerRequestId);
    
    @Query("SELECT pi FROM PrayerInteraction pi WHERE pi.prayerRequest.id = :prayerRequestId AND pi.type = 'COMMENT' ORDER BY pi.timestamp DESC")
    Page<PrayerInteraction> findCommentsByPrayerRequestId(@Param("prayerRequestId") UUID prayerRequestId, Pageable pageable);
    
    // Reactions only (excluding comments)
    @Query("SELECT pi FROM PrayerInteraction pi WHERE pi.prayerRequest.id = :prayerRequestId AND pi.type != 'COMMENT' ORDER BY pi.timestamp DESC")
    List<PrayerInteraction> findReactionsByPrayerRequestId(@Param("prayerRequestId") UUID prayerRequestId);
    
    // Delete user's previous interaction of same type (for reactions that should be unique per user)
    void deleteByPrayerRequestAndUserAndType(
        PrayerRequest prayerRequest, 
        User user, 
        PrayerInteraction.InteractionType type
    );
    
    // Stats queries
    long countByType(PrayerInteraction.InteractionType type);
    
    @Query("SELECT COUNT(DISTINCT pi.user.id) FROM PrayerInteraction pi WHERE pi.prayerRequest.id = :prayerRequestId")
    long countDistinctUsersByPrayerRequestId(@Param("prayerRequestId") UUID prayerRequestId);
    
    // Recent activity for specific prayer
    @Query("SELECT pi FROM PrayerInteraction pi WHERE pi.prayerRequest.id = :prayerRequestId AND pi.timestamp > :since ORDER BY pi.timestamp DESC")
    List<PrayerInteraction> findRecentActivityByPrayerRequestId(
        @Param("prayerRequestId") UUID prayerRequestId, 
        @Param("since") LocalDateTime since
    );
    
    // Bulk delete all interactions for a prayer request
    // This bypasses JPA entity management and deletes directly at the database level
    // Delete replies first (interactions with a parent), then top-level interactions
    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM PrayerInteraction pi WHERE pi.prayerRequest.id = :prayerRequestId AND pi.parentInteraction IS NOT NULL")
    void deleteRepliesByPrayerRequestId(@Param("prayerRequestId") UUID prayerRequestId);
    
    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM PrayerInteraction pi WHERE pi.prayerRequest.id = :prayerRequestId AND pi.parentInteraction IS NULL")
    void deleteTopLevelInteractionsByPrayerRequestId(@Param("prayerRequestId") UUID prayerRequestId);
}