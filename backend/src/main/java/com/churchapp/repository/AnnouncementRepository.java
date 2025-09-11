package com.churchapp.repository;

import com.churchapp.entity.Announcement;
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
public interface AnnouncementRepository extends JpaRepository<Announcement, UUID> {
    
    // Find all non-deleted announcements
    @Query("SELECT a FROM Announcement a WHERE a.deletedAt IS NULL ORDER BY a.isPinned DESC, a.createdAt DESC")
    Page<Announcement> findAllActive(Pageable pageable);
    
    // Find by user
    @Query("SELECT a FROM Announcement a WHERE a.user = :user AND a.deletedAt IS NULL ORDER BY a.createdAt DESC")
    Page<Announcement> findByUser(@Param("user") User user, Pageable pageable);
    
    // Find by user ID
    @Query("SELECT a FROM Announcement a WHERE a.user.id = :userId AND a.deletedAt IS NULL ORDER BY a.createdAt DESC")
    List<Announcement> findByUserIdOrderByCreatedAtDesc(@Param("userId") UUID userId);
    
    // Find by category
    @Query("SELECT a FROM Announcement a WHERE a.category = :category AND a.deletedAt IS NULL ORDER BY a.isPinned DESC, a.createdAt DESC")
    Page<Announcement> findByCategoryOrderByCreatedAtDesc(@Param("category") Announcement.AnnouncementCategory category, Pageable pageable);
    
    // Find pinned announcements
    @Query("SELECT a FROM Announcement a WHERE a.isPinned = true AND a.deletedAt IS NULL ORDER BY a.createdAt DESC")
    List<Announcement> findPinnedAnnouncements();
    
    @Query("SELECT a FROM Announcement a WHERE a.isPinned = true AND a.deletedAt IS NULL ORDER BY a.createdAt DESC")
    Page<Announcement> findPinnedAnnouncements(Pageable pageable);
    
    // Search announcements by title or content
    @Query("SELECT a FROM Announcement a WHERE a.deletedAt IS NULL AND " +
           "(LOWER(a.title) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(a.content) LIKE LOWER(CONCAT('%', :searchTerm, '%'))) " +
           "ORDER BY a.isPinned DESC, a.createdAt DESC")
    Page<Announcement> searchAnnouncements(@Param("searchTerm") String searchTerm, Pageable pageable);
    
    // Dashboard-specific queries for recent announcements
    @Query("SELECT a FROM Announcement a WHERE a.deletedAt IS NULL AND a.createdAt > :createdAfter ORDER BY a.isPinned DESC, a.createdAt DESC")
    List<Announcement> findByCreatedAtAfterOrderByCreatedAtDesc(@Param("createdAfter") LocalDateTime createdAfter, Pageable pageable);
    
    // Recent announcements for feed (last 7 days)
    @Query("SELECT a FROM Announcement a WHERE a.deletedAt IS NULL AND a.createdAt > :weekAgo ORDER BY a.isPinned DESC, a.createdAt DESC")
    List<Announcement> findRecentAnnouncementsForFeed(@Param("weekAgo") LocalDateTime weekAgo, Pageable pageable);
    
    // Count announcements
    @Query("SELECT COUNT(a) FROM Announcement a WHERE a.deletedAt IS NULL")
    long countActiveAnnouncements();
    
    @Query("SELECT COUNT(a) FROM Announcement a WHERE a.category = :category AND a.deletedAt IS NULL")
    long countByCategory(@Param("category") Announcement.AnnouncementCategory category);
    
    @Query("SELECT COUNT(a) FROM Announcement a WHERE a.isPinned = true AND a.deletedAt IS NULL")
    long countPinnedAnnouncements();
    
    @Query("SELECT COUNT(a) FROM Announcement a WHERE a.deletedAt IS NULL AND a.createdAt > :createdAfter")
    long countByCreatedAtAfter(@Param("createdAfter") LocalDateTime createdAfter);
    
    // Admin queries - including soft deleted
    @Query("SELECT a FROM Announcement a ORDER BY a.isPinned DESC, a.createdAt DESC")
    Page<Announcement> findAllIncludingDeleted(Pageable pageable);
    
    @Query("SELECT a FROM Announcement a WHERE a.deletedAt IS NOT NULL ORDER BY a.deletedAt DESC")
    Page<Announcement> findDeletedAnnouncements(Pageable pageable);
}