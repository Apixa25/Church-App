package com.churchapp.controller;

import com.churchapp.entity.User;
import com.churchapp.repository.UserRepository;
import com.churchapp.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * REST Controller for managing push notifications
 */
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Slf4j
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    /**
     * Register or update a user's FCM token
     * Called when the user grants notification permission or token refreshes
     */
    @PostMapping("/register-token")
    public ResponseEntity<?> registerToken(
            @RequestBody Map<String, String> request,
            Authentication authentication) {
        try {
            String email = authentication.getName();
            String fcmToken = request.get("token");

            if (fcmToken == null || fcmToken.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "FCM token is required"
                ));
            }

            // Find user and update FCM token
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            user.setFcmToken(fcmToken);
            userRepository.save(user);

            log.info("FCM token registered for user: {}", email);

            return ResponseEntity.ok(Map.of(
                    "message", "FCM token registered successfully",
                    "registered", true
            ));

        } catch (Exception e) {
            log.error("Failed to register FCM token", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Failed to register FCM token: " + e.getMessage()
            ));
        }
    }

    /**
     * Remove a user's FCM token (when they disable notifications or logout)
     */
    @DeleteMapping("/unregister-token")
    public ResponseEntity<?> unregisterToken(Authentication authentication) {
        try {
            String email = authentication.getName();

            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            user.setFcmToken(null);
            userRepository.save(user);

            log.info("FCM token unregistered for user: {}", email);

            return ResponseEntity.ok(Map.of(
                    "message", "FCM token unregistered successfully"
            ));

        } catch (Exception e) {
            log.error("Failed to unregister FCM token", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Failed to unregister FCM token: " + e.getMessage()
            ));
        }
    }

    /**
     * Send a test notification to the current user
     * Useful for testing notification setup
     */
    @PostMapping("/test")
    public ResponseEntity<?> sendTestNotification(Authentication authentication) {
        try {
            String email = authentication.getName();

            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            if (user.getFcmToken() == null || user.getFcmToken().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "No FCM token registered for this user. Please enable notifications first."
                ));
            }

            // Send test notification
            Map<String, String> data = new HashMap<>();
            data.put("type", "test");
            data.put("userId", user.getId().toString());

            notificationService.sendNotification(
                    user.getFcmToken(),
                    "TheGathering Test",
                    "Your notifications are working! 🎉",
                    data
            );

            log.info("Test notification sent to user: {}", email);

            return ResponseEntity.ok(Map.of(
                    "message", "Test notification sent successfully"
            ));

        } catch (Exception e) {
            log.error("Failed to send test notification", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Failed to send test notification: " + e.getMessage()
            ));
        }
    }

    /**
     * Check notification registration status
     */
    @GetMapping("/status")
    public ResponseEntity<?> getNotificationStatus(Authentication authentication) {
        try {
            String email = authentication.getName();

            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            boolean hasToken = user.getFcmToken() != null && !user.getFcmToken().trim().isEmpty();

            return ResponseEntity.ok(Map.of(
                    "registered", hasToken,
                    "message", hasToken
                            ? "Push notifications are enabled"
                            : "Push notifications are not enabled"
            ));

        } catch (Exception e) {
            log.error("Failed to get notification status", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Failed to get notification status: " + e.getMessage()
            ));
        }
    }
}
