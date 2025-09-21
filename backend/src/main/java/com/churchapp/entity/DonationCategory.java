package com.churchapp.entity;

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
}