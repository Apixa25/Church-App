package com.churchapp.repository;

import com.churchapp.entity.Event;
import com.churchapp.entity.ChatGroup;
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
public interface EventRepository extends JpaRepository<Event, UUID> {
    
    // Find by creator
    @Query("SELECT e FROM Event e " +
           "LEFT JOIN FETCH e.creator " +
           "LEFT JOIN FETCH e.group " +
           "WHERE e.creator = :creator")
    Page<Event> findByCreator(@Param("creator") User creator, Pageable pageable);
    
    List<Event> findByCreatorIdOrderByStartTimeDesc(UUID creatorId);
    
    // Find by status
    @Query("SELECT e FROM Event e " +
           "LEFT JOIN FETCH e.creator " +
           "LEFT JOIN FETCH e.group " +
           "WHERE e.status = :status " +
           "ORDER BY e.startTime ASC")
    Page<Event> findByStatusOrderByStartTimeAsc(@Param("status") Event.EventStatus status, Pageable pageable);
    
    // Find by category
    @Query("SELECT e FROM Event e " +
           "LEFT JOIN FETCH e.creator " +
           "LEFT JOIN FETCH e.group " +
           "WHERE e.category = :category " +
           "ORDER BY e.startTime ASC")
    Page<Event> findByCategoryOrderByStartTimeAsc(@Param("category") Event.EventCategory category, Pageable pageable);
    
    // Find by category and status
    @Query("SELECT e FROM Event e " +
           "LEFT JOIN FETCH e.creator " +
           "LEFT JOIN FETCH e.group " +
           "WHERE e.category = :category AND e.status = :status " +
           "ORDER BY e.startTime ASC")
    Page<Event> findByCategoryAndStatusOrderByStartTimeAsc(
        @Param("category") Event.EventCategory category, 
        @Param("status") Event.EventStatus status, 
        Pageable pageable
    );
    
    // Find by group
    @Query("SELECT e FROM Event e " +
           "LEFT JOIN FETCH e.creator " +
           "LEFT JOIN FETCH e.group " +
           "WHERE e.group = :group " +
           "ORDER BY e.startTime ASC")
    Page<Event> findByGroupOrderByStartTimeAsc(@Param("group") ChatGroup group, Pageable pageable);
    
    List<Event> findByGroupIdOrderByStartTimeAsc(UUID groupId);
    
    // Find upcoming events
    @Query("SELECT e FROM Event e " +
           "LEFT JOIN FETCH e.creator " +
           "LEFT JOIN FETCH e.group " +
           "WHERE e.startTime > :now AND e.status = 'SCHEDULED' " +
           "ORDER BY e.startTime ASC")
    Page<Event> findUpcomingEvents(@Param("now") LocalDateTime now, Pageable pageable);
    
    // Find events within date range
    @Query("SELECT e FROM Event e " +
           "LEFT JOIN FETCH e.creator " +
           "LEFT JOIN FETCH e.group " +
           "WHERE e.startTime >= :startDate AND e.startTime <= :endDate " +
           "ORDER BY e.startTime ASC")
    Page<Event> findEventsByDateRange(
        @Param("startDate") LocalDateTime startDate, 
        @Param("endDate") LocalDateTime endDate, 
        Pageable pageable
    );
    
    // Search events by title or description
    @Query("SELECT e FROM Event e " +
           "LEFT JOIN FETCH e.creator " +
           "LEFT JOIN FETCH e.group " +
           "WHERE (LOWER(e.title) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(e.description) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(e.location) LIKE LOWER(CONCAT('%', :searchTerm, '%'))) " +
           "ORDER BY e.startTime ASC")
    Page<Event> searchEvents(@Param("searchTerm") String searchTerm, Pageable pageable);
    
    // Count by status
    long countByStatus(Event.EventStatus status);
    
    long countByCategory(Event.EventCategory category);
    
    // Dashboard-specific queries for recent events
    List<Event> findByCreatedAtAfterOrderByCreatedAtDesc(LocalDateTime createdAfter, Pageable pageable);
    
    @Query("SELECT e FROM Event e WHERE e.updatedAt > :updatedAfter ORDER BY e.updatedAt DESC")
    List<Event> findByUpdatedAtAfterOrderByUpdatedAtDesc(@Param("updatedAfter") LocalDateTime updatedAfter, Pageable pageable);
    
    long countByCreatedAtAfter(LocalDateTime createdAfter);
    
    // Recent events for feed
    @Query("SELECT e FROM Event e WHERE e.status = 'SCHEDULED' AND e.startTime > :now ORDER BY e.createdAt DESC")
    List<Event> findRecentEventsForFeed(@Param("now") LocalDateTime now, Pageable pageable);
    
    // Find events happening today
    @Query("SELECT e FROM Event e WHERE e.startTime >= :startOfDay AND e.startTime < :endOfDay AND e.status = 'SCHEDULED' ORDER BY e.startTime ASC")
    List<Event> findEventsToday(@Param("startOfDay") LocalDateTime startOfDay, @Param("endOfDay") LocalDateTime endOfDay);
    
    // Find events happening this week
    @Query("SELECT e FROM Event e WHERE e.startTime >= :weekStart AND e.startTime <= :weekEnd AND e.status = 'SCHEDULED' ORDER BY e.startTime ASC")
    List<Event> findEventsThisWeek(@Param("weekStart") LocalDateTime weekStart, @Param("weekEnd") LocalDateTime weekEnd);
    
    // Find recurring events
    @Query("SELECT e FROM Event e WHERE e.isRecurring = true AND e.status = 'SCHEDULED' ORDER BY e.startTime ASC")
    List<Event> findRecurringEvents();
    
    // Find events requiring approval
    @Query("SELECT e FROM Event e WHERE e.requiresApproval = true AND e.status = 'SCHEDULED' ORDER BY e.createdAt DESC")
    List<Event> findEventsRequiringApproval();
    
    // Find recent events ordered by creation date (for activity feed)
    @Query("SELECT e FROM Event e " +
           "LEFT JOIN FETCH e.creator " +
           "LEFT JOIN FETCH e.group " +
           "WHERE e.status = 'SCHEDULED' " +
           "ORDER BY e.createdAt DESC")
    Page<Event> findRecentEventsOrderByCreatedAt(Pageable pageable);

    // ========================================================================
    // MULTI-TENANT ORGANIZATION QUERIES
    // ========================================================================

    // Find events by organization
    @Query("SELECT e FROM Event e " +
           "LEFT JOIN FETCH e.creator " +
           "LEFT JOIN FETCH e.group " +
           "WHERE e.organization.id = :orgId " +
           "ORDER BY e.startTime ASC")
    Page<Event> findByOrganizationId(@Param("orgId") UUID orgId, Pageable pageable);

    // Find upcoming events by organization
    @Query("SELECT e FROM Event e WHERE " +
           "e.organization.id = :orgId " +
           "AND e.startTime > :now " +
           "AND e.status = 'SCHEDULED' " +
           "ORDER BY e.startTime ASC")
    List<Event> findUpcomingByOrganizationId(
        @Param("orgId") UUID orgId,
        @Param("now") LocalDateTime now
    );

    // Find events by organization and status
    @Query("SELECT e FROM Event e WHERE " +
           "e.organization.id = :orgId " +
           "AND e.status = :status " +
           "ORDER BY e.startTime ASC")
    Page<Event> findByOrganizationIdAndStatus(
        @Param("orgId") UUID orgId,
        @Param("status") Event.EventStatus status,
        Pageable pageable
    );

    // Find events by organization and category
    @Query("SELECT e FROM Event e WHERE " +
           "e.organization.id = :orgId " +
           "AND e.category = :category " +
           "ORDER BY e.startTime ASC")
    Page<Event> findByOrganizationIdAndCategory(
        @Param("orgId") UUID orgId,
        @Param("category") Event.EventCategory category,
        Pageable pageable
    );

    // Count events by organization
    @Query("SELECT COUNT(e) FROM Event e WHERE e.organization.id = :orgId")
    Long countByOrganizationId(@Param("orgId") UUID orgId);

    // Count upcoming events by organization
    @Query("SELECT COUNT(e) FROM Event e WHERE " +
           "e.organization.id = :orgId " +
           "AND e.startTime > :now " +
           "AND e.status = 'SCHEDULED'")
    Long countUpcomingByOrganizationId(
        @Param("orgId") UUID orgId,
        @Param("now") LocalDateTime now
    );

    // Find all event IDs by organization
    @Query("SELECT e.id FROM Event e WHERE e.organization.id = :orgId")
    List<UUID> findEventIdsByOrganizationId(@Param("orgId") UUID orgId);

    // Delete all events by organization
    @Modifying
    @Query("DELETE FROM Event e WHERE e.organization.id = :orgId")
    void deleteByOrganizationId(@Param("orgId") UUID orgId);

    // ========== ORGANIZATION-FILTERED QUERIES (for ORG_ADMIN analytics) ==========
    
    @Query("SELECT COUNT(e) FROM Event e WHERE e.organization.id IN :orgIds")
    long countByOrganizationIdIn(@Param("orgIds") List<UUID> orgIds);
}