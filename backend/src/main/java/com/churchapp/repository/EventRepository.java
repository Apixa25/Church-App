package com.churchapp.repository;

import com.churchapp.entity.Event;
import com.churchapp.entity.ChatGroup;
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
public interface EventRepository extends JpaRepository<Event, UUID> {
    
    // Find by creator
    Page<Event> findByCreator(User creator, Pageable pageable);
    
    List<Event> findByCreatorIdOrderByStartTimeDesc(UUID creatorId);
    
    // Find by status
    Page<Event> findByStatusOrderByStartTimeAsc(Event.EventStatus status, Pageable pageable);
    
    // Find by category
    Page<Event> findByCategoryOrderByStartTimeAsc(Event.EventCategory category, Pageable pageable);
    
    // Find by category and status
    Page<Event> findByCategoryAndStatusOrderByStartTimeAsc(
        Event.EventCategory category, 
        Event.EventStatus status, 
        Pageable pageable
    );
    
    // Find by group
    Page<Event> findByGroupOrderByStartTimeAsc(ChatGroup group, Pageable pageable);
    
    List<Event> findByGroupIdOrderByStartTimeAsc(UUID groupId);
    
    // Find upcoming events
    @Query("SELECT e FROM Event e WHERE e.startTime > :now AND e.status = 'SCHEDULED' ORDER BY e.startTime ASC")
    Page<Event> findUpcomingEvents(@Param("now") LocalDateTime now, Pageable pageable);
    
    // Find events within date range
    @Query("SELECT e FROM Event e WHERE e.startTime >= :startDate AND e.startTime <= :endDate ORDER BY e.startTime ASC")
    Page<Event> findEventsByDateRange(
        @Param("startDate") LocalDateTime startDate, 
        @Param("endDate") LocalDateTime endDate, 
        Pageable pageable
    );
    
    // Search events by title or description
    @Query("SELECT e FROM Event e WHERE " +
           "LOWER(e.title) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(e.description) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(e.location) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
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
}