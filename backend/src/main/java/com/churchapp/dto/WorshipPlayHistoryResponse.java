package com.churchapp.dto;

import com.churchapp.entity.WorshipPlayHistory;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorshipPlayHistoryResponse {

    private UUID id;
    private String videoId;
    private String videoTitle;
    private Integer videoDuration;
    private String videoThumbnailUrl;
    private LocalDateTime playedAt;
    private LocalDateTime completedAt;
    private Boolean wasSkipped;
    private Integer upvoteCount;
    private Integer skipVoteCount;
    private Integer participantCount;
    private String leaderName;
    private String leaderProfilePic;
    private UUID leaderId;

    // Constructor from entity
    public WorshipPlayHistoryResponse(WorshipPlayHistory history) {
        this.id = history.getId();
        this.videoId = history.getVideoId();
        this.videoTitle = history.getVideoTitle();
        this.videoDuration = history.getVideoDuration();
        this.videoThumbnailUrl = history.getVideoThumbnailUrl();
        this.playedAt = history.getPlayedAt();
        this.completedAt = history.getCompletedAt();
        this.wasSkipped = history.getWasSkipped();
        this.upvoteCount = history.getUpvoteCount();
        this.skipVoteCount = history.getSkipVoteCount();
        this.participantCount = history.getParticipantCount();

        if (history.getLeader() != null) {
            this.leaderId = history.getLeader().getId();
            this.leaderName = history.getLeader().getName();
            this.leaderProfilePic = history.getLeader().getProfilePicUrl();
        }
    }

    // Static factory method
    public static WorshipPlayHistoryResponse fromEntity(WorshipPlayHistory history) {
        return new WorshipPlayHistoryResponse(history);
    }

    // Helper methods
    public String getFormattedDuration() {
        if (videoDuration == null) return "";
        int minutes = videoDuration / 60;
        int seconds = videoDuration % 60;
        return String.format("%d:%02d", minutes, seconds);
    }

    public double getUpvotePercentage() {
        int total = (upvoteCount != null ? upvoteCount : 0) + (skipVoteCount != null ? skipVoteCount : 0);
        if (total == 0) return 0.0;
        return (double) upvoteCount / total * 100.0;
    }
}
