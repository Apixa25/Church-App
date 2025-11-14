package com.churchapp.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "donation_subscriptions", indexes = {
    @Index(name = "idx_subscription_user_id", columnList = "user_id"),
    @Index(name = "idx_subscription_stripe_id", columnList = "stripe_subscription_id"),
    @Index(name = "idx_subscription_status", columnList = "status"),
    @Index(name = "idx_subscription_user_status", columnList = "user_id, status"),
    @Index(name = "idx_donation_subs_organization_id", columnList = "organization_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DonationSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @NotNull
    private User user;

    @Column(name = "stripe_subscription_id", nullable = false, unique = true, length = 100)
    @NotNull
    private String stripeSubscriptionId;

    @Column(name = "stripe_customer_id", nullable = false, length = 100)
    @NotNull
    private String stripeCustomerId;

    @Column(name = "stripe_price_id", nullable = false, length = 100)
    @NotNull
    private String stripePriceId;

    @Column(name = "amount", nullable = false, precision = 19, scale = 2)
    @NotNull
    @DecimalMin(value = "0.01", message = "Subscription amount must be greater than 0")
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "frequency", nullable = false, length = 20)
    @NotNull
    private RecurringFrequency frequency;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 20)
    @NotNull
    private DonationCategory category;

    @Column(name = "purpose", length = 500)
    private String purpose;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @NotNull
    private SubscriptionStatus status;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency = "USD";

    @Column(name = "current_period_start")
    private LocalDateTime currentPeriodStart;

    @Column(name = "current_period_end")
    private LocalDateTime currentPeriodEnd;

    @Column(name = "next_payment_date")
    private LocalDateTime nextPaymentDate;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Column(name = "canceled_at")
    private LocalDateTime canceledAt;

    @Column(name = "trial_start")
    private LocalDateTime trialStart;

    @Column(name = "trial_end")
    private LocalDateTime trialEnd;

    @Column(name = "payment_method_last4", length = 4)
    private String paymentMethodLast4;

    @Column(name = "payment_method_brand", length = 20)
    private String paymentMethodBrand;

    @Column(name = "failure_count", nullable = false)
    private Integer failureCount = 0;

    @Column(name = "last_failure_reason", length = 500)
    private String lastFailureReason;

    @Column(name = "last_failure_date")
    private LocalDateTime lastFailureDate;

    @Column(name = "notes", length = 1000)
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    @CreationTimestamp
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    @UpdateTimestamp
    private LocalDateTime updatedAt;

    // Multi-tenant organization field
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    // One-to-many relationship with donations
    @OneToMany(mappedBy = "subscription", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Donation> donations = new ArrayList<>();

    // Helper methods
    public boolean isActive() {
        return status == SubscriptionStatus.ACTIVE;
    }

    public boolean isCanceled() {
        return status == SubscriptionStatus.CANCELED;
    }

    public boolean isPastDue() {
        return status == SubscriptionStatus.PAST_DUE;
    }

    public String getFormattedAmount() {
        return String.format("$%.2f", amount);
    }

    public String getCategoryDisplayName() {
        return category != null ? category.getDisplayName() : "";
    }

    public String getFrequencyDisplayName() {
        return frequency != null ? frequency.getDisplayName() : "";
    }

    public String getStatusDisplayName() {
        return status != null ? status.getDisplayName() : "";
    }

    public int getTotalDonationsCount() {
        return donations != null ? donations.size() : 0;
    }

    public BigDecimal getTotalDonationsAmount() {
        if (donations == null || donations.isEmpty()) {
            return BigDecimal.ZERO;
        }
        return donations.stream()
                .map(Donation::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}