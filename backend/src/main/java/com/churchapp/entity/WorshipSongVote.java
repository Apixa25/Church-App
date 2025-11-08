package com.churchapp.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "worship_song_votes",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_worship_vote", columnNames = {"queue_entry_id", "user_id", "vote_type"})
    },
    indexes = {
        @Index(name = "idx_worship_vote_entry", columnList = "queue_entry_id"),
        @Index(name = "idx_worship_vote_user", columnList = "user_id"),
        @Index(name = "idx_worship_vote_type", columnList = "vote_type")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorshipSongVote {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "queue_entry_id", referencedColumnName = "id", nullable = false)
    private WorshipQueueEntry queueEntry;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", referencedColumnName = "id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "vote_type", nullable = false)
    private VoteType voteType;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum VoteType {
        UPVOTE("Upvote"),       // Like/Amen/Praise
        SKIP("Skip");           // Request to skip song

        private final String displayName;

        VoteType(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }

    // Static factory methods
    public static WorshipSongVote createUpvote(WorshipQueueEntry queueEntry, User user) {
        WorshipSongVote vote = new WorshipSongVote();
        vote.setQueueEntry(queueEntry);
        vote.setUser(user);
        vote.setVoteType(VoteType.UPVOTE);
        return vote;
    }

    public static WorshipSongVote createSkipVote(WorshipQueueEntry queueEntry, User user) {
        WorshipSongVote vote = new WorshipSongVote();
        vote.setQueueEntry(queueEntry);
        vote.setUser(user);
        vote.setVoteType(VoteType.SKIP);
        return vote;
    }
}
