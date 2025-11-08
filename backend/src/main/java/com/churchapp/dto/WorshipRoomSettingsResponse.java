package com.churchapp.dto;

import com.churchapp.entity.WorshipRoomSettings;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorshipRoomSettingsResponse {

    private UUID worshipRoomId;

    // Queue settings
    private Integer maxQueueSize;
    private Integer maxSongsPerUser;
    private Integer minSongDuration;
    private Integer maxSongDuration;

    // Voting settings
    private Double skipThreshold;
    private Boolean allowVoting;

    // Waitlist settings
    private Boolean enableWaitlist;
    private Integer maxWaitlistSize;
    private Integer afkTimeoutMinutes;

    // Room behavior settings
    private Boolean autoAdvanceQueue;
    private Boolean allowDuplicateSongs;
    private Integer songCooldownHours;
    private Boolean requireApproval;

    // Chat settings
    private Boolean enableChat;
    private Integer slowModeSeconds;

    // Moderation settings
    private String bannedVideoIds;
    private String allowedVideoCategories;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Constructor from entity
    public WorshipRoomSettingsResponse(WorshipRoomSettings settings) {
        this.worshipRoomId = settings.getWorshipRoomId();
        this.maxQueueSize = settings.getMaxQueueSize();
        this.maxSongsPerUser = settings.getMaxSongsPerUser();
        this.minSongDuration = settings.getMinSongDuration();
        this.maxSongDuration = settings.getMaxSongDuration();
        this.skipThreshold = settings.getSkipThreshold();
        this.allowVoting = settings.getAllowVoting();
        this.enableWaitlist = settings.getEnableWaitlist();
        this.maxWaitlistSize = settings.getMaxWaitlistSize();
        this.afkTimeoutMinutes = settings.getAfkTimeoutMinutes();
        this.autoAdvanceQueue = settings.getAutoAdvanceQueue();
        this.allowDuplicateSongs = settings.getAllowDuplicateSongs();
        this.songCooldownHours = settings.getSongCooldownHours();
        this.requireApproval = settings.getRequireApproval();
        this.enableChat = settings.getEnableChat();
        this.slowModeSeconds = settings.getSlowModeSeconds();
        this.bannedVideoIds = settings.getBannedVideoIds();
        this.allowedVideoCategories = settings.getAllowedVideoCategories();
        this.createdAt = settings.getCreatedAt();
        this.updatedAt = settings.getUpdatedAt();
    }

    // Static factory method
    public static WorshipRoomSettingsResponse fromEntity(WorshipRoomSettings settings) {
        return new WorshipRoomSettingsResponse(settings);
    }

    // Helper methods
    public String getFormattedMinDuration() {
        if (minSongDuration == null) return "None";
        int minutes = minSongDuration / 60;
        int seconds = minSongDuration % 60;
        return String.format("%d:%02d", minutes, seconds);
    }

    public String getFormattedMaxDuration() {
        if (maxSongDuration == null) return "None";
        int minutes = maxSongDuration / 60;
        int seconds = maxSongDuration % 60;
        return String.format("%d:%02d", minutes, seconds);
    }

    public boolean isSlowModeEnabled() {
        return slowModeSeconds != null && slowModeSeconds > 0;
    }
}
