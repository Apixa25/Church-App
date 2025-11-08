package com.churchapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

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

    // Validation methods
    public boolean isValidSkipThreshold() {
        return skipThreshold != null && skipThreshold >= 0.0 && skipThreshold <= 1.0;
    }

    public boolean isValidMaxParticipants() {
        return maxParticipants == null || maxParticipants > 0;
    }
}
