package com.churchapp.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "donations", indexes = {
    @Index(name = "idx_donation_user_id", columnList = "user_id"),
    @Index(name = "idx_donation_timestamp", columnList = "timestamp"),
    @Index(name = "idx_donation_transaction_id", columnList = "transaction_id"),
    @Index(name = "idx_donation_category", columnList = "category"),
    @Index(name = "idx_donation_user_timestamp", columnList = "user_id, timestamp"),
    @Index(name = "idx_donations_organization_id", columnList = "organization_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Donation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @NotNull
    private User user;

    @Column(name = "amount", nullable = false, precision = 19, scale = 2)
    @NotNull
    @DecimalMin(value = "0.01", message = "Donation amount must be greater than 0")
    private BigDecimal amount;

    @Column(name = "transaction_id", nullable = false, unique = true, length = 100)
    @NotNull
    private String transactionId;

    @Column(name = "stripe_payment_intent_id", length = 100)
    private String stripePaymentIntentId;

    @Column(name = "stripe_charge_id", length = 100)
    private String stripeChargeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 20)
    @NotNull
    private DonationCategory category;

    @Column(name = "purpose", length = 500)
    private String purpose;

    @Column(name = "is_recurring", nullable = false)
    private Boolean isRecurring = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subscription_id")
    private DonationSubscription subscription;

    @Column(name = "payment_method_last4", length = 4)
    private String paymentMethodLast4;

    @Column(name = "payment_method_brand", length = 20)
    private String paymentMethodBrand;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency = "USD";

    @Column(name = "fee_amount", precision = 19, scale = 2)
    private BigDecimal feeAmount;

    @Column(name = "net_amount", precision = 19, scale = 2)
    private BigDecimal netAmount;

    @Column(name = "receipt_email", length = 255)
    private String receiptEmail;

    @Column(name = "receipt_sent", nullable = false)
    private Boolean receiptSent = false;

    @Column(name = "receipt_sent_at")
    private LocalDateTime receiptSentAt;

    @Column(name = "notes", length = 1000)
    private String notes;

    @Column(name = "timestamp", nullable = false)
    @CreationTimestamp
    private LocalDateTime timestamp;

    @Column(name = "created_at", nullable = false, updatable = false)
    @CreationTimestamp
    private LocalDateTime createdAt;

    // Multi-tenant organization field
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    // Helper methods
    public boolean isReceiptSent() {
        return receiptSent != null && receiptSent;
    }

    public boolean isFromSubscription() {
        return isRecurring != null && isRecurring && subscription != null;
    }

    public String getFormattedAmount() {
        return String.format("$%.2f", amount);
    }

    public String getCategoryDisplayName() {
        return category != null ? category.getDisplayName() : "";
    }
}