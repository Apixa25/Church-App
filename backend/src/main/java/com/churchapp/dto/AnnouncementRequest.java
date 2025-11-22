package com.churchapp.dto;

import com.churchapp.entity.Announcement;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AnnouncementRequest {
    
    @NotBlank(message = "Announcement title is required")
    @Size(min = 5, max = 200, message = "Announcement title must be between 5 and 200 characters")
    private String title;
    
    @NotBlank(message = "Announcement content is required")
    @Size(min = 10, max = 5000, message = "Announcement content must be between 10 and 5000 characters")
    private String content;
    
    @Size(max = 500, message = "Image URL cannot exceed 500 characters")
    private String imageUrl;
    
    private Boolean isPinned = false;
    
    private Announcement.AnnouncementCategory category = Announcement.AnnouncementCategory.GENERAL;
    
    // For PLATFORM_ADMIN: set to true to create system-wide announcement (visible to all organizations)
    private Boolean isSystemWide = false;
}