package com.churchapp.dto;

import com.churchapp.entity.WorshipPlaylist;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorshipPlaylistResponse {

    private UUID id;
    private String name;
    private String description;
    private String imageUrl;
    private UUID createdBy;
    private String createdByName;
    private String createdByProfilePic;
    private Boolean isPublic;
    private Boolean isActive;
    private Integer totalDuration;
    private Integer videoCount;
    private Integer playCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // User context
    private Boolean isCreator;
    private Boolean canEdit;
    private Boolean canDelete;

    // Playlist entries
    private List<WorshipPlaylistEntryResponse> entries = new ArrayList<>();

    // Constructor from entity (without entries)
    public WorshipPlaylistResponse(WorshipPlaylist playlist) {
        this.id = playlist.getId();
        this.name = playlist.getName();
        this.description = playlist.getDescription();
        this.imageUrl = playlist.getImageUrl();
        this.createdBy = playlist.getCreatedBy() != null ? playlist.getCreatedBy().getId() : null;
        this.createdByName = playlist.getCreatedBy() != null ? playlist.getCreatedBy().getName() : null;
        this.createdByProfilePic = playlist.getCreatedBy() != null ? playlist.getCreatedBy().getProfilePicUrl() : null;
        this.isPublic = playlist.getIsPublic();
        this.isActive = playlist.getIsActive();
        this.totalDuration = playlist.getTotalDuration();
        this.videoCount = playlist.getVideoCount();
        this.playCount = playlist.getPlayCount();
        this.createdAt = playlist.getCreatedAt();
        this.updatedAt = playlist.getUpdatedAt();
        this.isCreator = false;
        this.canEdit = false;
        this.canDelete = false;
    }

    // Constructor from entity with entries
    public WorshipPlaylistResponse(WorshipPlaylist playlist, boolean includeEntries) {
        this(playlist);
        if (includeEntries && playlist.getEntries() != null) {
            this.entries = playlist.getEntries().stream()
                .map(WorshipPlaylistEntryResponse::new)
                .collect(Collectors.toList());
        }
    }

    // Static factory methods
    public static WorshipPlaylistResponse fromEntity(WorshipPlaylist playlist) {
        return new WorshipPlaylistResponse(playlist);
    }

    public static WorshipPlaylistResponse fromEntityWithEntries(WorshipPlaylist playlist) {
        return new WorshipPlaylistResponse(playlist, true);
    }

    // Helper method to format duration as HH:MM:SS or MM:SS
    public String getFormattedDuration() {
        if (totalDuration == null || totalDuration == 0) {
            return "0:00";
        }
        int hours = totalDuration / 3600;
        int minutes = (totalDuration % 3600) / 60;
        int seconds = totalDuration % 60;

        if (hours > 0) {
            return String.format("%d:%02d:%02d", hours, minutes, seconds);
        }
        return String.format("%d:%02d", minutes, seconds);
    }
}
