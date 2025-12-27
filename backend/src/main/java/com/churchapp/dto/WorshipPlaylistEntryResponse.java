package com.churchapp.dto;

import com.churchapp.entity.WorshipPlaylistEntry;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorshipPlaylistEntryResponse {

    private UUID id;
    private UUID playlistId;
    private String videoId;
    private String videoTitle;
    private Integer videoDuration;
    private String videoThumbnailUrl;
    private Integer position;
    private UUID addedBy;
    private String addedByName;
    private String addedByProfilePic;
    private LocalDateTime createdAt;

    // Constructor from entity
    public WorshipPlaylistEntryResponse(WorshipPlaylistEntry entry) {
        this.id = entry.getId();
        this.playlistId = entry.getPlaylist() != null ? entry.getPlaylist().getId() : null;
        this.videoId = entry.getVideoId();
        this.videoTitle = entry.getVideoTitle();
        this.videoDuration = entry.getVideoDuration();
        this.videoThumbnailUrl = entry.getVideoThumbnailUrl();
        this.position = entry.getPosition();
        this.addedBy = entry.getAddedBy() != null ? entry.getAddedBy().getId() : null;
        this.addedByName = entry.getAddedBy() != null ? entry.getAddedBy().getName() : null;
        this.addedByProfilePic = entry.getAddedBy() != null ? entry.getAddedBy().getProfilePicUrl() : null;
        this.createdAt = entry.getCreatedAt();
    }

    // Static factory method
    public static WorshipPlaylistEntryResponse fromEntity(WorshipPlaylistEntry entry) {
        return new WorshipPlaylistEntryResponse(entry);
    }

    // Helper method to format duration as MM:SS
    public String getFormattedDuration() {
        if (videoDuration == null || videoDuration == 0) {
            return "0:00";
        }
        int minutes = videoDuration / 60;
        int seconds = videoDuration % 60;
        return String.format("%d:%02d", minutes, seconds);
    }
}
