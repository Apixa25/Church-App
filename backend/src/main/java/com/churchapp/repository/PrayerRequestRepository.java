package com.churchapp.repository;

import com.churchapp.entity.PrayerRequest;
import com.churchapp.entity.User;
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
public interface PrayerRequestRepository extends JpaRepository<PrayerRequest, UUID> {
    
    // Find by user
    Page<PrayerRequest> findByUser(User user, Pageable pageable);
    
    List<PrayerRequest> findByUserIdOrderByCreatedAtDesc(UUID userId);
    
    // Find by status
    Page<PrayerRequest> findByStatusOrderByCreatedAtDesc(PrayerRequest.PrayerStatus status, Pageable pageable);
    
    // Find by category
    Page<PrayerRequest> findByCategoryOrderByCreatedAtDesc(PrayerRequest.PrayerCategory category, Pageable pageable);
    
    // Find by category and status
    Page<PrayerRequest> findByCategoryAndStatusOrderByCreatedAtDesc(
        PrayerRequest.PrayerCategory category, 
        PrayerRequest.PrayerStatus status, 
        Pageable pageable
    );
    
    // Find all active prayers
    @Query("SELECT pr FROM PrayerRequest pr WHERE pr.status = 'ACTIVE' ORDER BY pr.createdAt DESC")
    Page<PrayerRequest> findAllActivePrayers(Pageable pageable);
    
    // Find all active prayers as list (for prayer sheet)
    @Query("SELECT pr FROM PrayerRequest pr WHERE pr.status = 'ACTIVE' ORDER BY pr.createdAt DESC")
    List<PrayerRequest> findAllActivePrayersList();
    
    // Search prayers by title or description
    @Query("SELECT pr FROM PrayerRequest pr WHERE " +
           "LOWER(pr.title) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(pr.description) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
           "ORDER BY pr.createdAt DESC")
    Page<PrayerRequest> searchPrayerRequests(@Param("searchTerm") String searchTerm, Pageable pageable);
    
    // Count by status
    long countByStatus(PrayerRequest.PrayerStatus status);
    
    long countByCategory(PrayerRequest.PrayerCategory category);
    
    // Dashboard-specific queries
    List<PrayerRequest> findByCreatedAtAfterOrderByCreatedAtDesc(LocalDateTime createdAfter, Pageable pageable);
    
    @Query("SELECT pr FROM PrayerRequest pr WHERE pr.updatedAt > :updatedAfter ORDER BY pr.updatedAt DESC")
    List<PrayerRequest> findByUpdatedAtAfterOrderByUpdatedAtDesc(@Param("updatedAfter") LocalDateTime updatedAfter, Pageable pageable);
    
    long countByCreatedAtAfter(LocalDateTime createdAfter);
    
    // Recent prayers for feed
    @Query("SELECT pr FROM PrayerRequest pr WHERE pr.status IN ('ACTIVE', 'ANSWERED') ORDER BY pr.createdAt DESC")
    List<PrayerRequest> findRecentPrayersForFeed(Pageable pageable);
    
    // Anonymous prayers handling
    @Query("SELECT pr FROM PrayerRequest pr WHERE pr.isAnonymous = false ORDER BY pr.createdAt DESC")
    Page<PrayerRequest> findPublicPrayers(Pageable pageable);
    
    @Query("SELECT pr FROM PrayerRequest pr WHERE pr.user.id = :userId OR pr.isAnonymous = false ORDER BY pr.createdAt DESC")
    Page<PrayerRequest> findVisiblePrayersForUser(@Param("userId") UUID userId, Pageable pageable);
}