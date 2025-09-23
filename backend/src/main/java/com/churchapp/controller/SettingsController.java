package com.churchapp.controller;

import com.churchapp.dto.UserSettingsResponse;
import com.churchapp.entity.UserSettings;
import com.churchapp.service.SettingsService;
import com.churchapp.service.UserDataExportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/settings")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8100", "capacitor://localhost"})
public class SettingsController {

    private final SettingsService settingsService;
    private final UserDataExportService userDataExportService;

    /**
     * Get user settings
     */
    @GetMapping
    public ResponseEntity<UserSettingsResponse> getUserSettings(Authentication auth) {
        try {
            UUID userId = UUID.fromString(auth.getName());
            UserSettingsResponse settings = settingsService.getUserSettings(userId);
            return ResponseEntity.ok(settings);
        } catch (Exception e) {
            log.error("Error fetching user settings: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch user settings", e);
        }
    }

    /**
     * Update user settings
     */
    @PutMapping
    public ResponseEntity<UserSettingsResponse> updateUserSettings(
            @RequestBody Map<String, Object> updates,
            Authentication auth) {
        try {
            UUID userId = UUID.fromString(auth.getName());
            UserSettingsResponse settings = settingsService.updateUserSettings(userId, updates);
            return ResponseEntity.ok(settings);
        } catch (Exception e) {
            log.error("Error updating user settings: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to update user settings", e);
        }
    }

    /**
     * Update notification preferences
     */
    @PutMapping("/notifications")
    public ResponseEntity<Map<String, String>> updateNotificationSettings(
            @RequestBody Map<String, Object> notificationSettings,
            Authentication auth) {
        try {
            UUID userId = UUID.fromString(auth.getName());
            settingsService.updateNotificationSettings(userId, notificationSettings);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Notification settings updated successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error updating notification settings: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to update notification settings", e);
        }
    }

    /**
     * Update privacy settings
     */
    @PutMapping("/privacy")
    public ResponseEntity<Map<String, String>> updatePrivacySettings(
            @RequestBody Map<String, Object> privacySettings,
            Authentication auth) {
        try {
            UUID userId = UUID.fromString(auth.getName());
            settingsService.updatePrivacySettings(userId, privacySettings);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Privacy settings updated successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error updating privacy settings: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to update privacy settings", e);
        }
    }

    /**
     * Update appearance settings (theme, font size, etc.)
     */
    @PutMapping("/appearance")
    public ResponseEntity<Map<String, String>> updateAppearanceSettings(
            @RequestBody Map<String, Object> appearanceSettings,
            Authentication auth) {
        try {
            UUID userId = UUID.fromString(auth.getName());
            settingsService.updateAppearanceSettings(userId, appearanceSettings);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Appearance settings updated successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error updating appearance settings: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to update appearance settings", e);
        }
    }

    /**
     * Register FCM token for push notifications
     */
    @PostMapping("/fcm-token")
    public ResponseEntity<Map<String, String>> registerFcmToken(
            @RequestBody Map<String, String> request,
            Authentication auth) {
        try {
            UUID userId = UUID.fromString(auth.getName());
            String fcmToken = request.get("token");

            settingsService.updateFcmToken(userId, fcmToken);

            Map<String, String> response = new HashMap<>();
            response.put("message", "FCM token registered successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error registering FCM token: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to register FCM token", e);
        }
    }

    /**
     * Test push notification
     */
    @PostMapping("/test-notification")
    public ResponseEntity<Map<String, String>> testNotification(Authentication auth) {
        try {
            UUID userId = UUID.fromString(auth.getName());
            settingsService.sendTestNotification(userId);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Test notification sent successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error sending test notification: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to send test notification", e);
        }
    }

    /**
     * Export user data
     */
    @GetMapping("/export-data")
    public ResponseEntity<byte[]> exportUserData(
            @RequestParam(defaultValue = "json") String format,
            Authentication auth) {
        try {
            UUID userId = UUID.fromString(auth.getName());

            byte[] exportData = userDataExportService.exportUserData(userId, format);
            String filename = String.format("user_data_%s.%s", userId, format);

            MediaType mediaType = format.equals("pdf") ?
                MediaType.APPLICATION_PDF :
                MediaType.APPLICATION_JSON;

            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(mediaType)
                .body(exportData);

        } catch (Exception e) {
            log.error("Error exporting user data: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to export user data", e);
        }
    }

    /**
     * Request account deletion
     */
    @PostMapping("/delete-account")
    public ResponseEntity<Map<String, String>> requestAccountDeletion(
            @RequestBody Map<String, String> request,
            Authentication auth) {
        try {
            UUID userId = UUID.fromString(auth.getName());
            String reason = request.get("reason");
            String password = request.get("password");

            settingsService.requestAccountDeletion(userId, reason, password);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Account deletion request submitted successfully");
            response.put("info", "You will receive a confirmation email within 24 hours");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error requesting account deletion: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to request account deletion", e);
        }
    }

    /**
     * Create data backup
     */
    @PostMapping("/backup")
    public ResponseEntity<Map<String, String>> createBackup(Authentication auth) {
        try {
            UUID userId = UUID.fromString(auth.getName());
            String backupId = settingsService.createUserBackup(userId);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Backup created successfully");
            response.put("backupId", backupId);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error creating backup: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create backup", e);
        }
    }

    /**
     * Get app version and system info
     */
    @GetMapping("/system-info")
    public ResponseEntity<Map<String, Object>> getSystemInfo() {
        try {
            Map<String, Object> systemInfo = settingsService.getSystemInfo();
            return ResponseEntity.ok(systemInfo);
        } catch (Exception e) {
            log.error("Error fetching system info: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch system info", e);
        }
    }

    /**
     * Get help articles and FAQ
     */
    @GetMapping("/help")
    public ResponseEntity<Map<String, Object>> getHelpContent(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search) {
        try {
            Map<String, Object> helpContent = settingsService.getHelpContent(category, search);
            return ResponseEntity.ok(helpContent);
        } catch (Exception e) {
            log.error("Error fetching help content: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch help content", e);
        }
    }

    /**
     * Submit feedback or support request
     */
    @PostMapping("/feedback")
    public ResponseEntity<Map<String, String>> submitFeedback(
            @RequestBody Map<String, String> feedback,
            Authentication auth) {
        try {
            UUID userId = UUID.fromString(auth.getName());
            String ticketId = settingsService.submitFeedback(userId, feedback);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Feedback submitted successfully");
            response.put("ticketId", ticketId);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error submitting feedback: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to submit feedback", e);
        }
    }

    /**
     * Reset settings to default
     */
    @PostMapping("/reset")
    public ResponseEntity<UserSettingsResponse> resetToDefaults(Authentication auth) {
        try {
            UUID userId = UUID.fromString(auth.getName());
            UserSettingsResponse settings = settingsService.resetToDefaults(userId);
            return ResponseEntity.ok(settings);
        } catch (Exception e) {
            log.error("Error resetting settings: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to reset settings", e);
        }
    }
}