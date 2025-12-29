package com.churchapp.repository;

import com.churchapp.entity.User;
import com.churchapp.entity.WorshipRoom;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorshipRoomRepository extends JpaRepository<WorshipRoom, UUID> {

    // Find by name
    Optional<WorshipRoom> findByNameAndIsActiveTrue(String name);

    // Find all active rooms
    List<WorshipRoom> findByIsActiveTrueOrderByCreatedAtDesc();

    // Find public rooms (all types - kept for backwards compatibility)
    List<WorshipRoom> findByIsPrivateFalseAndIsActiveTrueOrderByCreatedAtDesc();

    // Find public LIVE rooms only (excludes TEMPLATE and LIVE_EVENT which have their own tabs)
    @Query("SELECT wr FROM WorshipRoom wr WHERE wr.isPrivate = false AND wr.isActive = true AND (wr.roomType = 'LIVE' OR wr.roomType IS NULL) ORDER BY wr.createdAt DESC")
    List<WorshipRoom> findPublicLiveRoomsOnly();

    // Find rooms created by user
    List<WorshipRoom> findByCreatedByAndIsActiveTrueOrderByCreatedAtDesc(User createdBy);

    // Find by playback status
    List<WorshipRoom> findByPlaybackStatusAndIsActiveTrue(String playbackStatus);

    // Find currently playing rooms
    @Query("SELECT wr FROM WorshipRoom wr WHERE wr.playbackStatus = 'playing' AND wr.isActive = true ORDER BY wr.updatedAt DESC")
    List<WorshipRoom> findCurrentlyPlayingRooms();

    // Find rooms by search term
    @Query("SELECT wr FROM WorshipRoom wr WHERE wr.isActive = true AND " +
           "(LOWER(wr.name) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(wr.description) LIKE LOWER(CONCAT('%', :searchTerm, '%')))")
    List<WorshipRoom> findBySearchTerm(@Param("searchTerm") String searchTerm);

    // Find rooms where user is a participant
    @Query("SELECT wrp.worshipRoom FROM WorshipRoomParticipant wrp " +
           "WHERE wrp.user = :user AND wrp.isActive = true AND wrp.worshipRoom.isActive = true " +
           "ORDER BY wrp.lastActiveAt DESC")
    List<WorshipRoom> findRoomsByParticipant(@Param("user") User user);

    // Find rooms where user is current leader
    List<WorshipRoom> findByCurrentLeaderAndIsActiveTrue(User currentLeader);

    // Find rooms user can join (public rooms user is not already in)
    @Query("SELECT wr FROM WorshipRoom wr WHERE wr.isActive = true AND wr.isPrivate = false AND " +
           "wr.id NOT IN (SELECT wrp.worshipRoom.id FROM WorshipRoomParticipant wrp WHERE wrp.user = :user AND wrp.isActive = true)")
    List<WorshipRoom> findJoinableRooms(@Param("user") User user);

    // Find popular rooms (by participant count)
    @Query("SELECT wr FROM WorshipRoom wr " +
           "LEFT JOIN WorshipRoomParticipant wrp ON wr.id = wrp.worshipRoom.id " +
           "WHERE wr.isActive = true AND wr.isPrivate = false " +
           "GROUP BY wr.id " +
           "ORDER BY COUNT(wrp.id) DESC")
    List<WorshipRoom> findPopularRooms(Pageable pageable);

    // Admin queries
    @Query("SELECT wr FROM WorshipRoom wr WHERE wr.isActive = true ORDER BY wr.createdAt DESC")
    Page<WorshipRoom> findAllActiveRooms(Pageable pageable);

    @Query("SELECT COUNT(wr) FROM WorshipRoom wr WHERE wr.createdAt > :since")
    long countRoomsCreatedSince(@Param("since") LocalDateTime since);

    // Count active rooms
    long countByIsActiveTrue();

    // Count currently playing rooms
    @Query("SELECT COUNT(wr) FROM WorshipRoom wr WHERE wr.playbackStatus = 'playing' AND wr.isActive = true")
    long countCurrentlyPlaying();

    // === NEW ROOM TYPE QUERIES ===

    // Find rooms by type
    List<WorshipRoom> findByRoomTypeAndIsActiveTrueOrderByCreatedAtDesc(WorshipRoom.RoomType roomType);

    // Find public rooms by type
    List<WorshipRoom> findByRoomTypeAndIsPrivateFalseAndIsActiveTrueOrderByCreatedAtDesc(WorshipRoom.RoomType roomType);

    // Find template rooms (playlists others can start)
    @Query("SELECT wr FROM WorshipRoom wr WHERE wr.roomType = 'TEMPLATE' AND wr.isActive = true AND wr.isPrivate = false AND wr.allowUserStart = true ORDER BY wr.createdAt DESC")
    List<WorshipRoom> findAvailableTemplateRooms();

    // Find live event rooms
    @Query("SELECT wr FROM WorshipRoom wr WHERE wr.roomType = 'LIVE_EVENT' AND wr.isActive = true ORDER BY wr.scheduledStartTime ASC")
    List<WorshipRoom> findLiveEventRooms();

    // Find upcoming live events
    @Query("SELECT wr FROM WorshipRoom wr WHERE wr.roomType = 'LIVE_EVENT' AND wr.isActive = true AND wr.scheduledStartTime > :now ORDER BY wr.scheduledStartTime ASC")
    List<WorshipRoom> findUpcomingLiveEvents(@Param("now") LocalDateTime now);

    // Find live events that should auto-start
    @Query("SELECT wr FROM WorshipRoom wr WHERE wr.roomType = 'LIVE_EVENT' AND wr.isActive = true AND wr.autoStartEnabled = true AND wr.isLiveStreamActive = false AND wr.scheduledStartTime <= :now")
    List<WorshipRoom> findLiveEventsToAutoStart(@Param("now") LocalDateTime now);

    // Find live events that should auto-close
    @Query("SELECT wr FROM WorshipRoom wr WHERE wr.roomType = 'LIVE_EVENT' AND wr.isActive = true AND wr.autoCloseEnabled = true AND wr.isLiveStreamActive = true AND wr.scheduledEndTime <= :now")
    List<WorshipRoom> findLiveEventsToAutoClose(@Param("now") LocalDateTime now);

    // Find rooms using a specific playlist
    List<WorshipRoom> findByPlaylistIdAndIsActiveTrue(UUID playlistId);
}
