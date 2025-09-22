package com.churchapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MonthlyTrendResponse {
    private String month;
    private Integer year;
    private BigDecimal totalAmount;
    private Integer donationCount;
    private Integer newDonors;
    private BigDecimal recurringAmount;
    private BigDecimal averageDonation;
    private Double growthRate;
}