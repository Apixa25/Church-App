package com.churchapp.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "worship_room_participants",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_worship_participant", columnNames = {"worship_room_id", "user_id"})
    },
    indexes = {
        @Index(name = "idx_worship_participant_room", columnList = "worship_room_id"),
        @Index(name = "idx_worship_participant_user", columnList = "user_id"),
        @Index(name = "idx_worship_participant_role", columnList = "role"),
        @Index(name = "idx_worship_participant_active", columnList = "is_active")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class WorshipRoomParticipant {

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

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private ParticipantRole role = ParticipantRole.LISTENER;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "is_in_waitlist", nullable = false)
    private Boolean isInWaitlist = false;

    @Column(name = "waitlist_position")
    private Integer waitlistPosition; // Position in the DJ waitlist

    @CreationTimestamp
    @Column(name = "joined_at", nullable = false, updatable = false)
    private LocalDateTime joinedAt;

    @Column(name = "last_active_at", nullable = false)
    private LocalDateTime lastActiveAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "left_at")
    private LocalDateTime leftAt;

    public enum ParticipantRole {
        LISTENER("Listener"),        // Can join, vote, chat
        DJ("DJ"),                     // Can add songs to queue
        LEADER("Worship Leader"),     // Full control (play/pause/skip)
        MODERATOR("Moderator");       // Can manage room and participants

        private final String displayName;

        ParticipantRole(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }

        public boolean canControlPlayback() {
            return this == LEADER || this == MODERATOR;
        }

        public boolean canAddToQueue() {
            return this == DJ || this == LEADER || this == MODERATOR;
        }

        public boolean canModerateRoom() {
            return this == MODERATOR;
        }
    }

    // Helper methods
    public boolean canControlPlayback() {
        return isActive && role.canControlPlayback();
    }

    public boolean canAddToQueue() {
        return isActive && role.canAddToQueue();
    }

    public boolean canModerateRoom() {
        return isActive && role.canModerateRoom();
    }

    public void updateActivity() {
        this.lastActiveAt = LocalDateTime.now();
    }

    public void joinWaitlist(int position) {
        this.isInWaitlist = true;
        this.waitlistPosition = position;
    }

    public void leaveWaitlist() {
        this.isInWaitlist = false;
        this.waitlistPosition = null;
    }

    public void promoteToLeader() {
        this.role = ParticipantRole.LEADER;
        this.leaveWaitlist();
    }

    public void leave() {
        this.isActive = false;
        this.leftAt = LocalDateTime.now();
        this.leaveWaitlist();
    }

    public boolean isAfk(int timeoutMinutes) {
        if (lastActiveAt == null) {
            return false;
        }
        return lastActiveAt.isBefore(LocalDateTime.now().minusMinutes(timeoutMinutes));
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        WorshipRoomParticipant that = (WorshipRoomParticipant) o;
        return id != null && Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
