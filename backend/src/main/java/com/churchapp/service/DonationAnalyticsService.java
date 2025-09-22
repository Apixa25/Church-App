package com.churchapp.service;

import com.churchapp.dto.*;
import com.churchapp.entity.Donation;
import com.churchapp.entity.DonationCategory;
import com.churchapp.entity.User;
import com.churchapp.repository.DonationRepository;
import com.churchapp.repository.DonationSubscriptionRepository;
import com.churchapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DonationAnalyticsService {

    private final DonationRepository donationRepository;
    private final DonationSubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;

    /**
     * Get comprehensive donation analytics
     */
    public DonationAnalyticsResponse getAnalytics(String dateRange, String startDateStr, String endDateStr) {
        log.info("Getting analytics for date range: {}", dateRange);

        // Parse date range
        LocalDateTime[] dates = parseDateRange(dateRange, startDateStr, endDateStr);
        LocalDateTime startDate = dates[0];
        LocalDateTime endDate = dates[1];

        // Get current period data
        List<Donation> currentDonations = donationRepository.findByTimestampBetween(startDate, endDate);

        // Get previous period for comparison
        LocalDateTime[] previousDates = getPreviousPeriod(startDate, endDate);
        List<Donation> previousDonations = donationRepository.findByTimestampBetween(previousDates[0], previousDates[1]);

        // Build analytics response
        DonationAnalyticsResponse analytics = new DonationAnalyticsResponse();

        // Core metrics
        analytics.setTotalDonations(currentDonations.size());
        analytics.setTotalAmount(calculateTotalAmount(currentDonations));
        analytics.setAverageDonation(calculateAverageDonation(currentDonations));
        analytics.setDonorCount(calculateUniqueDonors(currentDonations));

        // Recurring donations
        analytics.setRecurringDonations(countRecurringDonations(currentDonations));
        analytics.setRecurringAmount(calculateRecurringAmount(currentDonations));

        // Category breakdown
        analytics.setCategoryBreakdown(buildCategoryBreakdown(currentDonations));

        // Monthly trends
        analytics.setMonthlyTrends(buildMonthlyTrends(startDate, endDate));

        // Top donors (limited for this response)
        analytics.setTopDonors(buildTopDonors(currentDonations, 5));

        // Recent donations
        analytics.setRecentDonations(buildRecentDonations(currentDonations, 10));

        // Period comparison
        analytics.setPeriodComparison(buildPeriodComparison(currentDonations, previousDonations));

        // Meta information
        analytics.setDateRange(dateRange);
        analytics.setStartDate(startDate);
        analytics.setEndDate(endDate);

        return analytics;
    }

    /**
     * Get top donors with pagination
     */
    public Page<TopDonorResponse> getTopDonors(Pageable pageable) {
        log.info("Getting top donors with pagination: {}", pageable);

        // Get all donations grouped by user
        List<Object[]> donorStats = donationRepository.findDonorStatistics();

        List<TopDonorResponse> topDonors = donorStats.stream()
            .map(this::mapToTopDonorResponse)
            .sorted((a, b) -> b.getTotalAmount().compareTo(a.getTotalAmount()))
            .collect(Collectors.toList());

        // Apply pagination manually (for simplicity - in production you'd use database pagination)
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), topDonors.size());
        List<TopDonorResponse> pageContent = topDonors.subList(start, end);

        return new PageImpl<>(pageContent, pageable, topDonors.size());
    }

    /**
     * Export donation data
     */
    public byte[] exportDonations(String format, String dateRange, String startDateStr, String endDateStr) {
        log.info("Exporting donations: format={}, dateRange={}", format, dateRange);

        LocalDateTime[] dates = parseDateRange(dateRange, startDateStr, endDateStr);
        List<Donation> donations = donationRepository.findByTimestampBetween(dates[0], dates[1]);

        if ("xlsx".equals(format)) {
            return exportToExcel(donations);
        } else {
            return exportToCsv(donations);
        }
    }

    /**
     * Get donation trends
     */
    public DonationAnalyticsResponse getTrends(String period, String groupBy) {
        log.info("Getting donation trends: period={}, groupBy={}", period, groupBy);

        // For now, return basic analytics
        return getAnalytics(period, null, null);
    }

    /**
     * Get donation summary for specific criteria
     */
    public DonationAnalyticsResponse getSummary(String startDateStr, String endDateStr, String category) {
        log.info("Getting donation summary: {} to {}, category={}", startDateStr, endDateStr, category);

        LocalDateTime startDate = LocalDateTime.parse(startDateStr);
        LocalDateTime endDate = LocalDateTime.parse(endDateStr);

        List<Donation> donations;
        if (category != null) {
            DonationCategory cat = DonationCategory.valueOf(category.toUpperCase());
            donations = donationRepository.findByTimestampBetweenAndCategory(startDate, endDate, cat);
        } else {
            donations = donationRepository.findByTimestampBetween(startDate, endDate);
        }

        // Build summary response
        DonationAnalyticsResponse summary = new DonationAnalyticsResponse();
        summary.setTotalDonations(donations.size());
        summary.setTotalAmount(calculateTotalAmount(donations));
        summary.setAverageDonation(calculateAverageDonation(donations));
        summary.setDonorCount(calculateUniqueDonors(donations));
        summary.setStartDate(startDate);
        summary.setEndDate(endDate);

        return summary;
    }

    // Helper methods

    private LocalDateTime[] parseDateRange(String dateRange, String startDateStr, String endDateStr) {
        LocalDateTime endDate = LocalDateTime.now();
        LocalDateTime startDate;

        if (startDateStr != null && endDateStr != null) {
            startDate = LocalDateTime.parse(startDateStr);
            endDate = LocalDateTime.parse(endDateStr);
        } else {
            switch (dateRange) {
                case "7d":
                    startDate = endDate.minusDays(7);
                    break;
                case "30d":
                    startDate = endDate.minusDays(30);
                    break;
                case "90d":
                    startDate = endDate.minusDays(90);
                    break;
                case "1y":
                    startDate = endDate.minusYears(1);
                    break;
                default:
                    startDate = endDate.minusDays(30);
            }
        }

        return new LocalDateTime[]{startDate, endDate};
    }

    private LocalDateTime[] getPreviousPeriod(LocalDateTime startDate, LocalDateTime endDate) {
        long periodDays = java.time.Duration.between(startDate, endDate).toDays();
        LocalDateTime prevEndDate = startDate.minusDays(1);
        LocalDateTime prevStartDate = prevEndDate.minusDays(periodDays);
        return new LocalDateTime[]{prevStartDate, prevEndDate};
    }

    private BigDecimal calculateTotalAmount(List<Donation> donations) {
        return donations.stream()
            .map(Donation::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal calculateAverageDonation(List<Donation> donations) {
        if (donations.isEmpty()) {
            return BigDecimal.ZERO;
        }
        BigDecimal total = calculateTotalAmount(donations);
        return total.divide(BigDecimal.valueOf(donations.size()), 2, RoundingMode.HALF_UP);
    }

    private Integer calculateUniqueDonors(List<Donation> donations) {
        return donations.stream()
            .map(d -> d.getUser().getId())
            .collect(Collectors.toSet())
            .size();
    }

    private Integer countRecurringDonations(List<Donation> donations) {
        return (int) donations.stream()
            .filter(Donation::getIsRecurring)
            .count();
    }

    private BigDecimal calculateRecurringAmount(List<Donation> donations) {
        return donations.stream()
            .filter(Donation::getIsRecurring)
            .map(Donation::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private List<CategoryBreakdownResponse> buildCategoryBreakdown(List<Donation> donations) {
        Map<DonationCategory, List<Donation>> byCategory = donations.stream()
            .collect(Collectors.groupingBy(Donation::getCategory));

        BigDecimal totalAmount = calculateTotalAmount(donations);

        return byCategory.entrySet().stream()
            .map(entry -> {
                DonationCategory category = entry.getKey();
                List<Donation> categoryDonations = entry.getValue();
                BigDecimal categoryAmount = calculateTotalAmount(categoryDonations);

                CategoryBreakdownResponse response = new CategoryBreakdownResponse();
                response.setCategory(category);
                response.setCategoryDisplayName(category.getDisplayName());
                response.setCount(categoryDonations.size());
                response.setAmount(categoryAmount);
                response.setPercentage(calculatePercentage(categoryAmount, totalAmount));
                response.setAverageDonation(calculateAverageDonation(categoryDonations));
                response.setUniqueDonors(calculateUniqueDonors(categoryDonations));

                return response;
            })
            .sorted((a, b) -> b.getAmount().compareTo(a.getAmount()))
            .collect(Collectors.toList());
    }

    private List<MonthlyTrendResponse> buildMonthlyTrends(LocalDateTime startDate, LocalDateTime endDate) {
        List<MonthlyTrendResponse> trends = new ArrayList<>();

        LocalDateTime current = startDate.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);

        while (current.isBefore(endDate)) {
            LocalDateTime monthEnd = current.plusMonths(1).minusDays(1);

            List<Donation> monthDonations = donationRepository.findByTimestampBetween(current, monthEnd);

            MonthlyTrendResponse trend = new MonthlyTrendResponse();
            trend.setMonth(current.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH));
            trend.setYear(current.getYear());
            trend.setTotalAmount(calculateTotalAmount(monthDonations));
            trend.setDonationCount(monthDonations.size());
            trend.setNewDonors(calculateUniqueDonors(monthDonations));
            trend.setRecurringAmount(calculateRecurringAmount(monthDonations));
            trend.setAverageDonation(calculateAverageDonation(monthDonations));

            trends.add(trend);
            current = current.plusMonths(1);
        }

        return trends;
    }

    private List<TopDonorResponse> buildTopDonors(List<Donation> donations, int limit) {
        Map<User, List<Donation>> byUser = donations.stream()
            .collect(Collectors.groupingBy(Donation::getUser));

        return byUser.entrySet().stream()
            .map(entry -> {
                User user = entry.getKey();
                List<Donation> userDonations = entry.getValue();

                TopDonorResponse donor = new TopDonorResponse();
                donor.setUserId(user.getId());
                donor.setDonorName(user.getName());
                donor.setTotalAmount(calculateTotalAmount(userDonations));
                donor.setDonationCount(userDonations.size());
                donor.setAverageDonation(calculateAverageDonation(userDonations));
                donor.setLastDonationDate(userDonations.stream()
                    .map(Donation::getTimestamp)
                    .max(LocalDateTime::compareTo)
                    .orElse(null));
                donor.setIsRecurringDonor(userDonations.stream()
                    .anyMatch(Donation::getIsRecurring));

                return donor;
            })
            .sorted((a, b) -> b.getTotalAmount().compareTo(a.getTotalAmount()))
            .limit(limit)
            .collect(Collectors.toList());
    }

    private List<DonationResponse> buildRecentDonations(List<Donation> donations, int limit) {
        return donations.stream()
            .sorted((a, b) -> b.getTimestamp().compareTo(a.getTimestamp()))
            .limit(limit)
            .map(this::mapDonationToResponse)
            .collect(Collectors.toList());
    }

    private PeriodComparisonResponse buildPeriodComparison(List<Donation> current, List<Donation> previous) {
        PeriodComparisonResponse.PeriodStatsResponse currentStats = buildPeriodStats(current);
        PeriodComparisonResponse.PeriodStatsResponse previousStats = buildPeriodStats(previous);
        PeriodComparisonResponse.GrowthMetricsResponse growth = calculateGrowth(currentStats, previousStats);

        PeriodComparisonResponse comparison = new PeriodComparisonResponse();
        comparison.setCurrentPeriod(currentStats);
        comparison.setPreviousPeriod(previousStats);
        comparison.setGrowth(growth);

        return comparison;
    }

    private PeriodComparisonResponse.PeriodStatsResponse buildPeriodStats(List<Donation> donations) {
        PeriodComparisonResponse.PeriodStatsResponse stats = new PeriodComparisonResponse.PeriodStatsResponse();
        stats.setTotalAmount(calculateTotalAmount(donations));
        stats.setDonationCount(donations.size());
        stats.setDonorCount(calculateUniqueDonors(donations));
        stats.setAverageDonation(calculateAverageDonation(donations));
        return stats;
    }

    private PeriodComparisonResponse.GrowthMetricsResponse calculateGrowth(
            PeriodComparisonResponse.PeriodStatsResponse current,
            PeriodComparisonResponse.PeriodStatsResponse previous) {

        PeriodComparisonResponse.GrowthMetricsResponse growth = new PeriodComparisonResponse.GrowthMetricsResponse();

        growth.setAmountGrowth(calculateGrowthPercentage(current.getTotalAmount(), previous.getTotalAmount()));
        growth.setCountGrowth(calculateGrowthPercentage(
            BigDecimal.valueOf(current.getDonationCount()),
            BigDecimal.valueOf(previous.getDonationCount())));
        growth.setDonorGrowth(calculateGrowthPercentage(
            BigDecimal.valueOf(current.getDonorCount()),
            BigDecimal.valueOf(previous.getDonorCount())));
        growth.setAverageGrowth(calculateGrowthPercentage(current.getAverageDonation(), previous.getAverageDonation()));

        return growth;
    }

    private Double calculateGrowthPercentage(BigDecimal current, BigDecimal previous) {
        if (previous.compareTo(BigDecimal.ZERO) == 0) {
            return current.compareTo(BigDecimal.ZERO) > 0 ? 100.0 : 0.0;
        }
        return current.subtract(previous)
            .divide(previous, 4, RoundingMode.HALF_UP)
            .multiply(BigDecimal.valueOf(100))
            .doubleValue();
    }

    private Double calculatePercentage(BigDecimal part, BigDecimal total) {
        if (total.compareTo(BigDecimal.ZERO) == 0) {
            return 0.0;
        }
        return part.divide(total, 4, RoundingMode.HALF_UP)
            .multiply(BigDecimal.valueOf(100))
            .doubleValue();
    }

    private TopDonorResponse mapToTopDonorResponse(Object[] stats) {
        // Expected: userId, donorName, totalAmount, donationCount, lastDonation, hasRecurring
        TopDonorResponse donor = new TopDonorResponse();
        donor.setUserId((UUID) stats[0]);
        donor.setDonorName((String) stats[1]);
        donor.setTotalAmount((BigDecimal) stats[2]);
        donor.setDonationCount((Integer) stats[3]);
        donor.setLastDonationDate((LocalDateTime) stats[4]);
        donor.setIsRecurringDonor((Boolean) stats[5]);

        if (donor.getDonationCount() > 0) {
            donor.setAverageDonation(donor.getTotalAmount()
                .divide(BigDecimal.valueOf(donor.getDonationCount()), 2, RoundingMode.HALF_UP));
        }

        return donor;
    }

    private DonationResponse mapDonationToResponse(Donation donation) {
        DonationResponse response = new DonationResponse();
        response.setId(donation.getId());
        response.setAmount(donation.getAmount());
        response.setTransactionId(donation.getTransactionId());
        response.setCategory(donation.getCategory());
        response.setCategoryDisplayName(donation.getCategoryDisplayName());
        response.setPurpose(donation.getPurpose());
        response.setIsRecurring(donation.getIsRecurring());
        response.setCurrency(donation.getCurrency());
        response.setTimestamp(donation.getTimestamp());
        response.setCreatedAt(donation.getCreatedAt());
        response.setUserId(donation.getUser().getId());
        response.setDonorName(donation.getUser().getName());
        return response;
    }

    private byte[] exportToCsv(List<Donation> donations) {
        // Simple CSV export implementation
        StringBuilder csv = new StringBuilder();
        csv.append("Date,Donor,Amount,Category,Purpose,Transaction ID\n");

        for (Donation donation : donations) {
            csv.append(donation.getTimestamp().format(DateTimeFormatter.ISO_LOCAL_DATE)).append(",")
               .append(donation.getUser().getName()).append(",")
               .append(donation.getAmount()).append(",")
               .append(donation.getCategoryDisplayName()).append(",")
               .append(donation.getPurpose() != null ? donation.getPurpose() : "").append(",")
               .append(donation.getTransactionId()).append("\n");
        }

        return csv.toString().getBytes();
    }

    private byte[] exportToExcel(List<Donation> donations) {
        // For simplicity, return CSV format for now
        // In production, you'd use Apache POI to create actual Excel files
        return exportToCsv(donations);
    }
}