package com.churchapp.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "worship_play_history", indexes = {
    @Index(name = "idx_worship_history_room", columnList = "worship_room_id"),
    @Index(name = "idx_worship_history_leader", columnList = "leader_id"),
    @Index(name = "idx_worship_history_played_at", columnList = "played_at"),
    @Index(name = "idx_worship_history_video_id", columnList = "video_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorshipPlayHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "worship_room_id", referencedColumnName = "id", nullable = false)
    private WorshipRoom worshipRoom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "leader_id", referencedColumnName = "id", nullable = false)
    private User leader;

    @Column(name = "video_id", nullable = false, length = 100)
    private String videoId; // YouTube video ID

    @Column(name = "video_title", nullable = false, length = 500)
    private String videoTitle;

    @Column(name = "video_duration")
    private Integer videoDuration; // Duration in seconds

    @Column(name = "video_thumbnail_url", length = 500)
    private String videoThumbnailUrl;

    @CreationTimestamp
    @Column(name = "played_at", nullable = false, updatable = false)
    private LocalDateTime playedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "was_skipped", nullable = false)
    private Boolean wasSkipped = false;

    @Column(name = "upvote_count")
    private Integer upvoteCount = 0;

    @Column(name = "skip_vote_count")
    private Integer skipVoteCount = 0;

    @Column(name = "participant_count")
    private Integer participantCount = 0; // Number of participants when song was played

    // Helper methods
    public void markAsCompleted(int upvotes, int skipVotes, int participants) {
        this.completedAt = LocalDateTime.now();
        this.wasSkipped = false;
        this.upvoteCount = upvotes;
        this.skipVoteCount = skipVotes;
        this.participantCount = participants;
    }

    public void markAsSkipped(int upvotes, int skipVotes, int participants) {
        this.completedAt = LocalDateTime.now();
        this.wasSkipped = true;
        this.upvoteCount = upvotes;
        this.skipVoteCount = skipVotes;
        this.participantCount = participants;
    }

    public double getSkipPercentage() {
        if (participantCount == 0) return 0.0;
        return (double) skipVoteCount / participantCount * 100.0;
    }

    public double getUpvotePercentage() {
        if (participantCount == 0) return 0.0;
        return (double) upvoteCount / participantCount * 100.0;
    }

    // Static factory method
    public static WorshipPlayHistory createFromQueueEntry(
            WorshipRoom room,
            User leader,
            WorshipQueueEntry queueEntry) {
        WorshipPlayHistory history = new WorshipPlayHistory();
        history.setWorshipRoom(room);
        history.setLeader(leader);
        history.setVideoId(queueEntry.getVideoId());
        history.setVideoTitle(queueEntry.getVideoTitle());
        history.setVideoDuration(queueEntry.getVideoDuration());
        history.setVideoThumbnailUrl(queueEntry.getVideoThumbnailUrl());
        return history;
    }
}
