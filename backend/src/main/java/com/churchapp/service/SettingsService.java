package com.churchapp.service;

import com.churchapp.dto.UserSettingsResponse;
import com.churchapp.entity.User;
import com.churchapp.entity.UserSettings;
import com.churchapp.repository.UserRepository;
import com.churchapp.repository.UserSettingsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class SettingsService {

    private final UserSettingsRepository userSettingsRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.version:1.0.0}")
    private String appVersion;

    @Value("${app.build-date:}")
    private String buildDate;

    public UserSettingsResponse getUserSettings(UUID userId) {
        UserSettings settings = userSettingsRepository.findByUserId(userId)
            .orElse(createDefaultSettings(userId));
        return UserSettingsResponse.fromEntity(settings);
    }

    @Transactional
    public UserSettingsResponse updateUserSettings(UUID userId, Map<String, Object> updates) {
        UserSettings settings = userSettingsRepository.findByUserId(userId)
            .orElse(createDefaultSettings(userId));

        updateSettingsFromMap(settings, updates);
        settings = userSettingsRepository.save(settings);

        log.info("Updated settings for user: {}", userId);
        return UserSettingsResponse.fromEntity(settings);
    }

    @Transactional
    public void updateNotificationSettings(UUID userId, Map<String, Object> notificationSettings) {
        UserSettings settings = userSettingsRepository.findByUserId(userId)
            .orElse(createDefaultSettings(userId));

        // Update notification preferences
        if (notificationSettings.containsKey("emailNotifications")) {
            settings.setEmailNotifications((Boolean) notificationSettings.get("emailNotifications"));
        }
        if (notificationSettings.containsKey("pushNotifications")) {
            settings.setPushNotifications((Boolean) notificationSettings.get("pushNotifications"));
        }
        if (notificationSettings.containsKey("prayerNotifications")) {
            settings.setPrayerNotifications((Boolean) notificationSettings.get("prayerNotifications"));
        }
        if (notificationSettings.containsKey("announcementNotifications")) {
            settings.setAnnouncementNotifications((Boolean) notificationSettings.get("announcementNotifications"));
        }
        if (notificationSettings.containsKey("eventNotifications")) {
            settings.setEventNotifications((Boolean) notificationSettings.get("eventNotifications"));
        }
        if (notificationSettings.containsKey("chatNotifications")) {
            settings.setChatNotifications((Boolean) notificationSettings.get("chatNotifications"));
        }
        if (notificationSettings.containsKey("donationReminders")) {
            settings.setDonationReminders((Boolean) notificationSettings.get("donationReminders"));
        }
        if (notificationSettings.containsKey("weeklyDigest")) {
            settings.setWeeklyDigest((Boolean) notificationSettings.get("weeklyDigest"));
        }
        if (notificationSettings.containsKey("eventRemindersHours")) {
            settings.setEventRemindersHours((Integer) notificationSettings.get("eventRemindersHours"));
        }

        userSettingsRepository.save(settings);
        log.info("Updated notification settings for user: {}", userId);
    }

    @Transactional
    public void updatePrivacySettings(UUID userId, Map<String, Object> privacySettings) {
        UserSettings settings = userSettingsRepository.findByUserId(userId)
            .orElse(createDefaultSettings(userId));

        if (privacySettings.containsKey("profileVisibility")) {
            String visibility = (String) privacySettings.get("profileVisibility");
            settings.setProfileVisibility(UserSettings.ProfileVisibility.valueOf(visibility.toUpperCase()));
        }
        if (privacySettings.containsKey("showDonationHistory")) {
            settings.setShowDonationHistory((Boolean) privacySettings.get("showDonationHistory"));
        }
        if (privacySettings.containsKey("allowDirectMessages")) {
            settings.setAllowDirectMessages((Boolean) privacySettings.get("allowDirectMessages"));
        }
        if (privacySettings.containsKey("showOnlineStatus")) {
            settings.setShowOnlineStatus((Boolean) privacySettings.get("showOnlineStatus"));
        }
        if (privacySettings.containsKey("prayerRequestVisibility")) {
            String visibility = (String) privacySettings.get("prayerRequestVisibility");
            settings.setPrayerRequestVisibility(UserSettings.PrayerVisibility.valueOf(visibility.toUpperCase()));
        }
        if (privacySettings.containsKey("dataSharingAnalytics")) {
            settings.setDataSharingAnalytics((Boolean) privacySettings.get("dataSharingAnalytics"));
        }

        userSettingsRepository.save(settings);
        log.info("Updated privacy settings for user: {}", userId);
    }

    @Transactional
    public void updateAppearanceSettings(UUID userId, Map<String, Object> appearanceSettings) {
        UserSettings settings = userSettingsRepository.findByUserId(userId)
            .orElse(createDefaultSettings(userId));

        if (appearanceSettings.containsKey("theme")) {
            String theme = (String) appearanceSettings.get("theme");
            settings.setTheme(UserSettings.Theme.valueOf(theme.toUpperCase()));
        }
        if (appearanceSettings.containsKey("language")) {
            settings.setLanguage((String) appearanceSettings.get("language"));
        }
        if (appearanceSettings.containsKey("timezone")) {
            settings.setTimezone((String) appearanceSettings.get("timezone"));
        }
        if (appearanceSettings.containsKey("fontSize")) {
            String fontSize = (String) appearanceSettings.get("fontSize");
            settings.setFontSize(UserSettings.FontSize.valueOf(fontSize.toUpperCase()));
        }
        if (appearanceSettings.containsKey("highContrastMode")) {
            settings.setHighContrastMode((Boolean) appearanceSettings.get("highContrastMode"));
        }
        if (appearanceSettings.containsKey("reduceMotion")) {
            settings.setReduceMotion((Boolean) appearanceSettings.get("reduceMotion"));
        }
        if (appearanceSettings.containsKey("screenReaderOptimized")) {
            settings.setScreenReaderOptimized((Boolean) appearanceSettings.get("screenReaderOptimized"));
        }

        userSettingsRepository.save(settings);
        log.info("Updated appearance settings for user: {}", userId);
    }

    @Transactional
    public void updateFcmToken(UUID userId, String fcmToken) {
        userSettingsRepository.updateFcmToken(userId, fcmToken);
        log.info("Updated FCM token for user: {}", userId);
    }

    public void sendTestNotification(UUID userId) {
        try {
            UserSettings settings = userSettingsRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("User settings not found"));

            if (settings.isPushNotifications() && settings.getFcmToken() != null) {
                notificationService.sendNotification(
                    settings.getFcmToken(),
                    "Test Notification",
                    "This is a test notification from your Church App! 🎉",
                    Collections.emptyMap()
                );
                log.info("Sent test notification to user: {}", userId);
            } else {
                throw new RuntimeException("Push notifications not enabled or FCM token not found");
            }
        } catch (Exception e) {
            log.error("Failed to send test notification to user: {}", userId, e);
            throw new RuntimeException("Failed to send test notification", e);
        }
    }

    @Transactional
    public void requestAccountDeletion(UUID userId, String reason, String password) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        // Verify password
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new RuntimeException("Invalid password");
        }

        // TODO: Implement account deletion workflow
        // - Send confirmation email
        // - Schedule deletion after grace period
        // - Notify admins

        log.info("Account deletion requested for user: {} with reason: {}", userId, reason);
    }

    @Transactional
    public String createUserBackup(UUID userId) {
        try {
            // TODO: Implement actual backup creation
            String backupId = UUID.randomUUID().toString();

            // Update last backup date
            userSettingsRepository.updateLastBackupDate(userId, LocalDateTime.now());

            log.info("Created backup for user: {} with ID: {}", userId, backupId);
            return backupId;
        } catch (Exception e) {
            log.error("Failed to create backup for user: {}", userId, e);
            throw new RuntimeException("Failed to create backup", e);
        }
    }

    public Map<String, Object> getSystemInfo() {
        Map<String, Object> systemInfo = new HashMap<>();
        systemInfo.put("appVersion", appVersion);
        systemInfo.put("buildDate", buildDate);
        systemInfo.put("platform", "Web/Mobile");
        systemInfo.put("lastUpdated", LocalDateTime.now());

        // Add runtime info
        Runtime runtime = Runtime.getRuntime();
        Map<String, Object> runtimeInfo = new HashMap<>();
        runtimeInfo.put("javaVersion", System.getProperty("java.version"));
        runtimeInfo.put("totalMemory", runtime.totalMemory());
        runtimeInfo.put("freeMemory", runtime.freeMemory());
        runtimeInfo.put("maxMemory", runtime.maxMemory());
        systemInfo.put("runtime", runtimeInfo);

        return systemInfo;
    }

    public Map<String, Object> getHelpContent(String category, String search) {
        Map<String, Object> helpContent = new HashMap<>();

        // Help categories
        List<Map<String, Object>> categories = Arrays.asList(
            createHelpCategory("getting-started", "Getting Started", "🚀"),
            createHelpCategory("profile", "Profile & Account", "👤"),
            createHelpCategory("prayers", "Prayer Requests", "🙏"),
            createHelpCategory("chats", "Group Chats", "💬"),
            createHelpCategory("events", "Events & Calendar", "📅"),
            createHelpCategory("donations", "Giving & Donations", "💰"),
            createHelpCategory("notifications", "Notifications", "🔔"),
            createHelpCategory("privacy", "Privacy & Security", "🔒"),
            createHelpCategory("troubleshooting", "Troubleshooting", "🔧"),
            createHelpCategory("contact", "Contact Support", "📞")
        );

        // FAQ items
        List<Map<String, Object>> faqItems = createFaqItems();

        // Filter by category or search if provided
        if (category != null) {
            faqItems = faqItems.stream()
                .filter(item -> category.equals(item.get("category")))
                .collect(java.util.stream.Collectors.toList());
        }

        if (search != null && !search.trim().isEmpty()) {
            String searchLower = search.toLowerCase();
            faqItems = faqItems.stream()
                .filter(item -> {
                    String question = ((String) item.get("question")).toLowerCase();
                    String answer = ((String) item.get("answer")).toLowerCase();
                    return question.contains(searchLower) || answer.contains(searchLower);
                })
                .collect(java.util.stream.Collectors.toList());
        }

        helpContent.put("categories", categories);
        helpContent.put("faqItems", faqItems);
        helpContent.put("supportEmail", "support@yourchurch.org");
        helpContent.put("supportPhone", "+1 (555) 123-4567");

        return helpContent;
    }

    public String submitFeedback(UUID userId, Map<String, String> feedback) {
        String ticketId = "TICKET-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        // TODO: Implement actual feedback submission
        // - Save to database
        // - Send email to support team
        // - Create support ticket

        log.info("Feedback submitted by user: {} with ticket ID: {}", userId, ticketId);
        return ticketId;
    }

    @Transactional
    public UserSettingsResponse resetToDefaults(UUID userId) {
        // Delete existing settings
        userSettingsRepository.deleteById(userId);

        // Create new default settings
        UserSettings defaultSettings = createDefaultSettings(userId);
        defaultSettings = userSettingsRepository.save(defaultSettings);

        log.info("Reset settings to defaults for user: {}", userId);
        return UserSettingsResponse.fromEntity(defaultSettings);
    }

    // Helper methods
    private UserSettings createDefaultSettings(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        return UserSettings.builder()
            .userId(userId)
            .user(user)
            .emailNotifications(true)
            .pushNotifications(true)
            .prayerNotifications(true)
            .announcementNotifications(true)
            .eventNotifications(true)
            .chatNotifications(true)
            .donationReminders(true)
            .weeklyDigest(true)
            .profileVisibility(UserSettings.ProfileVisibility.CHURCH_MEMBERS)
            .showDonationHistory(false)
            .allowDirectMessages(true)
            .showOnlineStatus(true)
            .prayerRequestVisibility(UserSettings.PrayerVisibility.CHURCH_MEMBERS)
            .theme(UserSettings.Theme.LIGHT)
            .language("en")
            .timezone("UTC")
            .fontSize(UserSettings.FontSize.MEDIUM)
            .preferredContactMethod(UserSettings.ContactMethod.EMAIL)
            .newsletterSubscription(true)
            .eventRemindersHours(24)
            .dataSharingAnalytics(true)
            .autoBackupEnabled(true)
            .highContrastMode(false)
            .reduceMotion(false)
            .screenReaderOptimized(false)
            .build();
    }

    private void updateSettingsFromMap(UserSettings settings, Map<String, Object> updates) {
        // This is a comprehensive update method that handles all setting types
        updates.forEach((key, value) -> {
            try {
                switch (key) {
                    // Notification settings
                    case "emailNotifications":
                        settings.setEmailNotifications((Boolean) value);
                        break;
                    case "pushNotifications":
                        settings.setPushNotifications((Boolean) value);
                        break;
                    case "prayerNotifications":
                        settings.setPrayerNotifications((Boolean) value);
                        break;
                    case "announcementNotifications":
                        settings.setAnnouncementNotifications((Boolean) value);
                        break;
                    case "eventNotifications":
                        settings.setEventNotifications((Boolean) value);
                        break;
                    case "chatNotifications":
                        settings.setChatNotifications((Boolean) value);
                        break;
                    case "donationReminders":
                        settings.setDonationReminders((Boolean) value);
                        break;
                    case "weeklyDigest":
                        settings.setWeeklyDigest((Boolean) value);
                        break;

                    // Privacy settings
                    case "profileVisibility":
                        settings.setProfileVisibility(UserSettings.ProfileVisibility.valueOf(((String) value).toUpperCase()));
                        break;
                    case "showDonationHistory":
                        settings.setShowDonationHistory((Boolean) value);
                        break;
                    case "allowDirectMessages":
                        settings.setAllowDirectMessages((Boolean) value);
                        break;
                    case "showOnlineStatus":
                        settings.setShowOnlineStatus((Boolean) value);
                        break;
                    case "prayerRequestVisibility":
                        settings.setPrayerRequestVisibility(UserSettings.PrayerVisibility.valueOf(((String) value).toUpperCase()));
                        break;

                    // Appearance settings
                    case "theme":
                        settings.setTheme(UserSettings.Theme.valueOf(((String) value).toUpperCase()));
                        break;
                    case "language":
                        settings.setLanguage((String) value);
                        break;
                    case "timezone":
                        settings.setTimezone((String) value);
                        break;
                    case "fontSize":
                        settings.setFontSize(UserSettings.FontSize.valueOf(((String) value).toUpperCase()));
                        break;

                    // Communication preferences
                    case "preferredContactMethod":
                        settings.setPreferredContactMethod(UserSettings.ContactMethod.valueOf(((String) value).toUpperCase()));
                        break;
                    case "newsletterSubscription":
                        settings.setNewsletterSubscription((Boolean) value);
                        break;
                    case "eventRemindersHours":
                        settings.setEventRemindersHours((Integer) value);
                        break;

                    // Data & Privacy
                    case "dataSharingAnalytics":
                        settings.setDataSharingAnalytics((Boolean) value);
                        break;
                    case "autoBackupEnabled":
                        settings.setAutoBackupEnabled((Boolean) value);
                        break;

                    // Accessibility
                    case "highContrastMode":
                        settings.setHighContrastMode((Boolean) value);
                        break;
                    case "reduceMotion":
                        settings.setReduceMotion((Boolean) value);
                        break;
                    case "screenReaderOptimized":
                        settings.setScreenReaderOptimized((Boolean) value);
                        break;

                    default:
                        log.warn("Unknown setting key: {}", key);
                }
            } catch (Exception e) {
                log.error("Error updating setting {}: {}", key, e.getMessage());
            }
        });
    }

    private Map<String, Object> createHelpCategory(String id, String title, String icon) {
        Map<String, Object> category = new HashMap<>();
        category.put("id", id);
        category.put("title", title);
        category.put("icon", icon);
        return category;
    }

    private List<Map<String, Object>> createFaqItems() {
        return Arrays.asList(
            createFaqItem("getting-started", "How do I get started with the Church App?",
                "Welcome! Start by completing your profile, joining the main church chat, and exploring prayer requests. Check out the announcements for upcoming events and feel free to introduce yourself to the community."),

            createFaqItem("profile", "How do I update my profile picture?",
                "Go to your profile page and click the camera icon on your current picture. You can upload a new photo from your device or take a new one using your camera."),

            createFaqItem("prayers", "Can I submit anonymous prayer requests?",
                "Yes! When creating a prayer request, simply toggle the 'Submit Anonymously' option. Your request will be visible to the community but your name won't be shown."),

            createFaqItem("chats", "How do I join different chat groups?",
                "Navigate to the Chats section and browse available groups. Some groups are open to all members, while others may require an invitation from group moderators."),

            createFaqItem("events", "How do I RSVP to church events?",
                "Click on any event in the calendar or events list, then select your RSVP status: Yes, No, or Maybe. You'll receive reminder notifications based on your settings."),

            createFaqItem("donations", "Is my donation information secure?",
                "Absolutely! We use bank-level encryption and secure payment processing through Stripe. Your financial information is never stored on our servers."),

            createFaqItem("notifications", "How do I customize my notification preferences?",
                "Go to Settings > Notifications to customize what alerts you receive. You can control email notifications, push notifications, and the frequency of updates."),

            createFaqItem("privacy", "Who can see my personal information?",
                "You control your privacy! In Settings > Privacy, you can choose who sees your profile, donation history, and prayer requests. Options range from public to church members only."),

            createFaqItem("troubleshooting", "The app is running slowly. What can I do?",
                "Try refreshing the app, checking your internet connection, or clearing your browser cache. If issues persist, please contact our support team."),

            createFaqItem("contact", "How do I contact support?",
                "You can reach our support team through the feedback form in Settings, email us at support@yourchurch.org, or call us at (555) 123-4567 during business hours.")
        );
    }

    private Map<String, Object> createFaqItem(String category, String question, String answer) {
        Map<String, Object> item = new HashMap<>();
        item.put("id", UUID.randomUUID().toString());
        item.put("category", category);
        item.put("question", question);
        item.put("answer", answer);
        return item;
    }
}