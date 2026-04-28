package com.churchapp.controller;

import com.churchapp.entity.User;
import com.churchapp.repository.UserRepository;
import com.churchapp.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * REST Controller for managing push notifications
 */
@RestController
@RequestMapping("/notifications")
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
            String fcmToken = request.get("token");

            if (fcmToken == null || fcmToken.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "FCM token is required"
                ));
            }

            Optional<User> userResult = resolveAuthenticatedUser(authentication);
            if (userResult.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                        "error", "Authenticated user not found for notification registration"
                ));
            }

            User user = userResult.get();
            user.setFcmToken(fcmToken);
            userRepository.save(user);

            log.info("FCM token registered for user: {}", user.getEmail());

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
            Optional<User> userResult = resolveAuthenticatedUser(authentication);
            if (userResult.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                        "error", "Authenticated user not found for notification registration"
                ));
            }

            User user = userResult.get();
            user.setFcmToken(null);
            userRepository.save(user);

            log.info("FCM token unregistered for user: {}", user.getEmail());

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
            Optional<User> userResult = resolveAuthenticatedUser(authentication);
            if (userResult.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                        "error", "Authenticated user not found for notification registration"
                ));
            }

            User user = userResult.get();
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

            log.info("Test notification sent to user: {}", user.getEmail());

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
            Optional<User> userResult = resolveAuthenticatedUser(authentication);
            if (userResult.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                        "registered", false,
                        "message", "Push notifications are not connected to the current login session"
                ));
            }

            User user = userResult.get();
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

    private Optional<User> resolveAuthenticatedUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return Optional.empty();
        }

        Object principal = authentication.getPrincipal();
        String email = null;

        if (principal instanceof UserDetails userDetails) {
            email = userDetails.getUsername();
        } else if (principal instanceof OAuth2User oauth2User) {
            email = oauth2User.getAttribute("email");
        }

        if ((email == null || email.isBlank()) && authentication.getName() != null) {
            email = authentication.getName();
        }

        if (email == null || email.isBlank()) {
            log.warn("Unable to resolve notification user email from authentication type: {}",
                    authentication.getClass().getName());
            return Optional.empty();
        }

        Optional<User> user = userRepository.findByEmail(email);
        if (user.isEmpty()) {
            log.warn("Unable to find notification user by resolved email/name: {}", email);
        }

        return user;
    }
}
