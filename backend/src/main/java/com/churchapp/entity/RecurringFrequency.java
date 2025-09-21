package com.churchapp.entity;

public enum RecurringFrequency {
    WEEKLY("week", "Weekly"),
    MONTHLY("month", "Monthly"),
    QUARTERLY("quarter", "Quarterly"),
    YEARLY("year", "Yearly");

    private final String stripeInterval;
    private final String displayName;

    RecurringFrequency(String stripeInterval, String displayName) {
        this.stripeInterval = stripeInterval;
        this.displayName = displayName;
    }

    public String getStripeInterval() {
        return stripeInterval;
    }

    public String getDisplayName() {
        return displayName;
    }
}