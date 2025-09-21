package com.churchapp.dto;

import com.churchapp.entity.DonationCategory;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DonationResponse {

    private UUID id;
    private BigDecimal amount;
    private String transactionId;
    private DonationCategory category;
    private String categoryDisplayName;
    private String purpose;
    private Boolean isRecurring;
    private String currency;
    private String paymentMethodLast4;
    private String paymentMethodBrand;
    private BigDecimal feeAmount;
    private BigDecimal netAmount;
    private String receiptEmail;
    private Boolean receiptSent;
    private LocalDateTime receiptSentAt;
    private LocalDateTime timestamp;
    private LocalDateTime createdAt;

    // Subscription info if applicable
    private UUID subscriptionId;
    private String subscriptionFrequency;

    // User info (limited for privacy)
    private UUID userId;
    private String donorName;

    // Helper methods for display
    public String getFormattedAmount() {
        return amount != null ? String.format("$%.2f", amount) : "$0.00";
    }

    public String getFormattedFeeAmount() {
        return feeAmount != null ? String.format("$%.2f", feeAmount) : "$0.00";
    }

    public String getFormattedNetAmount() {
        return netAmount != null ? String.format("$%.2f", netAmount) : "$0.00";
    }

    public String getPaymentMethodDisplay() {
        if (paymentMethodBrand != null && paymentMethodLast4 != null) {
            return String.format("%s ending in %s",
                paymentMethodBrand.substring(0, 1).toUpperCase() + paymentMethodBrand.substring(1),
                paymentMethodLast4);
        }
        return "Unknown";
    }

    public boolean isReceiptAvailable() {
        return receiptSent != null && receiptSent;
    }
}