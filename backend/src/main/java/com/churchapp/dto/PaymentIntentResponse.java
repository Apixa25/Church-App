package com.churchapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentIntentResponse {

    private String clientSecret;
    private String paymentIntentId;
    private BigDecimal amount;
    private String currency;
    private String status;
    private String description;

    // For frontend integration
    private String publicKey;
    private BigDecimal estimatedFee;
    private BigDecimal netAmount;

    public String getFormattedAmount() {
        return amount != null ? String.format("$%.2f", amount) : "$0.00";
    }

    public String getFormattedEstimatedFee() {
        return estimatedFee != null ? String.format("$%.2f", estimatedFee) : "$0.00";
    }

    public String getFormattedNetAmount() {
        return netAmount != null ? String.format("$%.2f", netAmount) : "$0.00";
    }
}