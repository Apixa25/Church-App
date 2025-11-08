package com.churchapp.repository;

import com.churchapp.entity.User;
import com.churchapp.entity.WorshipPlayHistory;
import com.churchapp.entity.WorshipRoom;
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
public interface WorshipPlayHistoryRepository extends JpaRepository<WorshipPlayHistory, UUID> {

    // Find history for a room
    List<WorshipPlayHistory> findByWorshipRoomOrderByPlayedAtDesc(WorshipRoom worshipRoom);

    // Find history for a room with pagination
    Page<WorshipPlayHistory> findByWorshipRoomOrderByPlayedAtDesc(WorshipRoom worshipRoom, Pageable pageable);

    // Find history by leader
    List<WorshipPlayHistory> findByLeaderOrderByPlayedAtDesc(User leader);

    // Find recent history for a room
    @Query("SELECT wph FROM WorshipPlayHistory wph WHERE wph.worshipRoom = :room AND wph.playedAt > :since ORDER BY wph.playedAt DESC")
    List<WorshipPlayHistory> findRecentHistoryForRoom(@Param("room") WorshipRoom room, @Param("since") LocalDateTime since);

    // Find history by video ID
    List<WorshipPlayHistory> findByVideoIdOrderByPlayedAtDesc(String videoId);

    // Find skipped songs
    List<WorshipPlayHistory> findByWasSkippedTrueOrderByPlayedAtDesc();

    // Find skipped songs for a room
    @Query("SELECT wph FROM WorshipPlayHistory wph WHERE wph.worshipRoom = :room AND wph.wasSkipped = true ORDER BY wph.playedAt DESC")
    List<WorshipPlayHistory> findSkippedForRoom(@Param("room") WorshipRoom room);

    // Find most played videos
    @Query("SELECT wph.videoId, wph.videoTitle, COUNT(wph) as playCount FROM WorshipPlayHistory wph GROUP BY wph.videoId, wph.videoTitle ORDER BY playCount DESC")
    List<Object[]> findMostPlayedVideos(Pageable pageable);

    // Find most played videos in a room
    @Query("SELECT wph.videoId, wph.videoTitle, COUNT(wph) as playCount FROM WorshipPlayHistory wph WHERE wph.worshipRoom = :room GROUP BY wph.videoId, wph.videoTitle ORDER BY playCount DESC")
    List<Object[]> findMostPlayedVideosInRoom(@Param("room") WorshipRoom room, Pageable pageable);

    // Find popular leaders (most songs played)
    @Query("SELECT wph.leader, COUNT(wph) as songCount FROM WorshipPlayHistory wph GROUP BY wph.leader ORDER BY songCount DESC")
    List<Object[]> findPopularLeaders(Pageable pageable);

    // Count total songs played
    long count();

    // Count songs played in a room
    long countByWorshipRoom(WorshipRoom worshipRoom);

    // Count songs played by leader
    long countByLeader(User leader);

    // Count skipped songs
    long countByWasSkippedTrue();

    // Find recent history across all rooms
    @Query("SELECT wph FROM WorshipPlayHistory wph ORDER BY wph.playedAt DESC")
    List<WorshipPlayHistory> findRecentHistory(Pageable pageable);

    // Delete old history
    @Query("DELETE FROM WorshipPlayHistory wph WHERE wph.playedAt < :before")
    void deleteOldHistory(@Param("before") LocalDateTime before);

    // Get average upvote percentage for a room
    @Query("SELECT AVG(wph.upvoteCount * 1.0 / NULLIF(wph.participantCount, 0)) FROM WorshipPlayHistory wph WHERE wph.worshipRoom = :room")
    Double getAverageUpvotePercentage(@Param("room") WorshipRoom room);

    // Find history for a video in a room
    @Query("SELECT wph FROM WorshipPlayHistory wph WHERE wph.worshipRoom = :room AND wph.videoId = :videoId ORDER BY wph.playedAt DESC")
    List<WorshipPlayHistory> findHistoryForVideoInRoom(@Param("room") WorshipRoom room, @Param("videoId") String videoId);
}
