package com.churchapp.dto;

import com.churchapp.entity.DonationCategory;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CategoryBreakdownResponse {
    private DonationCategory category;
    private String categoryDisplayName;
    private Integer count;
    private BigDecimal amount;
    private Double percentage;
    private BigDecimal averageDonation;
    private Integer uniqueDonors;
    private BigDecimal monthlyGrowth;
}