package com.churchapp.repository;

import com.churchapp.entity.Announcement;
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

    // ========================================================================
    // MULTI-TENANT ORGANIZATION QUERIES
    // ========================================================================

    // Find announcements by organization
    @Query("SELECT a FROM Announcement a WHERE " +
           "a.organization.id = :orgId " +
           "AND a.deletedAt IS NULL " +
           "ORDER BY a.isPinned DESC, a.createdAt DESC")
    Page<Announcement> findByOrganizationId(@Param("orgId") UUID orgId, Pageable pageable);

    // Get all announcements for an organization (for metrics calculation)
    @Query("SELECT a FROM Announcement a WHERE a.organization.id = :orgId AND a.deletedAt IS NULL")
    List<Announcement> findAllByOrganizationId(@Param("orgId") UUID orgId);

    // Find pinned announcements by organization
    @Query("SELECT a FROM Announcement a WHERE " +
           "a.organization.id = :orgId " +
           "AND a.isPinned = true " +
           "AND a.deletedAt IS NULL " +
           "ORDER BY a.createdAt DESC")
    List<Announcement> findPinnedByOrganizationId(@Param("orgId") UUID orgId);

    // Find announcements by organization and category
    @Query("SELECT a FROM Announcement a WHERE " +
           "a.organization.id = :orgId " +
           "AND a.category = :category " +
           "AND a.deletedAt IS NULL " +
           "ORDER BY a.isPinned DESC, a.createdAt DESC")
    Page<Announcement> findByOrganizationIdAndCategory(
        @Param("orgId") UUID orgId,
        @Param("category") Announcement.AnnouncementCategory category,
        Pageable pageable
    );

    // Count announcements by organization
    @Query("SELECT COUNT(a) FROM Announcement a WHERE " +
           "a.organization.id = :orgId AND a.deletedAt IS NULL")
    Long countByOrganizationId(@Param("orgId") UUID orgId);

    // Search announcements within organization
    @Query("SELECT a FROM Announcement a WHERE " +
           "a.organization.id = :orgId " +
           "AND a.deletedAt IS NULL " +
           "AND (" +
           "  LOWER(a.title) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
           "  OR LOWER(a.content) LIKE LOWER(CONCAT('%', :searchTerm, '%'))" +
           ") " +
           "ORDER BY a.isPinned DESC, a.createdAt DESC")
    Page<Announcement> searchByOrganization(
        @Param("orgId") UUID orgId,
        @Param("searchTerm") String searchTerm,
        Pageable pageable
    );

    // Delete all announcements by organization
    @Modifying
    @Query("DELETE FROM Announcement a WHERE a.organization.id = :orgId")
    void deleteByOrganizationId(@Param("orgId") UUID orgId);

    // ========== ORGANIZATION-FILTERED QUERIES (for ORG_ADMIN analytics) ==========
    
    @Query("SELECT COUNT(a) FROM Announcement a WHERE a.organization.id IN :orgIds AND a.deletedAt IS NULL")
    long countByOrganizationIdIn(@Param("orgIds") List<UUID> orgIds);

    // ========================================================================
    // SYSTEM-WIDE AND ORGANIZATION ANNOUNCEMENTS (for multi-tenant filtering)
    // ========================================================================

    // Find announcements for user's organization OR system-wide (organization IS NULL)
    @Query("SELECT a FROM Announcement a WHERE " +
           "a.deletedAt IS NULL " +
           "AND (a.organization.id = :orgId OR a.organization IS NULL) " +
           "ORDER BY a.isPinned DESC, a.createdAt DESC")
    Page<Announcement> findByOrganizationIdOrSystemWide(@Param("orgId") UUID orgId, Pageable pageable);

    // Find pinned announcements for user's organization OR system-wide
    @Query("SELECT a FROM Announcement a WHERE " +
           "a.isPinned = true " +
           "AND a.deletedAt IS NULL " +
           "AND (a.organization.id = :orgId OR a.organization IS NULL) " +
           "ORDER BY a.createdAt DESC")
    List<Announcement> findPinnedByOrganizationIdOrSystemWide(@Param("orgId") UUID orgId);

    // Find announcements by category for user's organization OR system-wide
    @Query("SELECT a FROM Announcement a WHERE " +
           "a.category = :category " +
           "AND a.deletedAt IS NULL " +
           "AND (a.organization.id = :orgId OR a.organization IS NULL) " +
           "ORDER BY a.isPinned DESC, a.createdAt DESC")
    Page<Announcement> findByOrganizationIdOrSystemWideAndCategory(
        @Param("orgId") UUID orgId,
        @Param("category") Announcement.AnnouncementCategory category,
        Pageable pageable
    );

    // Search announcements for user's organization OR system-wide
    @Query("SELECT a FROM Announcement a WHERE " +
           "a.deletedAt IS NULL " +
           "AND (a.organization.id = :orgId OR a.organization IS NULL) " +
           "AND (" +
           "  LOWER(a.title) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
           "  OR LOWER(a.content) LIKE LOWER(CONCAT('%', :searchTerm, '%'))" +
           ") " +
           "ORDER BY a.isPinned DESC, a.createdAt DESC")
    Page<Announcement> searchByOrganizationIdOrSystemWide(
        @Param("orgId") UUID orgId,
        @Param("searchTerm") String searchTerm,
        Pageable pageable
    );

    // Find all system-wide announcements (organization IS NULL) - for PLATFORM_ADMIN
    @Query("SELECT a FROM Announcement a WHERE " +
           "a.organization IS NULL " +
           "AND a.deletedAt IS NULL " +
           "ORDER BY a.isPinned DESC, a.createdAt DESC")
    Page<Announcement> findSystemWideAnnouncements(Pageable pageable);
}