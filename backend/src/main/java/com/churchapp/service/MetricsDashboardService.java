package com.churchapp.service;

import com.churchapp.dto.MetricsDashboardResponse;
import com.churchapp.entity.Organization;
import com.churchapp.entity.OrganizationMetrics;
import com.churchapp.entity.OrganizationMetricsHistory;
import com.churchapp.repository.OrganizationMetricsHistoryRepository;
import com.churchapp.repository.OrganizationMetricsRepository;
import com.churchapp.repository.OrganizationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class MetricsDashboardService {

    private final OrganizationRepository organizationRepository;
    private final OrganizationMetricsRepository metricsRepository;
    private final OrganizationMetricsHistoryRepository historyRepository;

    public MetricsDashboardResponse getDashboardMetrics(int days) {
        int clampedDays = Math.max(7, Math.min(days, 180));
        LocalDateTime since = LocalDateTime.now().minusDays(clampedDays);

        List<Organization> organizations = organizationRepository.findAll();
        Map<UUID, Organization> orgMap = organizations.stream()
                .collect(Collectors.toMap(Organization::getId, org -> org));

        List<OrganizationMetrics> metricsList = metricsRepository.findAll();
        metricsList = metricsList.stream()
                .filter(metrics -> {
                    Organization org = metrics.getOrganization();
                    return org != null && org.getDeletedAt() == null;
                })
                .collect(Collectors.toList());

        MetricsDashboardResponse.Summary summary = buildSummary(metricsList);
        List<MetricsDashboardResponse.TopOrganization> topOrganizations = buildTopOrganizations(metricsList, orgMap);

        List<OrganizationMetricsHistory> historyEntries = historyRepository.findByRecordedAtAfter(since);
        List<MetricsDashboardResponse.TrendPoint> storageTrend = buildStorageTrend(historyEntries);
        List<MetricsDashboardResponse.TrendPoint> activeUsersTrend = buildActiveUsersTrend(historyEntries);
        List<MetricsDashboardResponse.ContentTrendPoint> contentTrend = buildContentTrend(historyEntries);

        return MetricsDashboardResponse.builder()
                .summary(summary)
                .storageTrend(storageTrend)
                .activeUsersTrend(activeUsersTrend)
                .contentTrend(contentTrend)
                .topOrganizations(topOrganizations)
                .lastUpdated(LocalDateTime.now())
                .build();
    }

    private MetricsDashboardResponse.Summary buildSummary(List<OrganizationMetrics> metricsList) {
        int totalOrganizations = metricsList.size();

        long totalStorageUsed = metricsList.stream()
                .mapToLong(metrics -> Optional.ofNullable(metrics.getStorageUsed()).orElse(0L))
                .sum();

        long totalActiveUsers = metricsList.stream()
                .mapToLong(metrics -> Optional.ofNullable(metrics.getActiveUsersCount()).orElse(0))
                .sum();

        long totalApiRequests = metricsList.stream()
                .mapToLong(metrics -> Optional.ofNullable(metrics.getApiRequestsCount()).orElse(0))
                .sum();

        long totalDataTransfer = metricsList.stream()
                .mapToLong(metrics -> Optional.ofNullable(metrics.getDataTransferBytes()).orElse(0L))
                .sum();

        long totalPosts = metricsList.stream()
                .mapToLong(metrics -> Optional.ofNullable(metrics.getPostsCount()).orElse(0))
                .sum();

        long totalPrayers = metricsList.stream()
                .mapToLong(metrics -> Optional.ofNullable(metrics.getPrayerRequestsCount()).orElse(0))
                .sum();

        long totalEvents = metricsList.stream()
                .mapToLong(metrics -> Optional.ofNullable(metrics.getEventsCount()).orElse(0))
                .sum();

        long totalAnnouncements = metricsList.stream()
                .mapToLong(metrics -> Optional.ofNullable(metrics.getAnnouncementsCount()).orElse(0))
                .sum();

        long averageStorage = totalOrganizations > 0 ? totalStorageUsed / totalOrganizations : 0;

        return MetricsDashboardResponse.Summary.builder()
                .totalOrganizations(totalOrganizations)
                .totalStorageUsed(totalStorageUsed)
                .averageStoragePerOrganization(averageStorage)
                .totalActiveUsers(totalActiveUsers)
                .totalApiRequests(totalApiRequests)
                .totalDataTransferBytes(totalDataTransfer)
                .totalPosts(totalPosts)
                .totalPrayerRequests(totalPrayers)
                .totalEvents(totalEvents)
                .totalAnnouncements(totalAnnouncements)
                .build();
    }

    private List<MetricsDashboardResponse.TopOrganization> buildTopOrganizations(
            List<OrganizationMetrics> metricsList,
            Map<UUID, Organization> orgMap
    ) {
        long totalStorage = metricsList.stream()
                .mapToLong(metrics -> Optional.ofNullable(metrics.getStorageUsed()).orElse(0L))
                .sum();

        return metricsList.stream()
                .sorted(Comparator.comparingLong((OrganizationMetrics m) -> Optional.ofNullable(m.getStorageUsed()).orElse(0L))
                        .reversed())
                .limit(5)
                .map(metrics -> {
                    Organization org = orgMap.get(metrics.getOrganization().getId());
                    long storage = Optional.ofNullable(metrics.getStorageUsed()).orElse(0L);
                    long storagePercent = totalStorage > 0 ? (storage * 100) / totalStorage : 0;

                    return MetricsDashboardResponse.TopOrganization.builder()
                            .organizationId(metrics.getOrganization().getId())
                            .organizationName(org != null ? org.getName() : "Unknown")
                            .storageUsed(storage)
                            .storagePercent(storagePercent)
                            .activeUsers(Optional.ofNullable(metrics.getActiveUsersCount()).orElse(0))
                            .dataTransferBytes(Optional.ofNullable(metrics.getDataTransferBytes()).orElse(0L))
                            .postsCount(Optional.ofNullable(metrics.getPostsCount()).orElse(0))
                            .prayerRequestsCount(Optional.ofNullable(metrics.getPrayerRequestsCount()).orElse(0))
                            .announcementsCount(Optional.ofNullable(metrics.getAnnouncementsCount()).orElse(0))
                            .build();
                })
                .collect(Collectors.toList());
    }

    private List<MetricsDashboardResponse.TrendPoint> buildStorageTrend(List<OrganizationMetricsHistory> historyEntries) {
        Map<LocalDate, Long> grouped = new TreeMap<>();

        for (OrganizationMetricsHistory history : historyEntries) {
            LocalDate date = history.getRecordedAt().toLocalDate();
            long storage = getLongValue(history.getMetricsSnapshot().get("storageUsed"));
            grouped.merge(date, storage, Long::sum);
        }

        return grouped.entrySet().stream()
                .map(entry -> MetricsDashboardResponse.TrendPoint.builder()
                        .date(entry.getKey())
                        .value(entry.getValue())
                        .build())
                .collect(Collectors.toList());
    }

    private List<MetricsDashboardResponse.TrendPoint> buildActiveUsersTrend(List<OrganizationMetricsHistory> historyEntries) {
        Map<LocalDate, Long> grouped = new TreeMap<>();

        for (OrganizationMetricsHistory history : historyEntries) {
            LocalDate date = history.getRecordedAt().toLocalDate();
            long activeUsers = getLongValue(history.getMetricsSnapshot().get("activeUsersCount"));
            grouped.merge(date, activeUsers, Long::sum);
        }

        return grouped.entrySet().stream()
                .map(entry -> MetricsDashboardResponse.TrendPoint.builder()
                        .date(entry.getKey())
                        .value(entry.getValue())
                        .build())
                .collect(Collectors.toList());
    }

    private List<MetricsDashboardResponse.ContentTrendPoint> buildContentTrend(List<OrganizationMetricsHistory> historyEntries) {
        Map<LocalDate, ContentAccumulator> grouped = new TreeMap<>();

        for (OrganizationMetricsHistory history : historyEntries) {
            LocalDate date = history.getRecordedAt().toLocalDate();
            ContentAccumulator accumulator = grouped.computeIfAbsent(date, d -> new ContentAccumulator());

            accumulator.posts += getLongValue(history.getMetricsSnapshot().get("postsCount"));
            accumulator.prayers += getLongValue(history.getMetricsSnapshot().get("prayerRequestsCount"));
            accumulator.events += getLongValue(history.getMetricsSnapshot().get("eventsCount"));
            accumulator.announcements += getLongValue(history.getMetricsSnapshot().get("announcementsCount"));
        }

        return grouped.entrySet().stream()
                .map(entry -> MetricsDashboardResponse.ContentTrendPoint.builder()
                        .date(entry.getKey())
                        .posts(entry.getValue().posts)
                        .prayerRequests(entry.getValue().prayers)
                        .events(entry.getValue().events)
                        .announcements(entry.getValue().announcements)
                        .build())
                .collect(Collectors.toList());
    }

    private long getLongValue(Object value) {
        if (value == null) {
            return 0L;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value instanceof String str) {
            try {
                return Long.parseLong(str);
            } catch (NumberFormatException ignored) {
                return 0L;
            }
        }
        return 0L;
    }

    private static class ContentAccumulator {
        long posts;
        long prayers;
        long events;
        long announcements;
    }
}

