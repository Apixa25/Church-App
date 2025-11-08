package com.churchapp.repository;

import com.churchapp.entity.User;
import com.churchapp.entity.WorshipQueueEntry;
import com.churchapp.entity.WorshipRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorshipQueueRepository extends JpaRepository<WorshipQueueEntry, UUID> {

    // Find queue entries by room and status, ordered by position
    List<WorshipQueueEntry> findByWorshipRoomAndStatusOrderByPositionAsc(
        WorshipRoom worshipRoom,
        WorshipQueueEntry.QueueStatus status
    );

    // Find waiting queue entries for a room
    @Query("SELECT wqe FROM WorshipQueueEntry wqe WHERE wqe.worshipRoom = :room AND wqe.status = 'WAITING' ORDER BY wqe.position ASC")
    List<WorshipQueueEntry> findWaitingQueueForRoom(@Param("room") WorshipRoom room);

    // Find currently playing entry for a room
    Optional<WorshipQueueEntry> findByWorshipRoomAndStatus(
        WorshipRoom worshipRoom,
        WorshipQueueEntry.QueueStatus status
    );

    // Find next entry in queue
    @Query("SELECT wqe FROM WorshipQueueEntry wqe WHERE wqe.worshipRoom = :room AND wqe.status = 'WAITING' ORDER BY wqe.position ASC LIMIT 1")
    Optional<WorshipQueueEntry> findNextInQueue(@Param("room") WorshipRoom room);

    // Find entries by user in a room
    List<WorshipQueueEntry> findByWorshipRoomAndUser(WorshipRoom worshipRoom, User user);

    // Count entries by user in a room with status
    long countByWorshipRoomAndUserAndStatus(
        WorshipRoom worshipRoom,
        User user,
        WorshipQueueEntry.QueueStatus status
    );

    // Find all entries for a room (all statuses)
    List<WorshipQueueEntry> findByWorshipRoomOrderByPositionAsc(WorshipRoom worshipRoom);

    // Find recent entries by user
    List<WorshipQueueEntry> findByUserOrderByQueuedAtDesc(User user);

    // Find completed entries for a room
    @Query("SELECT wqe FROM WorshipQueueEntry wqe WHERE wqe.worshipRoom = :room AND wqe.status IN ('COMPLETED', 'SKIPPED') ORDER BY wqe.completedAt DESC")
    List<WorshipQueueEntry> findCompletedForRoom(@Param("room") WorshipRoom room);

    // Check if video already in queue
    @Query("SELECT COUNT(wqe) > 0 FROM WorshipQueueEntry wqe WHERE wqe.worshipRoom = :room AND wqe.videoId = :videoId AND wqe.status = 'WAITING'")
    boolean isVideoInQueue(@Param("room") WorshipRoom room, @Param("videoId") String videoId);

    // Check if video was recently played
    @Query("SELECT COUNT(wqe) > 0 FROM WorshipQueueEntry wqe WHERE wqe.worshipRoom = :room AND wqe.videoId = :videoId AND wqe.status IN ('COMPLETED', 'PLAYING') AND wqe.playedAt > :since")
    boolean wasVideoRecentlyPlayed(@Param("room") WorshipRoom room, @Param("videoId") String videoId, @Param("since") LocalDateTime since);

    // Get max position in queue for a room
    @Query("SELECT COALESCE(MAX(wqe.position), 0) FROM WorshipQueueEntry wqe WHERE wqe.worshipRoom = :room")
    Integer getMaxPosition(@Param("room") WorshipRoom room);

    // Delete old completed entries
    @Query("DELETE FROM WorshipQueueEntry wqe WHERE wqe.status IN ('COMPLETED', 'SKIPPED') AND wqe.completedAt < :before")
    void deleteOldCompletedEntries(@Param("before") LocalDateTime before);
}
