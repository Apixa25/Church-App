package com.churchapp.service;

import com.churchapp.dto.AdminAnalyticsResponse;
import com.churchapp.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminAnalyticsService {

    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final PrayerRequestRepository prayerRequestRepository;
    private final AnnouncementRepository announcementRepository;
    private final EventRepository eventRepository;
    private final ResourceRepository resourceRepository;
    private final MessageRepository messageRepository;
    private final ChatGroupRepository chatGroupRepository;
    private final DonationRepository donationRepository;
    private final AuditLogRepository auditLogRepository;

    /**
     * Get analytics with optional organization filtering
     * @param organizationIds null for PLATFORM_ADMIN (all data), List<UUID> for ORG_ADMIN (org-specific data)
     */
    public AdminAnalyticsResponse getAnalytics(String timeRange, List<UUID> organizationIds) {
        LocalDateTime since = calculateSinceDate(timeRange);
        LocalDateTime now = LocalDateTime.now();

        boolean isPlatformAdmin = (organizationIds == null);
        
        log.info("🔒 Generating admin analytics for time range: {} (since: {}), scope: {}", 
            timeRange, since, isPlatformAdmin ? "PLATFORM (ALL)" : organizationIds.size() + " org(s)");

        return AdminAnalyticsResponse.builder()
            // User metrics (filtered by org for ORG_ADMIN)
            .totalUsers(countUsers(organizationIds))
            .activeUsers(countActiveUsers(organizationIds))
            .newUsersToday(countNewUsersSince(now.truncatedTo(ChronoUnit.DAYS), organizationIds))
            .newUsersThisWeek(countNewUsersSince(now.minusWeeks(1), organizationIds))
            .newUsersThisMonth(countNewUsersSince(now.minusMonths(1), organizationIds))
            .bannedUsers(countBannedUsers(organizationIds))

            // Content metrics (filtered by org for ORG_ADMIN)
            .totalPosts(countPosts(organizationIds))
            .totalComments(getCommentsCount()) // TODO: Filter by org
            .totalPrayers(countPrayers(organizationIds))
            .totalAnnouncements(countAnnouncements(organizationIds))
            .totalEvents(countEvents(organizationIds))
            .totalResources(countResources(organizationIds))

            // Activity metrics (filtered by org for ORG_ADMIN)
            .postsToday(countPostsSince(now.truncatedTo(ChronoUnit.DAYS), organizationIds))
            .commentsToday(0L) // TODO: Implement
            .prayersToday(countPrayersSince(now.truncatedTo(ChronoUnit.DAYS), organizationIds))
            .activeChats(countChats(organizationIds))
            .messagesThisWeek(countMessagesSince(now.minusWeeks(1), organizationIds))

            // Moderation metrics (filtered by org for ORG_ADMIN)
            .totalReports(0L) // TODO: Implement reports table
            .activeReports(0L)
            .resolvedReports(0L)
            .contentRemoved(0L) // TODO: Track from audit logs
            .warningsIssued(sumWarnings(organizationIds))

            // Engagement metrics
            .averageUserActivity(calculateAverageUserActivity(since))
            .prayerEngagementRate(calculatePrayerEngagementRate())
            .eventAttendanceRate(calculateEventAttendanceRate())
            .topCategories(getTopCategories())

            // Financial metrics (filtered by org for ORG_ADMIN)
            .totalDonations(getTotalDonations(organizationIds))
            .donationsThisMonth(getDonationsThisMonth(organizationIds))
            .uniqueDonors(getUniqueDonors(organizationIds))
            .averageDonation(getAverageDonation(organizationIds))

            // System metrics (Platform Admin only gets ALL audit logs, ORG_ADMIN gets filtered)
            .totalAuditLogs(isPlatformAdmin ? auditLogRepository.count() : 0L)
            .auditActionCounts(getAuditActionCounts(since))
            .popularContent(getPopularContent())
            .topContributors(getTopContributors())

            // Charts data
            .userGrowthChart(getUserGrowthChart(timeRange))
            .activityChart(getActivityChart(timeRange))
            .donationChart(getDonationChart(timeRange))

            .build();
    }

    public Map<String, Object> getUserAnalytics(String timeRange) {
        LocalDateTime since = calculateSinceDate(timeRange);
        Map<String, Object> analytics = new HashMap<>();

        analytics.put("totalUsers", userRepository.count());
        analytics.put("activeUsers", userRepository.countByIsActiveAndDeletedAtIsNull(true));
        analytics.put("bannedUsers", userRepository.countByIsBannedTrue());
        analytics.put("newUsers", userRepository.countByCreatedAtAfter(since));
        analytics.put("usersByRole", getUsersByRole());
        analytics.put("userGrowth", getUserGrowthChart(timeRange));

        return analytics;
    }

    public Map<String, Object> getContentAnalytics(String timeRange) {
        LocalDateTime since = calculateSinceDate(timeRange);
        Map<String, Object> analytics = new HashMap<>();

        analytics.put("totalPosts", postRepository.count());
        analytics.put("newPosts", postRepository.countByCreatedAtAfter(since));
        analytics.put("totalPrayers", prayerRequestRepository.count());
        analytics.put("newPrayers", prayerRequestRepository.countByCreatedAtAfter(since));
        analytics.put("totalAnnouncements", announcementRepository.count());
        analytics.put("totalEvents", eventRepository.count());
        analytics.put("totalResources", resourceRepository.count());
        analytics.put("contentByType", getContentByType());

        return analytics;
    }

    public Map<String, Object> getSystemHealth() {
        Map<String, Object> health = new HashMap<>();

        health.put("status", "UP");
        health.put("timestamp", LocalDateTime.now());
        health.put("database", "UP"); // TODO: Check actual DB connection
        health.put("totalUsers", userRepository.count());
        health.put("activeUsers", userRepository.countByIsActiveAndDeletedAtIsNull(true));
        health.put("systemLoad", "LOW"); // TODO: Get actual system metrics
        health.put("memoryUsage", "NORMAL"); // TODO: Get actual memory usage

        return health;
    }

    // =============== ORGANIZATION-AWARE COUNTING METHODS ===============
    // These methods filter by organization for ORG_ADMINs

    private long countUsers(List<UUID> orgIds) {
        if (orgIds == null) return userRepository.count(); // Platform Admin
        return userRepository.countUsersInOrganizations(orgIds);
    }

    private long countActiveUsers(List<UUID> orgIds) {
        if (orgIds == null) return userRepository.countByIsActiveAndDeletedAtIsNull(true);
        return userRepository.countActiveUsersInOrganizations(orgIds);
    }

    private long countNewUsersSince(LocalDateTime since, List<UUID> orgIds) {
        if (orgIds == null) return userRepository.countByCreatedAtAfter(since);
        return userRepository.countNewUsersInOrganizationsSince(orgIds, since);
    }

    private long countBannedUsers(List<UUID> orgIds) {
        if (orgIds == null) return userRepository.countByIsBannedTrue();
        return userRepository.countBannedUsersInOrganizations(orgIds);
    }

    private long countPosts(List<UUID> orgIds) {
        if (orgIds == null) return postRepository.count();
        return postRepository.countByOrganizationIdIn(orgIds);
    }

    private long countPostsSince(LocalDateTime since, List<UUID> orgIds) {
        if (orgIds == null) return postRepository.countByCreatedAtAfter(since);
        return postRepository.countByOrganizationIdInAndCreatedAtAfter(orgIds, since);
    }

    private long countPrayers(List<UUID> orgIds) {
        if (orgIds == null) return prayerRequestRepository.count();
        return prayerRequestRepository.countByOrganizationIdIn(orgIds);
    }

    private long countPrayersSince(LocalDateTime since, List<UUID> orgIds) {
        if (orgIds == null) return prayerRequestRepository.countByCreatedAtAfter(since);
        return prayerRequestRepository.countByOrganizationIdInAndCreatedAtAfter(orgIds, since);
    }

    private long countAnnouncements(List<UUID> orgIds) {
        if (orgIds == null) return announcementRepository.count();
        return announcementRepository.countByOrganizationIdIn(orgIds);
    }

    private long countEvents(List<UUID> orgIds) {
        if (orgIds == null) return eventRepository.count();
        return eventRepository.countByOrganizationIdIn(orgIds);
    }

    private long countResources(List<UUID> orgIds) {
        // Resources are currently global, not org-scoped
        return resourceRepository.count();
    }

    private long countChats(List<UUID> orgIds) {
        // Chat groups are currently global, not org-scoped
        return chatGroupRepository.count();
    }

    private long countMessagesSince(LocalDateTime since, List<UUID> orgIds) {
        // Messages are currently global, not org-scoped
        return messageRepository.countAllMessagesSince(since);
    }

    private Long sumWarnings(List<UUID> orgIds) {
        if (orgIds == null) return userRepository.sumWarningCounts();
        return userRepository.sumWarningCountsInOrganizations(orgIds);
    }

    private double getTotalDonations(List<UUID> orgIds) {
        try {
            Double total = orgIds == null ? 
                donationRepository.sumAllAmounts() : 
                donationRepository.sumAmountsByOrganizationIdIn(orgIds);
            return total != null ? total : 0.0;
        } catch (Exception e) {
            log.warn("Error calculating total donations: {}", e.getMessage());
            return 0.0;
        }
    }

    private double getDonationsThisMonth(List<UUID> orgIds) {
        try {
            LocalDateTime startOfMonth = LocalDateTime.now().withDayOfMonth(1).truncatedTo(ChronoUnit.DAYS);
            Double total = orgIds == null ? 
                donationRepository.sumAmountsByTimestampAfter(startOfMonth) :
                donationRepository.sumAmountsByOrganizationIdInAndTimestampAfter(orgIds, startOfMonth);
            return total != null ? total : 0.0;
        } catch (Exception e) {
            log.warn("Error calculating this month's donations: {}", e.getMessage());
            return 0.0;
        }
    }

    private long getUniqueDonors(List<UUID> orgIds) {
        try {
            return orgIds == null ? 
                donationRepository.countDistinctDonors() :
                donationRepository.countDistinctDonorsInOrganizations(orgIds);
        } catch (Exception e) {
            log.warn("Error counting unique donors: {}", e.getMessage());
            return 0L;
        }
    }

    private double getAverageDonation(List<UUID> orgIds) {
        try {
            Double avg = orgIds == null ? 
                donationRepository.averageDonationAmount() :
                donationRepository.averageDonationAmountInOrganizations(orgIds);
            return avg != null ? avg : 0.0;
        } catch (Exception e) {
            log.warn("Error calculating average donation: {}", e.getMessage());
            return 0.0;
        }
    }

    // =============== HELPER METHODS ===============
    
    private LocalDateTime calculateSinceDate(String timeRange) {
        LocalDateTime now = LocalDateTime.now();
        switch (timeRange.toLowerCase()) {
            case "1d": return now.minusDays(1);
            case "7d": return now.minusDays(7);
            case "30d": return now.minusDays(30);
            case "90d": return now.minusDays(90);
            case "1y": return now.minusYears(1);
            default: return now.minusDays(30);
        }
    }

    private long getCommentsCount() {
        // TODO: Implement when comments are separated from posts
        return 0L;
    }

    private double calculateAverageUserActivity(LocalDateTime since) {
        // TODO: Calculate based on posts, comments, prayers, etc.
        return 0.0;
    }

    private double calculatePrayerEngagementRate() {
        // TODO: Calculate prayer interactions / total prayers
        return 0.0;
    }

    private double calculateEventAttendanceRate() {
        // TODO: Calculate RSVPs / total events
        return 0.0;
    }

    private Map<String, Long> getTopCategories() {
        // TODO: Implement based on prayer categories, announcement categories, etc.
        return new HashMap<>();
    }

    private Map<String, Long> getAuditActionCounts(LocalDateTime since) {
        // TODO: Implement audit action counts
        return new HashMap<>();
    }

    private List<AdminAnalyticsResponse.PopularContent> getPopularContent() {
        // TODO: Implement popular content based on interactions
        return List.of();
    }

    private List<AdminAnalyticsResponse.UserActivitySummary> getTopContributors() {
        // TODO: Implement top contributors based on posts, prayers, etc.
        return List.of();
    }

    private List<AdminAnalyticsResponse.ChartDataPoint> getUserGrowthChart(String timeRange) {
        // TODO: Implement user growth chart data
        return List.of();
    }

    private List<AdminAnalyticsResponse.ChartDataPoint> getActivityChart(String timeRange) {
        // TODO: Implement activity chart data
        return List.of();
    }

    private List<AdminAnalyticsResponse.ChartDataPoint> getDonationChart(String timeRange) {
        // TODO: Implement donation chart data
        return List.of();
    }

    private Map<String, Long> getUsersByRole() {
        Map<String, Long> usersByRole = new HashMap<>();
        usersByRole.put("MEMBER", userRepository.countByRole(com.churchapp.entity.User.Role.USER));
        usersByRole.put("ADMIN", userRepository.countByRole(com.churchapp.entity.User.Role.PLATFORM_ADMIN));
        usersByRole.put("MODERATOR", userRepository.countByRole(com.churchapp.entity.User.Role.MODERATOR));
        return usersByRole;
    }

    private Map<String, Long> getContentByType() {
        Map<String, Long> contentByType = new HashMap<>();
        contentByType.put("posts", postRepository.count());
        contentByType.put("prayers", prayerRequestRepository.count());
        contentByType.put("announcements", announcementRepository.count());
        contentByType.put("events", eventRepository.count());
        contentByType.put("resources", resourceRepository.count());
        return contentByType;
    }
}