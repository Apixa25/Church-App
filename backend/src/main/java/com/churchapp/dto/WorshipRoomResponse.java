package com.churchapp.dto;

import com.churchapp.entity.WorshipRoom;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorshipRoomResponse {

    private UUID id;
    private String name;
    private String description;
    private String imageUrl;
    private UUID createdBy;
    private String createdByName;
    private String createdByProfilePic;
    private UUID currentLeaderId;
    private String currentLeaderName;
    private String currentLeaderProfilePic;
    private String currentVideoId;
    private String currentVideoTitle;
    private String currentVideoThumbnail;
    private String playbackStatus;
    private Double playbackPosition;
    private LocalDateTime playbackStartedAt;
    private Boolean isActive;
    private Boolean isPrivate;
    private Integer maxParticipants;
    private Long participantCount;
    private Double skipThreshold;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // User context
    private Boolean isParticipant;
    private Boolean isCreator;
    private Boolean isCurrentLeader;
    private Boolean canJoin;
    private String userRole; // LISTENER, DJ, LEADER, MODERATOR
    private Boolean isInWaitlist;
    private Integer waitlistPosition;
    private Boolean canEdit;
    private Boolean canDelete;

    // Constructor from entity
    public WorshipRoomResponse(WorshipRoom room) {
        this.id = room.getId();
        this.name = room.getName();
        this.description = room.getDescription();
        this.imageUrl = room.getImageUrl();
        this.createdBy = room.getCreatedBy() != null ? room.getCreatedBy().getId() : null;
        this.createdByName = room.getCreatedBy() != null ? room.getCreatedBy().getName() : null;
        this.createdByProfilePic = room.getCreatedBy() != null ? room.getCreatedBy().getProfilePicUrl() : null;
        this.currentLeaderId = room.getCurrentLeader() != null ? room.getCurrentLeader().getId() : null;
        this.currentLeaderName = room.getCurrentLeader() != null ? room.getCurrentLeader().getName() : null;
        this.currentLeaderProfilePic = room.getCurrentLeader() != null ? room.getCurrentLeader().getProfilePicUrl() : null;
        this.currentVideoId = room.getCurrentVideoId();
        this.currentVideoTitle = room.getCurrentVideoTitle();
        this.currentVideoThumbnail = room.getCurrentVideoThumbnail();
        this.playbackStatus = room.getPlaybackStatus();
        this.playbackPosition = room.getPlaybackPosition();
        this.playbackStartedAt = room.getPlaybackStartedAt();
        this.isActive = room.getIsActive();
        this.isPrivate = room.getIsPrivate();
        this.maxParticipants = room.getMaxParticipants();
        this.participantCount = room.getActiveParticipantCount();
        this.skipThreshold = room.getSkipThreshold();
        this.createdAt = room.getCreatedAt();
        this.updatedAt = room.getUpdatedAt();
        this.canEdit = false;
        this.canDelete = false;
    }

    // Static factory methods
    public static WorshipRoomResponse fromEntity(WorshipRoom room) {
        return new WorshipRoomResponse(room);
    }

    // Helper methods
    public boolean isPlaying() {
        return "playing".equals(playbackStatus);
    }

    public boolean isPaused() {
        return "paused".equals(playbackStatus);
    }

    public boolean isStopped() {
        return "stopped".equals(playbackStatus);
    }

    public boolean isFull() {
        return maxParticipants != null && participantCount != null && participantCount >= maxParticipants;
    }

    public boolean hasCurrentSong() {
        return currentVideoId != null && !currentVideoId.trim().isEmpty();
    }
}
