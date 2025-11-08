package com.churchapp.dto;

import com.churchapp.entity.WorshipQueueEntry;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorshipQueueEntryResponse {

    private UUID id;
    private UUID roomId;
    private UUID userId;
    private String userName;
    private String userProfilePic;
    private String videoId;
    private String videoTitle;
    private Integer videoDuration;
    private String videoThumbnailUrl;
    private Integer position;
    private String status; // WAITING, PLAYING, COMPLETED, SKIPPED
    private Long upvoteCount;
    private Long skipVoteCount;
    private Boolean userHasUpvoted;
    private Boolean userHasVotedSkip;
    private LocalDateTime queuedAt;
    private LocalDateTime playedAt;
    private LocalDateTime completedAt;
    private LocalDateTime updatedAt;

    // Constructor from entity
    public WorshipQueueEntryResponse(WorshipQueueEntry entry) {
        this.id = entry.getId();
        this.roomId = entry.getWorshipRoom() != null ? entry.getWorshipRoom().getId() : null;
        this.userId = entry.getUser() != null ? entry.getUser().getId() : null;
        this.userName = entry.getUser() != null ? entry.getUser().getName() : null;
        this.userProfilePic = entry.getUser() != null ? entry.getUser().getProfilePicUrl() : null;
        this.videoId = entry.getVideoId();
        this.videoTitle = entry.getVideoTitle();
        this.videoDuration = entry.getVideoDuration();
        this.videoThumbnailUrl = entry.getVideoThumbnailUrl();
        this.position = entry.getPosition();
        this.status = entry.getStatus() != null ? entry.getStatus().name() : null;
        this.upvoteCount = entry.getUpvoteCount();
        this.skipVoteCount = entry.getSkipVoteCount();
        this.queuedAt = entry.getQueuedAt();
        this.playedAt = entry.getPlayedAt();
        this.completedAt = entry.getCompletedAt();
        this.updatedAt = entry.getUpdatedAt();
    }

    // Static factory method
    public static WorshipQueueEntryResponse fromEntity(WorshipQueueEntry entry) {
        return new WorshipQueueEntryResponse(entry);
    }

    // Helper methods
    public boolean isWaiting() {
        return "WAITING".equals(status);
    }

    public boolean isPlaying() {
        return "PLAYING".equals(status);
    }

    public boolean isCompleted() {
        return "COMPLETED".equals(status) || "SKIPPED".equals(status);
    }

    public String getFormattedDuration() {
        if (videoDuration == null) return "Unknown";
        int minutes = videoDuration / 60;
        int seconds = videoDuration % 60;
        return String.format("%d:%02d", minutes, seconds);
    }

    public double getUpvotePercentage() {
        long total = upvoteCount + skipVoteCount;
        if (total == 0) return 0.0;
        return (double) upvoteCount / total * 100.0;
    }
}
