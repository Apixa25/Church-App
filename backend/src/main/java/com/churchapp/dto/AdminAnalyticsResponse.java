package com.churchapp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminAnalyticsResponse {

    // User metrics
    private long totalUsers;
    private long activeUsers;
    private long newUsersToday;
    private long newUsersThisWeek;
    private long newUsersThisMonth;
    private long bannedUsers;

    // Content metrics
    private long totalPosts;
    private long totalComments;
    private long totalPrayers;
    private long totalAnnouncements;
    private long totalEvents;
    private long totalResources;

    // Activity metrics
    private long postsToday;
    private long commentsToday;
    private long prayersToday;
    private long activeChats;
    private long messagesThisWeek;

    // Moderation metrics
    private long totalReports;
    private long activeReports;
    private long resolvedReports;
    private long contentRemoved;
    private long warningsIssued;

    // Engagement metrics
    private double averageUserActivity;
    private double prayerEngagementRate;
    private double eventAttendanceRate;
    private Map<String, Long> topCategories;

    // Financial metrics
    private double totalDonations;
    private double donationsThisMonth;
    private long uniqueDonors;
    private double averageDonation;

    // System metrics
    private long totalAuditLogs;
    private Map<String, Long> auditActionCounts;
    private List<PopularContent> popularContent;
    private List<UserActivitySummary> topContributors;

    // Charts data
    private List<ChartDataPoint> userGrowthChart;
    private List<ChartDataPoint> activityChart;
    private List<ChartDataPoint> donationChart;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PopularContent {
        private String type;
        private String title;
        private String author;
        private long interactions;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserActivitySummary {
        private String userName;
        private String userEmail;
        private long totalContributions;
        private String primaryActivity;
        private LocalDateTime lastActive;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChartDataPoint {
        private String label;
        private long value;
        private LocalDateTime timestamp;
    }
}