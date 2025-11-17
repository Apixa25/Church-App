package com.churchapp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MetricsDashboardResponse {

    private Summary summary;
    private List<TrendPoint> storageTrend;
    private List<TrendPoint> activeUsersTrend;
    private List<ContentTrendPoint> contentTrend;
    private List<TopOrganization> topOrganizations;
    private LocalDateTime lastUpdated;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Summary {
        private int totalOrganizations;
        private long totalStorageUsed;
        private long averageStoragePerOrganization;
        private long totalActiveUsers;
        private long totalApiRequests;
        private long totalDataTransferBytes;
        private long totalPosts;
        private long totalPrayerRequests;
        private long totalEvents;
        private long totalAnnouncements;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrendPoint {
        private LocalDate date;
        private long value;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ContentTrendPoint {
        private LocalDate date;
        private long posts;
        private long prayerRequests;
        private long events;
        private long announcements;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopOrganization {
        private UUID organizationId;
        private String organizationName;
        private long storageUsed;
        private long storagePercent;
        private int activeUsers;
        private long dataTransferBytes;
        private int postsCount;
        private int prayerRequestsCount;
        private int announcementsCount;
    }
}

