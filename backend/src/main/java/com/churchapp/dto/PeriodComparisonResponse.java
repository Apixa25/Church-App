package com.churchapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PeriodComparisonResponse {
    private PeriodStatsResponse currentPeriod;
    private PeriodStatsResponse previousPeriod;
    private GrowthMetricsResponse growth;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PeriodStatsResponse {
        private BigDecimal totalAmount;
        private Integer donationCount;
        private Integer donorCount;
        private BigDecimal averageDonation;
        private String startDate;
        private String endDate;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GrowthMetricsResponse {
        private Double amountGrowth;
        private Double countGrowth;
        private Double donorGrowth;
        private Double averageGrowth;
    }
}