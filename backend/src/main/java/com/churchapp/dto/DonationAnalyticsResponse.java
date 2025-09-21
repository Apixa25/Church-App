package com.churchapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DonationAnalyticsResponse {

    // Overall totals
    private BigDecimal totalDonations;
    private BigDecimal totalOneTimeDonations;
    private BigDecimal totalRecurringDonations;
    private Long totalDonationCount;
    private Long uniqueDonorCount;

    // Date range for this analytics report
    private LocalDateTime startDate;
    private LocalDateTime endDate;

    // Category breakdown
    private List<CategoryTotal> categoryTotals;

    // Monthly trends
    private List<MonthlyTotal> monthlyTotals;

    // Top donors (for admin view)
    private List<TopDonor> topDonors;

    // Subscription analytics
    private SubscriptionAnalytics subscriptionAnalytics;

    // Payment method statistics
    private Map<String, Long> paymentMethodStats;

    // Recent large donations (admin alert)
    private List<DonationResponse> largeDonations;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryTotal {
        private String category;
        private String categoryDisplayName;
        private BigDecimal total;
        private Long count;
        private BigDecimal percentage;

        public String getFormattedTotal() {
            return total != null ? String.format("$%.2f", total) : "$0.00";
        }

        public String getFormattedPercentage() {
            return percentage != null ? String.format("%.1f%%", percentage) : "0.0%";
        }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MonthlyTotal {
        private Integer year;
        private Integer month;
        private String monthName;
        private BigDecimal total;
        private Long count;
        private BigDecimal growth; // Percentage growth from previous month

        public String getFormattedTotal() {
            return total != null ? String.format("$%.2f", total) : "$0.00";
        }

        public String getFormattedGrowth() {
            if (growth == null) return "N/A";
            String sign = growth.compareTo(BigDecimal.ZERO) >= 0 ? "+" : "";
            return String.format("%s%.1f%%", sign, growth);
        }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopDonor {
        private String donorName;
        private BigDecimal totalAmount;
        private Long donationCount;
        private LocalDateTime firstDonation;
        private LocalDateTime lastDonation;

        public String getFormattedTotal() {
            return totalAmount != null ? String.format("$%.2f", totalAmount) : "$0.00";
        }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubscriptionAnalytics {
        private Long activeSubscriptions;
        private Long canceledSubscriptions;
        private BigDecimal monthlyRecurringRevenue;
        private BigDecimal averageSubscriptionAmount;
        private Double churnRate; // Percentage

        public String getFormattedMRR() {
            return monthlyRecurringRevenue != null ? String.format("$%.2f", monthlyRecurringRevenue) : "$0.00";
        }

        public String getFormattedAverageAmount() {
            return averageSubscriptionAmount != null ? String.format("$%.2f", averageSubscriptionAmount) : "$0.00";
        }

        public String getFormattedChurnRate() {
            return churnRate != null ? String.format("%.1f%%", churnRate) : "0.0%";
        }
    }

    // Helper methods
    public String getFormattedTotalDonations() {
        return totalDonations != null ? String.format("$%.2f", totalDonations) : "$0.00";
    }

    public String getFormattedOneTimeDonations() {
        return totalOneTimeDonations != null ? String.format("$%.2f", totalOneTimeDonations) : "$0.00";
    }

    public String getFormattedRecurringDonations() {
        return totalRecurringDonations != null ? String.format("$%.2f", totalRecurringDonations) : "$0.00";
    }

    public BigDecimal getAverageDonationAmount() {
        if (totalDonations == null || totalDonationCount == null || totalDonationCount == 0) {
            return BigDecimal.ZERO;
        }
        return totalDonations.divide(BigDecimal.valueOf(totalDonationCount), 2, BigDecimal.ROUND_HALF_UP);
    }

    public String getFormattedAverageDonation() {
        return String.format("$%.2f", getAverageDonationAmount());
    }
}