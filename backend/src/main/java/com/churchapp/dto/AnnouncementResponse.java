package com.churchapp.dto;

import com.churchapp.entity.Announcement;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AnnouncementResponse {
    
    private UUID id;
    private UUID userId;
    private String userName;
    private String userProfilePicUrl;
    private String userRole;
    private String title;
    private String content;
    private String imageUrl;
    private Boolean isPinned;
    private Announcement.AnnouncementCategory category;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    public static AnnouncementResponse fromAnnouncement(Announcement announcement) {
        return new AnnouncementResponse(
            announcement.getId(),
            announcement.getUser().getId(),
            announcement.getUser().getName(),
            announcement.getUser().getProfilePicUrl(),
            announcement.getUser().getRole().toString(),
            announcement.getTitle(),
            announcement.getContent(),
            announcement.getImageUrl(),
            announcement.getIsPinned(),
            announcement.getCategory(),
            announcement.getCreatedAt(),
            announcement.getUpdatedAt()
        );
    }
    
    // Simplified version for feed/list views
    public static AnnouncementResponse fromAnnouncementForFeed(Announcement announcement) {
        AnnouncementResponse response = fromAnnouncement(announcement);
        
        // Truncate content for feed view (first 200 characters)
        if (response.getContent() != null && response.getContent().length() > 200) {
            response.setContent(response.getContent().substring(0, 200) + "...");
        }
        
        return response;
    }
}