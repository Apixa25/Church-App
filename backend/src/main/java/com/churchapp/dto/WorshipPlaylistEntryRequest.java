package com.churchapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorshipPlaylistEntryRequest {

    @NotBlank(message = "Video ID is required")
    @Size(max = 100, message = "Video ID cannot exceed 100 characters")
    private String videoId;

    @NotBlank(message = "Video title is required")
    @Size(max = 500, message = "Video title cannot exceed 500 characters")
    private String videoTitle;

    private Integer videoDuration; // Duration in seconds

    private String videoThumbnailUrl;

    private Integer position; // Optional - will be auto-assigned if not provided
}
