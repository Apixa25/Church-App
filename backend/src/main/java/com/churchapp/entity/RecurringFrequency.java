package com.churchapp.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

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

    @JsonValue
    public String toValue() {
        return name();
    }

    /**
     * Creates RecurringFrequency from string value in a case-insensitive manner.
     * Accepts enum names (e.g., "WEEKLY", "weekly"), stripe intervals (e.g., "week"), 
     * and display names (e.g., "Weekly").
     * 
     * @param value the string value to convert
     * @return the corresponding RecurringFrequency
     * @throws IllegalArgumentException if the value doesn't match any frequency
     */
    @JsonCreator
    public static RecurringFrequency fromValue(String value) {
        if (value == null) {
            throw new IllegalArgumentException("Recurring frequency cannot be null");
        }
        
        String normalizedValue = value.trim().toUpperCase();
        
        // Try to match by enum name (e.g., "WEEKLY", "weekly")
        for (RecurringFrequency frequency : RecurringFrequency.values()) {
            if (frequency.name().equals(normalizedValue)) {
                return frequency;
            }
        }
        
        // Try to match by stripe interval (e.g., "week", "month")
        for (RecurringFrequency frequency : RecurringFrequency.values()) {
            if (frequency.stripeInterval.equalsIgnoreCase(value.trim())) {
                return frequency;
            }
        }
        
        // Try to match by display name (e.g., "Weekly")
        for (RecurringFrequency frequency : RecurringFrequency.values()) {
            if (frequency.displayName.equalsIgnoreCase(value.trim())) {
                return frequency;
            }
        }
        
        throw new IllegalArgumentException(
            String.format("Invalid recurring frequency: '%s'. Valid values are: WEEKLY, MONTHLY, QUARTERLY, YEARLY", value)
        );
    }
}