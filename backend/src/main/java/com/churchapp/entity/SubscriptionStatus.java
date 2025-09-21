package com.churchapp.entity;

public enum SubscriptionStatus {
    ACTIVE("active", "Active"),
    CANCELED("canceled", "Canceled"),
    PAST_DUE("past_due", "Past Due"),
    INCOMPLETE("incomplete", "Incomplete"),
    INCOMPLETE_EXPIRED("incomplete_expired", "Incomplete Expired"),
    TRIALING("trialing", "Trialing"),
    UNPAID("unpaid", "Unpaid");

    private final String stripeStatus;
    private final String displayName;

    SubscriptionStatus(String stripeStatus, String displayName) {
        this.stripeStatus = stripeStatus;
        this.displayName = displayName;
    }

    public String getStripeStatus() {
        return stripeStatus;
    }

    public String getDisplayName() {
        return displayName;
    }

    public static SubscriptionStatus fromStripeStatus(String stripeStatus) {
        for (SubscriptionStatus status : values()) {
            if (status.stripeStatus.equals(stripeStatus)) {
                return status;
            }
        }
        return INCOMPLETE; // Default fallback
    }
}