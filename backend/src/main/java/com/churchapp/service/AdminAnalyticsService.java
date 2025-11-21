package com.churchapp.service;

import com.churchapp.dto.AdminAnalyticsResponse;
import com.churchapp.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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

    public AdminAnalyticsResponse getAnalytics(String timeRange) {
        LocalDateTime since = calculateSinceDate(timeRange);
        LocalDateTime now = LocalDateTime.now();

        log.info("Generating admin analytics for time range: {} (since: {})", timeRange, since);

        return AdminAnalyticsResponse.builder()
            // User metrics
            .totalUsers(userRepository.count())
            .activeUsers(userRepository.countByIsActiveAndDeletedAtIsNull(true))
            .newUsersToday(userRepository.countByCreatedAtAfter(now.truncatedTo(ChronoUnit.DAYS)))
            .newUsersThisWeek(userRepository.countByCreatedAtAfter(now.minusWeeks(1)))
            .newUsersThisMonth(userRepository.countByCreatedAtAfter(now.minusMonths(1)))
            .bannedUsers(userRepository.countByIsBannedTrue())

            // Content metrics
            .totalPosts(postRepository.count())
            .totalComments(getCommentsCount()) // TODO: Implement if comments are separate
            .totalPrayers(prayerRequestRepository.count())
            .totalAnnouncements(announcementRepository.count())
            .totalEvents(eventRepository.count())
            .totalResources(resourceRepository.count())

            // Activity metrics
            .postsToday(postRepository.countByCreatedAtAfter(now.truncatedTo(ChronoUnit.DAYS)))
            .commentsToday(0L) // TODO: Implement
            .prayersToday(prayerRequestRepository.countByCreatedAtAfter(now.truncatedTo(ChronoUnit.DAYS)))
            .activeChats(chatGroupRepository.count())
            .messagesThisWeek(messageRepository.countAllMessagesSince(now.minusWeeks(1)))

            // Moderation metrics
            .totalReports(0L) // TODO: Implement reports table
            .activeReports(0L)
            .resolvedReports(0L)
            .contentRemoved(0L) // TODO: Track from audit logs
            .warningsIssued(userRepository.sumWarningCounts())

            // Engagement metrics
            .averageUserActivity(calculateAverageUserActivity(since))
            .prayerEngagementRate(calculatePrayerEngagementRate())
            .eventAttendanceRate(calculateEventAttendanceRate())
            .topCategories(getTopCategories())

            // Financial metrics
            .totalDonations(getTotalDonations())
            .donationsThisMonth(getDonationsThisMonth())
            .uniqueDonors(getUniqueDonors())
            .averageDonation(getAverageDonation())

            // System metrics
            .totalAuditLogs(auditLogRepository.count())
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

    // Helper methods
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

    private double getTotalDonations() {
        try {
            Double total = donationRepository.sumAllAmounts();
            return total != null ? total : 0.0;
        } catch (Exception e) {
            log.warn("Error calculating total donations: {}", e.getMessage());
            return 0.0;
        }
    }

    private double getDonationsThisMonth() {
        try {
            LocalDateTime startOfMonth = LocalDateTime.now().withDayOfMonth(1).truncatedTo(ChronoUnit.DAYS);
            Double total = donationRepository.sumAmountsByTimestampAfter(startOfMonth);
            return total != null ? total : 0.0;
        } catch (Exception e) {
            log.warn("Error calculating this month's donations: {}", e.getMessage());
            return 0.0;
        }
    }

    private long getUniqueDonors() {
        try {
            return donationRepository.countDistinctDonors();
        } catch (Exception e) {
            log.warn("Error counting unique donors: {}", e.getMessage());
            return 0L;
        }
    }

    private double getAverageDonation() {
        try {
            Double avg = donationRepository.averageDonationAmount();
            return avg != null ? avg : 0.0;
        } catch (Exception e) {
            log.warn("Error calculating average donation: {}", e.getMessage());
            return 0.0;
        }
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