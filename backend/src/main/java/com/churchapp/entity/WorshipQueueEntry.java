package com.churchapp.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "worship_queue_entries", indexes = {
    @Index(name = "idx_worship_queue_room", columnList = "worship_room_id"),
    @Index(name = "idx_worship_queue_user", columnList = "user_id"),
    @Index(name = "idx_worship_queue_status", columnList = "status"),
    @Index(name = "idx_worship_queue_position", columnList = "position")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorshipQueueEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "worship_room_id", referencedColumnName = "id", nullable = false)
    private WorshipRoom worshipRoom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", referencedColumnName = "id", nullable = false)
    private User user;

    @NotBlank(message = "Video ID is required")
    @Column(name = "video_id", nullable = false, length = 100)
    private String videoId; // YouTube video ID

    @NotBlank(message = "Video title is required")
    @Size(max = 500, message = "Video title cannot exceed 500 characters")
    @Column(name = "video_title", nullable = false, length = 500)
    private String videoTitle;

    @Column(name = "video_duration")
    private Integer videoDuration; // Duration in seconds

    @Column(name = "video_thumbnail_url", length = 500)
    private String videoThumbnailUrl;

    @Column(name = "position", nullable = false)
    private Integer position; // Queue position (10000, 20000, 30000, etc.)

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private QueueStatus status = QueueStatus.WAITING;

    @CreationTimestamp
    @Column(name = "queued_at", nullable = false, updatable = false)
    private LocalDateTime queuedAt;

    @Column(name = "played_at")
    private LocalDateTime playedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Relationship mappings
    @OneToMany(mappedBy = "queueEntry", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Set<WorshipSongVote> votes = new HashSet<>();

    public enum QueueStatus {
        WAITING("Waiting in Queue"),
        PLAYING("Currently Playing"),
        COMPLETED("Completed"),
        SKIPPED("Skipped");

        private final String displayName;

        QueueStatus(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }

    // Helper methods
    public boolean canBeEditedBy(User editor) {
        if (status != QueueStatus.WAITING) {
            return false;
        }

        // User can edit their own queue entries
        if (user.equals(editor)) {
            return true;
        }

        // Room creator can edit any entry
        return worshipRoom.isCreator(editor);
    }

    public boolean canBeDeletedBy(User deleter) {
        // User can delete their own queue entries if not currently playing
        if (status != QueueStatus.PLAYING && user.equals(deleter)) {
            return true;
        }

        // Room creator can delete any entry
        return worshipRoom.isCreator(deleter);
    }

    public long getUpvoteCount() {
        return votes.stream()
            .filter(vote -> vote.getVoteType() == WorshipSongVote.VoteType.UPVOTE)
            .count();
    }

    public long getSkipVoteCount() {
        return votes.stream()
            .filter(vote -> vote.getVoteType() == WorshipSongVote.VoteType.SKIP)
            .count();
    }

    public boolean hasUserVoted(User user, WorshipSongVote.VoteType voteType) {
        return votes.stream()
            .anyMatch(vote -> vote.getUser().equals(user) && vote.getVoteType() == voteType);
    }

    public void markAsPlaying() {
        this.status = QueueStatus.PLAYING;
        this.playedAt = LocalDateTime.now();
    }

    public void markAsCompleted() {
        this.status = QueueStatus.COMPLETED;
        this.completedAt = LocalDateTime.now();
    }

    public void markAsSkipped() {
        this.status = QueueStatus.SKIPPED;
        this.completedAt = LocalDateTime.now();
    }
}
