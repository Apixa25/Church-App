package com.churchapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponse {
    
    private List<DashboardActivityItem> recentActivity;
    private DashboardStats stats;
    private List<QuickAction> quickActions;
    private NotificationSummary notifications;
    private LocalDateTime lastUpdated;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DashboardStats {
        private long totalMembers;
        private long newMembersThisWeek;
        private long totalPrayerRequests;
        private long activePrayerRequests;
        private long answeredPrayerRequests;
        private long upcomingEvents;
        private long unreadAnnouncements;
        private Map<String, Object> additionalStats;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuickAction {
        private String id;
        private String title;
        private String description;
        private String actionUrl;
        private String iconType;
        private String buttonText;
        private boolean requiresAuth;
        private String requiredRole; // null means all authenticated users
        
        public static QuickAction create(String id, String title, String description, String actionUrl, String iconType, String buttonText) {
            return new QuickAction(id, title, description, actionUrl, iconType, buttonText, true, null);
        }
        
        public static QuickAction createForRole(String id, String title, String description, String actionUrl, String iconType, String buttonText, String requiredRole) {
            return new QuickAction(id, title, description, actionUrl, iconType, buttonText, true, requiredRole);
        }
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NotificationSummary {
        private long totalUnread;
        private long prayerRequests;
        private long announcements;
        private long chatMessages;
        private long events;
        private List<NotificationPreview> previews;
        
        @Data
        @NoArgsConstructor
        @AllArgsConstructor
        public static class NotificationPreview {
            private String type;
            private String title;
            private String message;
            private LocalDateTime timestamp;
            private String actionUrl;
        }
    }
}