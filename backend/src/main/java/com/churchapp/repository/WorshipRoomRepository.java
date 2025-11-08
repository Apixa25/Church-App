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

    // Find public rooms
    List<WorshipRoom> findByIsPrivateFalseAndIsActiveTrueOrderByCreatedAtDesc();

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
    @Query("SELECT DISTINCT wrp.worshipRoom FROM WorshipRoomParticipant wrp " +
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
}
