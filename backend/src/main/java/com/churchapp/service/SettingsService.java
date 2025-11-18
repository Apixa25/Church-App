package com.churchapp.service;

import com.churchapp.dto.UserSettingsResponse;
import com.churchapp.entity.*;
import com.churchapp.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.hibernate.LazyInitializationException;

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
    private final EmailService emailService;
    private final UserDataExportService userDataExportService;
    private final FeedbackRepository feedbackRepository;
    private final UserBackupRepository userBackupRepository;
    private final AccountDeletionRequestRepository accountDeletionRequestRepository;
    private final ObjectMapper objectMapper;

    @Value("${app.version:1.0.0}")
    private String appVersion;

    @Value("${app.build-date:}")
    private String buildDate;

    @Value("${app.base-url:http://localhost:8083}")
    private String baseUrl;

    @Value("${account.deletion.grace-period-days:7}")
    private int gracePeriodDays;

    public UserSettingsResponse getUserSettings(UUID userId) {
        UserSettings settings = userSettingsRepository.findByUserId(userId)
            .orElse(createDefaultSettings(userId));
        return UserSettingsResponse.fromEntity(settings);
    }

    @Transactional
    public UserSettingsResponse updateUserSettings(UUID userId, Map<String, Object> updates) {
        // Always get a reference to the user first - this ensures it's in the persistence context
        User user = userRepository.getReferenceById(userId);
        
        UserSettings settings = userSettingsRepository.findByUserId(userId)
            .orElseGet(() -> {
                UserSettings newSettings = createDefaultSettings(userId);
                newSettings.setUser(user);
                newSettings.setUserId(userId);
                return newSettings;
            });
        
        // Always ensure user relationship is set
        if (settings.getUser() == null) {
            settings.setUser(user);
        }
        if (settings.getUserId() == null) {
            settings.setUserId(userId);
        }
        
        // Explicitly set the user reference to ensure it's attached
        settings.setUser(user);

        updateSettingsFromMap(settings, updates);
        settings = userSettingsRepository.saveAndFlush(settings);

        log.info("Updated settings for user: {}", userId);
        return UserSettingsResponse.fromEntity(settings);
    }

    @Transactional
    public void updateNotificationSettings(UUID userId, Map<String, Object> notificationSettings) {
        // Always get a reference to the user first - this ensures it's in the persistence context
        User user = userRepository.getReferenceById(userId);
        
        UserSettings settings = userSettingsRepository.findByUserId(userId)
            .orElseGet(() -> {
                UserSettings newSettings = createDefaultSettings(userId);
                newSettings.setUser(user);
                newSettings.setUserId(userId);
                return newSettings;
            });
        
        // Always ensure user relationship is set
        if (settings.getUser() == null) {
            settings.setUser(user);
        }
        if (settings.getUserId() == null) {
            settings.setUserId(userId);
        }
        
        // Explicitly set the user reference to ensure it's attached
        settings.setUser(user);

        // Update notification preferences
        if (notificationSettings.containsKey("emailNotifications")) {
            settings.setEmailNotifications(convertToBoolean(notificationSettings.get("emailNotifications")));
        }
        if (notificationSettings.containsKey("pushNotifications")) {
            settings.setPushNotifications(convertToBoolean(notificationSettings.get("pushNotifications")));
        }
        if (notificationSettings.containsKey("prayerNotifications")) {
            settings.setPrayerNotifications(convertToBoolean(notificationSettings.get("prayerNotifications")));
        }
        if (notificationSettings.containsKey("announcementNotifications")) {
            settings.setAnnouncementNotifications(convertToBoolean(notificationSettings.get("announcementNotifications")));
        }
        if (notificationSettings.containsKey("eventNotifications")) {
            settings.setEventNotifications(convertToBoolean(notificationSettings.get("eventNotifications")));
        }
        if (notificationSettings.containsKey("chatNotifications")) {
            settings.setChatNotifications(convertToBoolean(notificationSettings.get("chatNotifications")));
        }
        if (notificationSettings.containsKey("donationReminders")) {
            settings.setDonationReminders(convertToBoolean(notificationSettings.get("donationReminders")));
        }
        if (notificationSettings.containsKey("weeklyDigest")) {
            settings.setWeeklyDigest(convertToBoolean(notificationSettings.get("weeklyDigest")));
        }
        if (notificationSettings.containsKey("eventRemindersHours")) {
            Object hoursValue = notificationSettings.get("eventRemindersHours");
            if (hoursValue != null) {
                if (hoursValue instanceof Number) {
                    settings.setEventRemindersHours(((Number) hoursValue).intValue());
                } else if (hoursValue instanceof String) {
                    try {
                        settings.setEventRemindersHours(Integer.parseInt((String) hoursValue));
                    } catch (NumberFormatException e) {
                        log.warn("Invalid eventRemindersHours value: {}, defaulting to 24", hoursValue);
                        settings.setEventRemindersHours(24);
                    }
                }
            }
        }

        userSettingsRepository.saveAndFlush(settings);
        log.info("Updated notification settings for user: {}", userId);
    }

    @Transactional
    public void updatePrivacySettings(UUID userId, Map<String, Object> privacySettings) {
        try {
            // Load UserSettings with user relationship (EntityGraph ensures user is loaded eagerly)
            UserSettings settings = userSettingsRepository.findByUserId(userId)
                .orElseGet(() -> {
                    // For new settings, load the user fully to ensure @MapsId works correctly
                    User user = userRepository.findById(userId)
                        .orElseThrow(() -> new RuntimeException("User not found: " + userId));
                    UserSettings newSettings = createDefaultSettings(userId);
                    // Set user - @MapsId will automatically derive userId from user.getId()
                    newSettings.setUser(user);
                    return newSettings;
                });
            
            // For existing settings, ensure user relationship is properly initialized
            // @EntityGraph should have loaded it, but initialize if it's a lazy proxy
            if (settings.getUser() == null) {
                // Load user fully to ensure it's managed in the persistence context
                User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found: " + userId));
                settings.setUser(user);
            } else {
                // User relationship exists, but ensure it's initialized (not a lazy proxy)
                // Access getId() to force initialization if it's a proxy
                try {
                    UUID userEntityId = settings.getUser().getId();
                    if (userEntityId == null || !userEntityId.equals(userId)) {
                        // User relationship is not properly set, reload it
                        User user = userRepository.findById(userId)
                            .orElseThrow(() -> new RuntimeException("User not found: " + userId));
                        settings.setUser(user);
                    }
                } catch (LazyInitializationException e) {
                    // If it's an uninitialized proxy, load the user
                    User user = userRepository.findById(userId)
                        .orElseThrow(() -> new RuntimeException("User not found: " + userId));
                    settings.setUser(user);
                }
            }
            
            // IMPORTANT: Never manually set userId when using @MapsId
            // Hibernate will derive it from settings.getUser().getId() automatically

            if (privacySettings.containsKey("profileVisibility")) {
                try {
                    String visibility = String.valueOf(privacySettings.get("profileVisibility"));
                    settings.setProfileVisibility(UserSettings.ProfileVisibility.valueOf(visibility.toUpperCase()));
                } catch (IllegalArgumentException e) {
                    log.error("Invalid profileVisibility value: {}", privacySettings.get("profileVisibility"), e);
                    throw new RuntimeException("Invalid profile visibility value: " + privacySettings.get("profileVisibility"));
                }
            }
            if (privacySettings.containsKey("showDonationHistory")) {
                settings.setShowDonationHistory(convertToBoolean(privacySettings.get("showDonationHistory")));
            }
            if (privacySettings.containsKey("allowDirectMessages")) {
                settings.setAllowDirectMessages(convertToBoolean(privacySettings.get("allowDirectMessages")));
            }
            if (privacySettings.containsKey("showOnlineStatus")) {
                settings.setShowOnlineStatus(convertToBoolean(privacySettings.get("showOnlineStatus")));
            }
            if (privacySettings.containsKey("prayerRequestVisibility")) {
                try {
                    String visibility = String.valueOf(privacySettings.get("prayerRequestVisibility"));
                    settings.setPrayerRequestVisibility(UserSettings.PrayerVisibility.valueOf(visibility.toUpperCase()));
                } catch (IllegalArgumentException e) {
                    log.error("Invalid prayerRequestVisibility value: {}", privacySettings.get("prayerRequestVisibility"), e);
                    throw new RuntimeException("Invalid prayer request visibility value: " + privacySettings.get("prayerRequestVisibility"));
                }
            }
            if (privacySettings.containsKey("dataSharingAnalytics")) {
                settings.setDataSharingAnalytics(convertToBoolean(privacySettings.get("dataSharingAnalytics")));
            }
            if (privacySettings.containsKey("autoBackupEnabled")) {
                settings.setAutoBackupEnabled(convertToBoolean(privacySettings.get("autoBackupEnabled")));
            }

            // Save and flush to ensure entity is persisted immediately
            userSettingsRepository.saveAndFlush(settings);
            log.info("Updated privacy settings for user: {}", userId);
        } catch (RuntimeException e) {
            log.error("Error updating privacy settings for user {}: {}", userId, e.getMessage(), e);
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error updating privacy settings for user {}: {}", userId, e.getMessage(), e);
            throw new RuntimeException("Failed to update privacy settings: " + e.getMessage(), e);
        }
    }

    /**
     * Helper method to safely convert various types to boolean
     */
    private boolean convertToBoolean(Object value) {
        if (value == null) {
            return false;
        }
        if (value instanceof Boolean) {
            return (Boolean) value;
        }
        if (value instanceof String) {
            String str = ((String) value).trim().toLowerCase();
            return "true".equals(str) || "1".equals(str) || "yes".equals(str);
        }
        if (value instanceof Number) {
            return ((Number) value).intValue() != 0;
        }
        log.warn("Unexpected boolean value type: {} ({}), defaulting to false", value, value.getClass().getName());
        return false;
    }

    @Transactional
    public void updateAppearanceSettings(UUID userId, Map<String, Object> appearanceSettings) {
        // Always get a reference to the user first - this ensures it's in the persistence context
        User user = userRepository.getReferenceById(userId);
        
        UserSettings settings = userSettingsRepository.findByUserId(userId)
            .orElseGet(() -> {
                UserSettings newSettings = createDefaultSettings(userId);
                newSettings.setUser(user);
                newSettings.setUserId(userId);
                return newSettings;
            });
        
        // Always ensure user relationship is set
        if (settings.getUser() == null) {
            settings.setUser(user);
        }
        if (settings.getUserId() == null) {
            settings.setUserId(userId);
        }
        
        // Explicitly set the user reference to ensure it's attached
        settings.setUser(user);

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
            settings.setHighContrastMode(convertToBoolean(appearanceSettings.get("highContrastMode")));
        }
        if (appearanceSettings.containsKey("reduceMotion")) {
            settings.setReduceMotion(convertToBoolean(appearanceSettings.get("reduceMotion")));
        }
        if (appearanceSettings.containsKey("screenReaderOptimized")) {
            settings.setScreenReaderOptimized(convertToBoolean(appearanceSettings.get("screenReaderOptimized")));
        }

        userSettingsRepository.saveAndFlush(settings);
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

        // Check if user already has a pending or confirmed deletion request
        accountDeletionRequestRepository.findByUserId(userId)
            .ifPresent(existing -> {
                if ("PENDING".equals(existing.getStatus()) || "CONFIRMED".equals(existing.getStatus())) {
                    throw new RuntimeException("Account deletion request already exists");
                }
            });

        // Verify password (only if user has password set)
        if (user.getPasswordHash() != null && !user.getPasswordHash().isEmpty()) {
            if (password == null || !passwordEncoder.matches(password, user.getPasswordHash())) {
                throw new RuntimeException("Invalid password");
            }
        }

        // Generate confirmation token
        String confirmationToken = UUID.randomUUID().toString();

        // Create deletion request
        AccountDeletionRequest deletionRequest = AccountDeletionRequest.builder()
            .user(user)
            .reason(reason)
            .confirmationToken(confirmationToken)
            .status("PENDING")
            .requestedAt(LocalDateTime.now())
            .build();

        accountDeletionRequestRepository.save(deletionRequest);

        // Send confirmation email
        String confirmationUrl = baseUrl + "/api/settings/confirm-deletion?token=" + confirmationToken;
        try {
            emailService.sendAccountDeletionConfirmationEmail(
                user.getName(),
                user.getEmail(),
                confirmationToken,
                confirmationUrl
            );
        } catch (Exception e) {
            log.error("Failed to send deletion confirmation email: {}", e.getMessage(), e);
            // Continue - email failure shouldn't block the request
        }

        log.info("Account deletion requested for user: {} with reason: {}", userId, reason);
    }

    @Transactional
    public String createUserBackup(UUID userId) {
        try {
            log.info("Creating backup for user: {}", userId);

            User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

            // Generate backup ID
            String backupId = "BKP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

            // Collect user data
            Map<String, Object> userData = userDataExportService.collectUserData(userId);

            // Serialize to JSON
            String dataSnapshot = objectMapper.writeValueAsString(userData);

            // Calculate data size
            long fileSizeBytes = dataSnapshot.getBytes().length;

            // Create backup record
            UserBackup backup = UserBackup.builder()
                .user(user)
                .backupId(backupId)
                .dataSnapshot(dataSnapshot)
                .backupType("MANUAL")
                .status("COMPLETED")
                .createdAt(LocalDateTime.now())
                .fileSizeBytes(fileSizeBytes)
                // Set expiration to 90 days from now (GDPR compliance)
                .expiresAt(LocalDateTime.now().plusDays(90))
                .build();

            userBackupRepository.save(backup);

            // Update last backup date in user settings
            userSettingsRepository.updateLastBackupDate(userId, LocalDateTime.now());

            log.info("Created backup for user: {} with ID: {} (size: {} bytes)", userId, backupId, fileSizeBytes);
            return backupId;
        } catch (Exception e) {
            log.error("Failed to create backup for user: {}", userId, e);
            // Try to save failed backup record
            try {
                String backupId = "BKP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
                User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));
                
                UserBackup failedBackup = UserBackup.builder()
                    .user(user)
                    .backupId(backupId)
                    .backupType("MANUAL")
                    .status("FAILED")
                    .errorMessage(e.getMessage())
                    .createdAt(LocalDateTime.now())
                    .build();
                
                userBackupRepository.save(failedBackup);
            } catch (Exception ex) {
                log.error("Failed to save failed backup record: {}", ex.getMessage(), ex);
            }
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

    @Transactional
    public String submitFeedback(UUID userId, Map<String, String> feedback) {
        try {
            log.info("Submitting feedback from user: {}", userId);

            User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

            // Generate ticket ID
            String ticketId = "TICKET-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

            // Extract feedback data
            String type = feedback.getOrDefault("type", "other");
            String subject = feedback.getOrDefault("subject", "No Subject");
            String message = feedback.getOrDefault("message", "");
            String email = feedback.getOrDefault("email", user.getEmail());

            // Validate required fields
            if (message == null || message.trim().isEmpty()) {
                throw new RuntimeException("Feedback message is required");
            }

            // Create feedback record
            Feedback feedbackEntity = Feedback.builder()
                .user(user)
                .type(type)
                .subject(subject)
                .message(message)
                .email(email)
                .ticketId(ticketId)
                .status("PENDING")
                .createdAt(LocalDateTime.now())
                .build();

            feedbackRepository.save(feedbackEntity);

            // Send notification email to support team
            try {
                emailService.sendFeedbackNotification(
                    ticketId,
                    user.getName(),
                    email,
                    type,
                    subject,
                    message
                );
            } catch (Exception e) {
                log.error("Failed to send feedback notification email: {}", e.getMessage(), e);
                // Continue - email failure shouldn't block feedback submission
            }

            log.info("Feedback submitted by user: {} with ticket ID: {}", userId, ticketId);
            return ticketId;
        } catch (Exception e) {
            log.error("Failed to submit feedback for user: {}", userId, e);
            throw new RuntimeException("Failed to submit feedback: " + e.getMessage(), e);
        }
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