package com.churchapp.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "worship_rooms", indexes = {
    @Index(name = "idx_worship_room_created_by", columnList = "created_by"),
    @Index(name = "idx_worship_room_is_active", columnList = "is_active"),
    @Index(name = "idx_worship_room_created_at", columnList = "created_at"),
    @Index(name = "idx_worship_room_type", columnList = "room_type"),
    @Index(name = "idx_worship_room_scheduled_start", columnList = "scheduled_start_time")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class WorshipRoom {

    public enum RoomType {
        LIVE,           // Original behavior - leader controls, everyone syncs (plug.dj style)
        TEMPLATE,       // Saved playlist that anyone can start
        LIVE_EVENT      // YouTube live stream with scheduling
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @NotBlank(message = "Room name is required")
    @Size(min = 2, max = 100, message = "Room name must be between 2 and 100 characters")
    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    // Room type - determines behavior
    @Enumerated(EnumType.STRING)
    @Column(name = "room_type", length = 20)
    private RoomType roomType = RoomType.LIVE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", referencedColumnName = "id", nullable = false)
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_leader_id", referencedColumnName = "id")
    private User currentLeader;

    @Column(name = "current_video_id", length = 100)
    private String currentVideoId; // YouTube video ID

    @Column(name = "current_video_title", length = 500)
    private String currentVideoTitle;

    @Column(name = "current_video_thumbnail", length = 500)
    private String currentVideoThumbnail;

    @Column(name = "playback_status", length = 20)
    private String playbackStatus = "stopped"; // playing, paused, stopped

    @Column(name = "playback_position")
    private Double playbackPosition = 0.0; // Current playback position in seconds

    @Column(name = "playback_started_at")
    private LocalDateTime playbackStartedAt;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "is_private", nullable = false)
    private Boolean isPrivate = false;

    @Column(name = "max_participants")
    private Integer maxParticipants;

    @Column(name = "skip_threshold")
    private Double skipThreshold = 0.5; // 50% of participants needed to skip

    // === LIVE EVENT FIELDS ===
    @Column(name = "scheduled_start_time")
    private LocalDateTime scheduledStartTime;

    @Column(name = "scheduled_end_time")
    private LocalDateTime scheduledEndTime;

    @Column(name = "live_stream_url", length = 500)
    private String liveStreamUrl;

    @Column(name = "is_live_stream_active")
    private Boolean isLiveStreamActive = false;

    @Column(name = "auto_start_enabled")
    private Boolean autoStartEnabled = false;

    @Column(name = "auto_close_enabled")
    private Boolean autoCloseEnabled = true;

    // === TEMPLATE FIELDS ===
    @Column(name = "is_template")
    private Boolean isTemplate = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_source_id", referencedColumnName = "id")
    private WorshipRoom templateSource;

    @Column(name = "allow_user_start")
    private Boolean allowUserStart = false;

    // === PLAYLIST FIELDS ===
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "playlist_id", referencedColumnName = "id")
    private WorshipPlaylist playlist;

    @Column(name = "current_playlist_position")
    private Integer currentPlaylistPosition = 0;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Relationship mappings
    @OneToMany(mappedBy = "worshipRoom", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Set<WorshipRoomParticipant> participants = new HashSet<>();

    @OneToMany(mappedBy = "worshipRoom", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Set<WorshipQueueEntry> queueEntries = new HashSet<>();

    @OneToMany(mappedBy = "worshipRoom", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Set<WorshipPlayHistory> playHistory = new HashSet<>();

    // Helper methods
    public boolean isParticipant(User user) {
        return participants.stream()
            .anyMatch(participant -> participant.getUser().equals(user) && participant.getIsActive());
    }

    public boolean isCreator(User user) {
        return createdBy != null && createdBy.equals(user);
    }

    public boolean isCurrentLeader(User user) {
        return currentLeader != null && currentLeader.equals(user);
    }

    public boolean canUserJoin(User user) {
        if (!isActive) return false;
        if (isPrivate && !isCreator(user)) return false;
        if (maxParticipants != null && getActiveParticipantCount() >= maxParticipants) return false;
        return !isParticipant(user);
    }

    public long getActiveParticipantCount() {
        return participants.stream()
            .filter(participant -> participant.getIsActive())
            .count();
    }

    public boolean isPlaying() {
        return "playing".equals(playbackStatus);
    }

    public boolean isPaused() {
        return "paused".equals(playbackStatus);
    }

    public boolean isStopped() {
        return "stopped".equals(playbackStatus);
    }

    public void play(String videoId, String videoTitle, String videoThumbnail, User leader) {
        this.currentVideoId = videoId;
        this.currentVideoTitle = videoTitle;
        this.currentVideoThumbnail = videoThumbnail;
        this.currentLeader = leader;
        this.playbackStatus = "playing";
        this.playbackPosition = 0.0;
        this.playbackStartedAt = LocalDateTime.now();
    }

    public void pause(double position) {
        this.playbackStatus = "paused";
        this.playbackPosition = position;
    }

    public void resume() {
        this.playbackStatus = "playing";
        this.playbackStartedAt = LocalDateTime.now();
    }

    public void stop() {
        this.playbackStatus = "stopped";
        this.playbackPosition = 0.0;
        this.currentVideoId = null;
        this.currentVideoTitle = null;
        this.currentVideoThumbnail = null;
        this.playbackStartedAt = null;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        WorshipRoom that = (WorshipRoom) o;
        return id != null && Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
