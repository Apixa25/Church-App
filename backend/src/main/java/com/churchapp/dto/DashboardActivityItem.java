package com.churchapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardActivityItem {
    
    private UUID id;
    private String type; // "user_joined", "profile_updated", "prayer_request", "announcement", etc.
    private String title;
    private String description;
    private String userDisplayName;
    private String userProfilePicUrl;
    private UUID userId;
    private LocalDateTime timestamp;
    private String actionUrl; // URL to navigate to for more details
    private String iconType; // Icon identifier for frontend
    private Object metadata; // Additional type-specific data
    
    // Builder pattern for easy construction
    public static DashboardActivityItem userJoined(UUID userId, String userName, String profilePicUrl, LocalDateTime timestamp) {
        return new DashboardActivityItem(
            UUID.randomUUID(),
            "user_joined",
            "New Member Joined",
            userName + " joined the church community",
            userName,
            profilePicUrl,
            userId,
            timestamp,
            "/profile/" + userId,
            "user_plus",
            null
        );
    }
    
    public static DashboardActivityItem profileUpdated(UUID userId, String userName, String profilePicUrl, LocalDateTime timestamp) {
        return new DashboardActivityItem(
            UUID.randomUUID(),
            "profile_updated",
            "Profile Updated",
            userName + " updated their profile",
            userName,
            profilePicUrl,
            userId,
            timestamp,
            "/profile/" + userId,
            "user_edit",
            null
        );
    }
    
    public static DashboardActivityItem systemActivity(String title, String description, String iconType) {
        return new DashboardActivityItem(
            UUID.randomUUID(),
            "system",
            title,
            description,
            "System",
            null,
            null,
            LocalDateTime.now(),
            null,
            iconType,
            null
        );
    }
}