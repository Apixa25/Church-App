package com.churchapp.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_settings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSettings {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    // Notification Settings
    @Column(name = "email_notifications", nullable = false)
    private boolean emailNotifications = true;

    @Column(name = "push_notifications", nullable = false)
    private boolean pushNotifications = true;

    @Column(name = "prayer_notifications", nullable = false)
    private boolean prayerNotifications = true;

    @Column(name = "announcement_notifications", nullable = false)
    private boolean announcementNotifications = true;

    @Column(name = "event_notifications", nullable = false)
    private boolean eventNotifications = true;

    @Column(name = "chat_notifications", nullable = false)
    private boolean chatNotifications = true;

    @Column(name = "donation_reminders", nullable = false)
    private boolean donationReminders = true;

    @Column(name = "weekly_digest", nullable = false)
    private boolean weeklyDigest = true;

    // Privacy Settings
    @Column(name = "profile_visibility", nullable = false)
    @Enumerated(EnumType.STRING)
    private ProfileVisibility profileVisibility = ProfileVisibility.CHURCH_MEMBERS;

    @Column(name = "show_donation_history", nullable = false)
    private boolean showDonationHistory = false;

    @Column(name = "allow_direct_messages", nullable = false)
    private boolean allowDirectMessages = true;

    @Column(name = "show_online_status", nullable = false)
    private boolean showOnlineStatus = true;

    @Column(name = "prayer_request_visibility", nullable = false)
    @Enumerated(EnumType.STRING)
    private PrayerVisibility prayerRequestVisibility = PrayerVisibility.CHURCH_MEMBERS;

    // Appearance Settings
    @Column(name = "theme", nullable = false)
    @Enumerated(EnumType.STRING)
    private Theme theme = Theme.LIGHT;

    @Column(name = "language", nullable = false, length = 10)
    private String language = "en";

    @Column(name = "timezone", length = 50)
    private String timezone = "UTC";

    @Column(name = "font_size", nullable = false)
    @Enumerated(EnumType.STRING)
    private FontSize fontSize = FontSize.MEDIUM;

    // Communication Preferences
    @Column(name = "preferred_contact_method", nullable = false)
    @Enumerated(EnumType.STRING)
    private ContactMethod preferredContactMethod = ContactMethod.EMAIL;

    @Column(name = "newsletter_subscription", nullable = false)
    private boolean newsletterSubscription = true;

    @Column(name = "event_reminders_hours", nullable = false)
    private int eventRemindersHours = 24;

    // FCM Token for push notifications
    @Column(name = "fcm_token", length = 500)
    private String fcmToken;

    // Data & Privacy
    @Column(name = "data_sharing_analytics", nullable = false)
    private boolean dataSharingAnalytics = true;

    @Column(name = "auto_backup_enabled", nullable = false)
    private boolean autoBackupEnabled = true;

    @Column(name = "last_backup_date")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime lastBackupDate;

    // Accessibility
    @Column(name = "high_contrast_mode", nullable = false)
    private boolean highContrastMode = false;

    @Column(name = "reduce_motion", nullable = false)
    private boolean reduceMotion = false;

    @Column(name = "screen_reader_optimized", nullable = false)
    private boolean screenReaderOptimized = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    // Enums
    public enum ProfileVisibility {
        PUBLIC, CHURCH_MEMBERS, FRIENDS_ONLY, PRIVATE
    }

    public enum PrayerVisibility {
        PUBLIC, CHURCH_MEMBERS, PRIVATE, ANONYMOUS
    }

    public enum Theme {
        LIGHT, DARK, AUTO
    }

    public enum FontSize {
        SMALL, MEDIUM, LARGE, EXTRA_LARGE
    }

    public enum ContactMethod {
        EMAIL, PHONE, APP_ONLY, NONE
    }
}