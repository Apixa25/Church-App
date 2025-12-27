package com.churchapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorshipRoomRequest {

    @NotBlank(message = "Room name is required")
    @Size(min = 2, max = 100, message = "Room name must be between 2 and 100 characters")
    private String name;

    @Size(max = 1000, message = "Description cannot exceed 1000 characters")
    private String description;

    private String imageUrl;

    private Boolean isPrivate = false;

    private Integer maxParticipants;

    private Double skipThreshold = 0.5; // Default 50%

    // Room type - LIVE (default), TEMPLATE, or LIVE_EVENT
    private String roomType = "LIVE";

    // === LIVE EVENT FIELDS ===
    private LocalDateTime scheduledStartTime;
    private LocalDateTime scheduledEndTime;
    private String liveStreamUrl;
    private Boolean autoStartEnabled = false;
    private Boolean autoCloseEnabled = true;

    // === TEMPLATE/PLAYLIST FIELDS ===
    private Boolean isTemplate = false;
    private Boolean allowUserStart = false;
    private UUID playlistId;

    // Validation methods
    public boolean isValidSkipThreshold() {
        return skipThreshold != null && skipThreshold >= 0.0 && skipThreshold <= 1.0;
    }

    public boolean isValidMaxParticipants() {
        return maxParticipants == null || maxParticipants > 0;
    }

    public boolean isLiveEventType() {
        return "LIVE_EVENT".equals(roomType);
    }

    public boolean isTemplateType() {
        return "TEMPLATE".equals(roomType);
    }

    public boolean isLiveType() {
        return "LIVE".equals(roomType) || roomType == null;
    }
}
