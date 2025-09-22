package com.churchapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DonationAnalyticsResponse {

    // Core metrics
    private Integer totalDonations;
    private BigDecimal totalAmount;
    private BigDecimal averageDonation;
    private Integer donorCount;
    private Integer recurringDonations;
    private BigDecimal recurringAmount;

    // Breakdowns and trends
    private List<CategoryBreakdownResponse> categoryBreakdown;
    private List<MonthlyTrendResponse> monthlyTrends;
    private List<TopDonorResponse> topDonors;
    private List<DonationResponse> recentDonations;
    private PeriodComparisonResponse periodComparison;

    // Date range
    private String dateRange;
    private LocalDateTime startDate;
    private LocalDateTime endDate;

}