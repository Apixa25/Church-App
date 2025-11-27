package com.churchapp.dto;

import com.churchapp.entity.DonationCategory;
import com.churchapp.entity.RecurringFrequency;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SubscriptionRequest {

    @NotNull(message = "Subscription amount is required")
    @DecimalMin(value = "1.00", message = "Minimum subscription amount is $1.00")
    private BigDecimal amount;

    @NotNull(message = "Donation category is required")
    private DonationCategory category;

    @NotNull(message = "Recurring frequency is required")
    private RecurringFrequency frequency;

    @Size(max = 500, message = "Purpose must be less than 500 characters")
    private String purpose;

    @NotNull(message = "Payment method is required")
    private String paymentMethodId;

    @Size(max = 1000, message = "Notes must be less than 1000 characters")
    private String notes;

    // Organization ID for context-aware donations (Church or Family)
    // If not provided, falls back to user's church primary organization
    private java.util.UUID organizationId;

    // Optional trial period in days
    private Integer trialPeriodDays;

    // Validation helpers
    public boolean hasValidAmount() {
        return amount != null && amount.compareTo(BigDecimal.valueOf(1.00)) >= 0 &&
               amount.compareTo(BigDecimal.valueOf(10000.00)) <= 0;
    }

    public boolean hasValidTrialPeriod() {
        return trialPeriodDays == null || (trialPeriodDays >= 0 && trialPeriodDays <= 365);
    }
}