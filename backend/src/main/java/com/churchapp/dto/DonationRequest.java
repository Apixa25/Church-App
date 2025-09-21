package com.churchapp.dto;

import com.churchapp.entity.DonationCategory;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DonationRequest {

    @NotNull(message = "Donation amount is required")
    @DecimalMin(value = "1.00", message = "Minimum donation amount is $1.00")
    private BigDecimal amount;

    @NotNull(message = "Donation category is required")
    private DonationCategory category;

    @Size(max = 500, message = "Purpose must be less than 500 characters")
    private String purpose;

    @Email(message = "Invalid email format")
    @Size(max = 255, message = "Email must be less than 255 characters")
    private String receiptEmail;

    @Size(max = 1000, message = "Notes must be less than 1000 characters")
    private String notes;

    // For returning donor experience - optional saved payment method
    private String savedPaymentMethodId;

    // Validation helper
    public boolean hasValidAmount() {
        return amount != null && amount.compareTo(BigDecimal.valueOf(1.00)) >= 0 &&
               amount.compareTo(BigDecimal.valueOf(10000.00)) <= 0;
    }

    public boolean hasValidPurpose() {
        return purpose == null || purpose.trim().length() <= 500;
    }
}