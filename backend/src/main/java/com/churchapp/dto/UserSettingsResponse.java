package com.churchapp.dto;

import com.churchapp.entity.UserSettings;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSettingsResponse {
    private UUID userId;

    // Notification Settings
    private boolean emailNotifications;
    private boolean pushNotifications;
    private boolean prayerNotifications;
    private boolean announcementNotifications;
    private boolean eventNotifications;
    private boolean chatNotifications;
    private boolean donationReminders;
    private boolean weeklyDigest;

    // Privacy Settings
    private String profileVisibility;
    private boolean showDonationHistory;
    private boolean allowDirectMessages;
    private boolean showOnlineStatus;
    private String prayerRequestVisibility;

    // Appearance Settings
    private String theme;
    private String language;
    private String timezone;
    private String fontSize;

    // Communication Preferences
    private String preferredContactMethod;
    private boolean newsletterSubscription;
    private int eventRemindersHours;

    // Data & Privacy
    private boolean dataSharingAnalytics;
    private boolean autoBackupEnabled;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime lastBackupDate;

    // Accessibility
    private boolean highContrastMode;
    private boolean reduceMotion;
    private boolean screenReaderOptimized;

    // Metadata
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    public static UserSettingsResponse fromEntity(UserSettings settings) {
        return UserSettingsResponse.builder()
            .userId(settings.getUserId())
            .emailNotifications(settings.isEmailNotifications())
            .pushNotifications(settings.isPushNotifications())
            .prayerNotifications(settings.isPrayerNotifications())
            .announcementNotifications(settings.isAnnouncementNotifications())
            .eventNotifications(settings.isEventNotifications())
            .chatNotifications(settings.isChatNotifications())
            .donationReminders(settings.isDonationReminders())
            .weeklyDigest(settings.isWeeklyDigest())
            .profileVisibility(settings.getProfileVisibility().name())
            .showDonationHistory(settings.isShowDonationHistory())
            .allowDirectMessages(settings.isAllowDirectMessages())
            .showOnlineStatus(settings.isShowOnlineStatus())
            .prayerRequestVisibility(settings.getPrayerRequestVisibility().name())
            .theme(settings.getTheme().name())
            .language(settings.getLanguage())
            .timezone(settings.getTimezone())
            .fontSize(settings.getFontSize().name())
            .preferredContactMethod(settings.getPreferredContactMethod().name())
            .newsletterSubscription(settings.isNewsletterSubscription())
            .eventRemindersHours(settings.getEventRemindersHours())
            .dataSharingAnalytics(settings.isDataSharingAnalytics())
            .autoBackupEnabled(settings.isAutoBackupEnabled())
            .lastBackupDate(settings.getLastBackupDate())
            .highContrastMode(settings.isHighContrastMode())
            .reduceMotion(settings.isReduceMotion())
            .screenReaderOptimized(settings.isScreenReaderOptimized())
            .createdAt(settings.getCreatedAt())
            .updatedAt(settings.getUpdatedAt())
            .build();
    }
}