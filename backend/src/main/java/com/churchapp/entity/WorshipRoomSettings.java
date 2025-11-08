package com.churchapp.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "worship_room_settings")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorshipRoomSettings {

    @Id
    @Column(name = "worship_room_id", updatable = false, nullable = false)
    private UUID worshipRoomId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "worship_room_id", referencedColumnName = "id")
    private WorshipRoom worshipRoom;

    // Queue settings
    @Column(name = "max_queue_size")
    private Integer maxQueueSize = 50;

    @Column(name = "max_songs_per_user")
    private Integer maxSongsPerUser = 5;

    @Column(name = "min_song_duration")
    private Integer minSongDuration = 60; // Minimum song duration in seconds (1 minute)

    @Column(name = "max_song_duration")
    private Integer maxSongDuration = 900; // Maximum song duration in seconds (15 minutes)

    // Voting settings
    @Column(name = "skip_threshold")
    private Double skipThreshold = 0.5; // 50% of participants needed to skip

    @Column(name = "allow_voting", nullable = false)
    private Boolean allowVoting = true;

    // Waitlist settings
    @Column(name = "enable_waitlist", nullable = false)
    private Boolean enableWaitlist = true;

    @Column(name = "max_waitlist_size")
    private Integer maxWaitlistSize = 20;

    @Column(name = "afk_timeout_minutes")
    private Integer afkTimeoutMinutes = 30; // Auto-kick from waitlist after inactivity

    // Room behavior settings
    @Column(name = "auto_advance_queue", nullable = false)
    private Boolean autoAdvanceQueue = true; // Automatically play next song when current ends

    @Column(name = "allow_duplicate_songs", nullable = false)
    private Boolean allowDuplicateSongs = false; // Prevent same song in queue multiple times

    @Column(name = "song_cooldown_hours")
    private Integer songCooldownHours = 1; // Hours before same song can be played again

    @Column(name = "require_approval", nullable = false)
    private Boolean requireApproval = false; // Moderator must approve songs before they enter queue

    // Chat settings
    @Column(name = "enable_chat", nullable = false)
    private Boolean enableChat = true;

    @Column(name = "slow_mode_seconds")
    private Integer slowModeSeconds = 0; // Minimum seconds between messages (0 = disabled)

    // Moderation settings
    @Column(name = "banned_video_ids", columnDefinition = "TEXT")
    private String bannedVideoIds; // JSON array of banned video IDs

    @Column(name = "allowed_video_categories", columnDefinition = "TEXT")
    private String allowedVideoCategories; // JSON array (e.g., ["Music", "Entertainment"])

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Helper methods
    public boolean isVideoAllowed(String videoId) {
        if (bannedVideoIds == null || bannedVideoIds.isEmpty()) {
            return true;
        }
        return !bannedVideoIds.contains(videoId);
    }

    public boolean isSongDurationValid(int durationSeconds) {
        if (minSongDuration != null && durationSeconds < minSongDuration) {
            return false;
        }
        if (maxSongDuration != null && durationSeconds > maxSongDuration) {
            return false;
        }
        return true;
    }

    public boolean canUserAddMoreSongs(int currentSongCount) {
        if (maxSongsPerUser == null) {
            return true;
        }
        return currentSongCount < maxSongsPerUser;
    }

    public boolean isQueueFull(int currentQueueSize) {
        if (maxQueueSize == null) {
            return false;
        }
        return currentQueueSize >= maxQueueSize;
    }

    public boolean isWaitlistFull(int currentWaitlistSize) {
        if (!enableWaitlist || maxWaitlistSize == null) {
            return false;
        }
        return currentWaitlistSize >= maxWaitlistSize;
    }

    // Static factory method
    public static WorshipRoomSettings createDefault(WorshipRoom room) {
        WorshipRoomSettings settings = new WorshipRoomSettings();
        settings.setWorshipRoom(room);
        settings.setMaxQueueSize(50);
        settings.setMaxSongsPerUser(5);
        settings.setMinSongDuration(60);
        settings.setMaxSongDuration(900);
        settings.setSkipThreshold(0.5);
        settings.setAllowVoting(true);
        settings.setEnableWaitlist(true);
        settings.setMaxWaitlistSize(20);
        settings.setAfkTimeoutMinutes(30);
        settings.setAutoAdvanceQueue(true);
        settings.setAllowDuplicateSongs(false);
        settings.setSongCooldownHours(1);
        settings.setRequireApproval(false);
        settings.setEnableChat(true);
        settings.setSlowModeSeconds(0);
        return settings;
    }
}
