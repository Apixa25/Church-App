package com.churchapp.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum DonationCategory {
    TITHES("Tithes"),
    OFFERINGS("Offerings"),
    MISSIONS("Missions");

    private final String displayName;

    DonationCategory(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }

    @JsonValue
    public String toValue() {
        return name();
    }

    /**
     * Creates DonationCategory from string value in a case-insensitive manner.
     * Accepts both enum names (e.g., "TITHES", "tithes") and display names (e.g., "Tithes").
     * 
     * @param value the string value to convert
     * @return the corresponding DonationCategory
     * @throws IllegalArgumentException if the value doesn't match any category
     */
    @JsonCreator
    public static DonationCategory fromValue(String value) {
        if (value == null) {
            throw new IllegalArgumentException("Donation category cannot be null");
        }
        
        String normalizedValue = value.trim().toUpperCase();
        
        // Try to match by enum name
        for (DonationCategory category : DonationCategory.values()) {
            if (category.name().equals(normalizedValue)) {
                return category;
            }
        }
        
        // Try to match by display name (case-insensitive)
        for (DonationCategory category : DonationCategory.values()) {
            if (category.displayName.equalsIgnoreCase(value.trim())) {
                return category;
            }
        }
        
        throw new IllegalArgumentException(
            String.format("Invalid donation category: '%s'. Valid values are: TITHES, OFFERINGS, MISSIONS", value)
        );
    }
}