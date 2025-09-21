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
public class PaymentIntentRequest {

    @NotNull(message = "Donation amount is required")
    @DecimalMin(value = "1.00", message = "Minimum donation amount is $1.00")
    private BigDecimal amount;

    @NotNull(message = "Donation category is required")
    private DonationCategory category;

    @Size(max = 500, message = "Purpose must be less than 500 characters")
    private String purpose;

    @Email(message = "Invalid email format")
    private String receiptEmail;

    // For frontend integration
    private String returnUrl;
    private String confirmationMethod = "automatic";
}