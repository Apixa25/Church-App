package com.churchapp.repository;

import com.churchapp.entity.WorshipRoom;
import com.churchapp.entity.WorshipScheduledEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorshipScheduledEventRepository extends JpaRepository<WorshipScheduledEvent, UUID> {

    // Find events by room
    List<WorshipScheduledEvent> findByRoomOrderByScheduledStartDesc(WorshipRoom room);

    // Find events by room ID
    @Query("SELECT wse FROM WorshipScheduledEvent wse WHERE wse.room.id = :roomId ORDER BY wse.scheduledStart DESC")
    List<WorshipScheduledEvent> findByRoomId(@Param("roomId") UUID roomId);

    // Find upcoming events
    @Query("SELECT wse FROM WorshipScheduledEvent wse WHERE wse.status = 'SCHEDULED' AND wse.scheduledStart > :now ORDER BY wse.scheduledStart ASC")
    List<WorshipScheduledEvent> findUpcomingEvents(@Param("now") LocalDateTime now);

    // Find events that should auto-start
    @Query("SELECT wse FROM WorshipScheduledEvent wse WHERE wse.status = 'SCHEDULED' AND wse.scheduledStart <= :now")
    List<WorshipScheduledEvent> findEventsToStart(@Param("now") LocalDateTime now);

    // Find live events that should auto-end
    @Query("SELECT wse FROM WorshipScheduledEvent wse WHERE wse.status = 'LIVE' AND wse.scheduledEnd IS NOT NULL AND wse.scheduledEnd <= :now")
    List<WorshipScheduledEvent> findEventsToEnd(@Param("now") LocalDateTime now);

    // Find current or next event for a room
    @Query("SELECT wse FROM WorshipScheduledEvent wse WHERE wse.room = :room AND (wse.status = 'LIVE' OR (wse.status = 'SCHEDULED' AND wse.scheduledStart > :now)) ORDER BY wse.scheduledStart ASC")
    List<WorshipScheduledEvent> findCurrentOrUpcomingForRoom(@Param("room") WorshipRoom room, @Param("now") LocalDateTime now);

    // Find active event for room (currently live)
    Optional<WorshipScheduledEvent> findByRoomAndStatus(WorshipRoom room, WorshipScheduledEvent.EventStatus status);

    // Find all events by status
    List<WorshipScheduledEvent> findByStatusOrderByScheduledStartAsc(WorshipScheduledEvent.EventStatus status);

    // Count upcoming events
    @Query("SELECT COUNT(wse) FROM WorshipScheduledEvent wse WHERE wse.status = 'SCHEDULED' AND wse.scheduledStart > :now")
    long countUpcomingEvents(@Param("now") LocalDateTime now);

    // Count live events
    @Query("SELECT COUNT(wse) FROM WorshipScheduledEvent wse WHERE wse.status = 'LIVE'")
    long countLiveEvents();
}
