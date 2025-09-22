package com.churchapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TopDonorResponse {
    private UUID userId;
    private String donorName;
    private BigDecimal totalAmount;
    private Integer donationCount;
    private BigDecimal averageDonation;
    private LocalDateTime lastDonationDate;
    private Boolean isRecurringDonor;
    private String primaryCategory;
    private BigDecimal yearToDateAmount;
    private String donorSince;
}