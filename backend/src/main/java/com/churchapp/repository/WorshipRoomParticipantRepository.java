package com.churchapp.repository;

import com.churchapp.entity.User;
import com.churchapp.entity.WorshipRoom;
import com.churchapp.entity.WorshipRoomParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorshipRoomParticipantRepository extends JpaRepository<WorshipRoomParticipant, UUID> {

    // Find participant by room and user
    Optional<WorshipRoomParticipant> findByWorshipRoomAndUser(WorshipRoom worshipRoom, User user);

    // Find active participants in a room
    List<WorshipRoomParticipant> findByWorshipRoomAndIsActiveTrueOrderByJoinedAtAsc(WorshipRoom worshipRoom);

    // Find participants in waitlist
    @Query("SELECT wrp FROM WorshipRoomParticipant wrp WHERE wrp.worshipRoom = :room AND wrp.isInWaitlist = true AND wrp.isActive = true ORDER BY wrp.waitlistPosition ASC")
    List<WorshipRoomParticipant> findWaitlistForRoom(@Param("room") WorshipRoom room);

    // Find next in waitlist
    @Query("SELECT wrp FROM WorshipRoomParticipant wrp WHERE wrp.worshipRoom = :room AND wrp.isInWaitlist = true AND wrp.isActive = true ORDER BY wrp.waitlistPosition ASC LIMIT 1")
    Optional<WorshipRoomParticipant> findNextInWaitlist(@Param("room") WorshipRoom room);

    // Find participants by role
    List<WorshipRoomParticipant> findByWorshipRoomAndRoleAndIsActiveTrue(
        WorshipRoom worshipRoom,
        WorshipRoomParticipant.ParticipantRole role
    );

    // Count active participants in a room
    long countByWorshipRoomAndIsActiveTrue(WorshipRoom worshipRoom);

    // Count participants in waitlist
    @Query("SELECT COUNT(wrp) FROM WorshipRoomParticipant wrp WHERE wrp.worshipRoom = :room AND wrp.isInWaitlist = true AND wrp.isActive = true")
    long countWaitlistForRoom(@Param("room") WorshipRoom room);

    // Check if user is participant in room
    @Query("SELECT COUNT(wrp) > 0 FROM WorshipRoomParticipant wrp WHERE wrp.worshipRoom = :room AND wrp.user = :user AND wrp.isActive = true")
    boolean isUserInRoom(@Param("room") WorshipRoom room, @Param("user") User user);

    // Check if user is in waitlist
    @Query("SELECT COUNT(wrp) > 0 FROM WorshipRoomParticipant wrp WHERE wrp.worshipRoom = :room AND wrp.user = :user AND wrp.isInWaitlist = true AND wrp.isActive = true")
    boolean isUserInWaitlist(@Param("room") WorshipRoom room, @Param("user") User user);

    // Find AFK participants
    @Query("SELECT wrp FROM WorshipRoomParticipant wrp WHERE wrp.worshipRoom = :room AND wrp.isActive = true AND wrp.lastActiveAt < :afkThreshold")
    List<WorshipRoomParticipant> findAfkParticipants(@Param("room") WorshipRoom room, @Param("afkThreshold") LocalDateTime afkThreshold);

    // Find rooms where user is participant
    List<WorshipRoomParticipant> findByUserAndIsActiveTrueOrderByLastActiveAtDesc(User user);

    // Get max waitlist position for a room
    @Query("SELECT COALESCE(MAX(wrp.waitlistPosition), 0) FROM WorshipRoomParticipant wrp WHERE wrp.worshipRoom = :room")
    Integer getMaxWaitlistPosition(@Param("room") WorshipRoom room);

    // Find participants by room with role
    @Query("SELECT wrp FROM WorshipRoomParticipant wrp WHERE wrp.worshipRoom = :room AND wrp.isActive = true ORDER BY wrp.role DESC, wrp.joinedAt ASC")
    List<WorshipRoomParticipant> findParticipantsByRoomOrderByRole(@Param("room") WorshipRoom room);
}
