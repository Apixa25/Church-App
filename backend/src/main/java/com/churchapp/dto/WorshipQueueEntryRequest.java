package com.churchapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorshipQueueEntryRequest {

    @NotNull(message = "Room ID is required")
    private UUID roomId;

    @NotBlank(message = "Video ID is required")
    @Size(max = 100, message = "Video ID cannot exceed 100 characters")
    private String videoId;

    @NotBlank(message = "Video title is required")
    @Size(max = 500, message = "Video title cannot exceed 500 characters")
    private String videoTitle;

    @Positive(message = "Video duration must be positive")
    private Integer videoDuration; // in seconds

    @Size(max = 500, message = "Thumbnail URL cannot exceed 500 characters")
    private String videoThumbnailUrl;

    // Validation methods
    public boolean isValidDuration() {
        return videoDuration != null && videoDuration > 0;
    }

    public boolean isYouTubeVideoId() {
        // Basic YouTube video ID validation (11 characters)
        return videoId != null && videoId.matches("^[a-zA-Z0-9_-]{11}$");
    }
}
