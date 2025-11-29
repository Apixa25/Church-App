package com.churchapp.repository;

import com.churchapp.entity.Event;
import com.churchapp.entity.EventRsvp;
import com.churchapp.entity.EventRsvpId;
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
public interface EventRsvpRepository extends JpaRepository<EventRsvp, EventRsvpId> {
    
    // Find by user
    List<EventRsvp> findByUserOrderByTimestampDesc(User user);
    
    List<EventRsvp> findByUserIdOrderByTimestampDesc(UUID userId);
    
    // Find by event
    List<EventRsvp> findByEventOrderByTimestampDesc(Event event);
    
    List<EventRsvp> findByEventIdOrderByTimestampDesc(UUID eventId);
    
    // Find by response type
    List<EventRsvp> findByEventAndResponseOrderByTimestampDesc(Event event, EventRsvp.RsvpResponse response);
    
    List<EventRsvp> findByEventIdAndResponseOrderByTimestampDesc(UUID eventId, EventRsvp.RsvpResponse response);
    
    // Find specific RSVP
    Optional<EventRsvp> findByUserIdAndEventId(UUID userId, UUID eventId);
    
    Optional<EventRsvp> findByUserAndEvent(User user, Event event);
    
    // Count RSVPs by response type for an event
    long countByEventAndResponse(Event event, EventRsvp.RsvpResponse response);
    
    long countByEventIdAndResponse(UUID eventId, EventRsvp.RsvpResponse response);
    
    // Count total RSVPs for an event
    long countByEvent(Event event);
    
    long countByEventId(UUID eventId);
    
    // Get RSVP statistics for an event
    @Query("SELECT r.response, COUNT(r) FROM EventRsvp r WHERE r.event.id = :eventId GROUP BY r.response")
    List<Object[]> getRsvpStatsByEventId(@Param("eventId") UUID eventId);
    
    // Find user's upcoming RSVPs
    @Query("SELECT r FROM EventRsvp r WHERE r.user.id = :userId AND r.event.startTime > :now AND r.response = 'YES' ORDER BY r.event.startTime ASC")
    List<EventRsvp> findUserUpcomingYesRsvps(@Param("userId") UUID userId, @Param("now") LocalDateTime now);
    
    // Find RSVPs for events happening today
    @Query("SELECT r FROM EventRsvp r WHERE r.event.startTime >= :startOfDay AND r.event.startTime < :endOfDay AND r.response = 'YES' ORDER BY r.event.startTime ASC")
    List<EventRsvp> findRsvpsForEventsToday(@Param("startOfDay") LocalDateTime startOfDay, @Param("endOfDay") LocalDateTime endOfDay);
    
    // Find RSVPs for events happening this week
    @Query("SELECT r FROM EventRsvp r WHERE r.event.startTime >= :weekStart AND r.event.startTime <= :weekEnd AND r.response = 'YES' ORDER BY r.event.startTime ASC")
    List<EventRsvp> findRsvpsForEventsThisWeek(@Param("weekStart") LocalDateTime weekStart, @Param("weekEnd") LocalDateTime weekEnd);
    
    // Calculate total guest count for an event
    @Query("SELECT COALESCE(SUM(r.guestCount), 0) FROM EventRsvp r WHERE r.event.id = :eventId AND r.response = 'YES'")
    Integer getTotalGuestCountForEvent(@Param("eventId") UUID eventId);
    
    // Get attendee count (YES responses + guest count)
    @Query("SELECT COUNT(r) + COALESCE(SUM(r.guestCount), 0) FROM EventRsvp r WHERE r.event.id = :eventId AND r.response = 'YES'")
    Integer getTotalAttendeeCountForEvent(@Param("eventId") UUID eventId);
    
    // Find recent RSVPs for dashboard
    List<EventRsvp> findByTimestampAfterOrderByTimestampDesc(LocalDateTime timestampAfter, Pageable pageable);
    
    // Find RSVPs by user for specific time period
    @Query("SELECT r FROM EventRsvp r WHERE r.user.id = :userId AND r.timestamp >= :startDate AND r.timestamp <= :endDate ORDER BY r.timestamp DESC")
    List<EventRsvp> findUserRsvpsByDateRange(
        @Param("userId") UUID userId, 
        @Param("startDate") LocalDateTime startDate, 
        @Param("endDate") LocalDateTime endDate
    );
    
    // Delete RSVPs for a specific event (cleanup)
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM EventRsvp r WHERE r.event.id = :eventId")
    void deleteByEventId(@Param("eventId") UUID eventId);
    
    // Delete user's RSVP for a specific event
    void deleteByUserIdAndEventId(UUID userId, UUID eventId);
}