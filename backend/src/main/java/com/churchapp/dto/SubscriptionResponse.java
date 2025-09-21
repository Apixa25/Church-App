package com.churchapp.dto;

import com.churchapp.entity.DonationCategory;
import com.churchapp.entity.RecurringFrequency;
import com.churchapp.entity.SubscriptionStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SubscriptionResponse {

    private UUID id;
    private String stripeSubscriptionId;
    private BigDecimal amount;
    private RecurringFrequency frequency;
    private String frequencyDisplayName;
    private DonationCategory category;
    private String categoryDisplayName;
    private String purpose;
    private SubscriptionStatus status;
    private String statusDisplayName;
    private String currency;

    // Period information
    private LocalDateTime currentPeriodStart;
    private LocalDateTime currentPeriodEnd;
    private LocalDateTime nextPaymentDate;

    // Dates
    private LocalDateTime startedAt;
    private LocalDateTime endedAt;
    private LocalDateTime canceledAt;
    private LocalDateTime createdAt;

    // Payment method info
    private String paymentMethodLast4;
    private String paymentMethodBrand;

    // Failure info
    private Integer failureCount;
    private String lastFailureReason;
    private LocalDateTime lastFailureDate;

    // Statistics
    private Integer totalDonationsCount;
    private BigDecimal totalDonationsAmount;

    // User info (limited)
    private UUID userId;
    private String donorName;

    // Helper methods
    public String getFormattedAmount() {
        return amount != null ? String.format("$%.2f", amount) : "$0.00";
    }

    public String getFormattedTotalAmount() {
        return totalDonationsAmount != null ? String.format("$%.2f", totalDonationsAmount) : "$0.00";
    }

    public String getPaymentMethodDisplay() {
        if (paymentMethodBrand != null && paymentMethodLast4 != null) {
            return String.format("%s ending in %s",
                paymentMethodBrand.substring(0, 1).toUpperCase() + paymentMethodBrand.substring(1),
                paymentMethodLast4);
        }
        return "Unknown";
    }

    public boolean isActive() {
        return status == SubscriptionStatus.ACTIVE;
    }

    public boolean isCanceled() {
        return status == SubscriptionStatus.CANCELED;
    }

    public boolean isPastDue() {
        return status == SubscriptionStatus.PAST_DUE;
    }

    public boolean hasFailures() {
        return failureCount != null && failureCount > 0;
    }

    public String getFrequencyDescription() {
        if (frequency == null) return "";

        switch (frequency) {
            case WEEKLY:
                return "Every week";
            case MONTHLY:
                return "Every month";
            case QUARTERLY:
                return "Every 3 months";
            case YEARLY:
                return "Every year";
            default:
                return frequency.getDisplayName();
        }
    }
}