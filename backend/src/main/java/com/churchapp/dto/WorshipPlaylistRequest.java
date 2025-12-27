package com.churchapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorshipPlaylistRequest {

    @NotBlank(message = "Playlist name is required")
    @Size(min = 2, max = 100, message = "Playlist name must be between 2 and 100 characters")
    private String name;

    @Size(max = 1000, message = "Description cannot exceed 1000 characters")
    private String description;

    private String imageUrl;

    private Boolean isPublic = true;

    // Optional: Initial videos to add to the playlist
    private List<WorshipPlaylistEntryRequest> entries;
}
