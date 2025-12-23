package com.churchapp.controller;

import com.churchapp.dto.PrayerNotificationEvent;
import com.churchapp.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Test controller for prayer notification WebSocket functionality
 * This controller provides endpoints to test prayer notifications
 */
@RestController
@RequestMapping("/test/prayer-notifications")
@RequiredArgsConstructor
@Slf4j
public class PrayerNotificationTestController {
    
    private final WebSocketPrayerController webSocketPrayerController;
    private final UserProfileService userProfileService;
    
    /**
     * Test endpoint to send a sample prayer notification
     */
    @PostMapping("/send-test-notification")
    public ResponseEntity<?> sendTestNotification(@AuthenticationPrincipal User user) {
        try {
            // Get user profile
            var userProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            
            // Create a test prayer notification event
            PrayerNotificationEvent testEvent = PrayerNotificationEvent.builder()
                .eventType("new_prayer")
                .prayerRequestId(UUID.randomUUID())
                .userId(userProfile.getUserId())
                .userEmail(user.getUsername())
                .userName(userProfile.getName())
                .title("Test Prayer Notification")
                .message("This is a test prayer notification to verify WebSocket functionality")
                .timestamp(java.time.LocalDateTime.now().toString())
                .actionUrl("/prayers/test")
                .build();
            
            // Send the notification
            webSocketPrayerController.sendPersonalPrayerNotification(user.getUsername(), testEvent);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Test prayer notification sent successfully");
            response.put("userEmail", user.getUsername());
            
            log.info("Test prayer notification sent to user: {}", user.getUsername());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Error sending test prayer notification: {}", e.getMessage());
            
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "Failed to send test notification: " + e.getMessage());
            
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    /**
     * Test endpoint to broadcast a sample prayer event to all users
     */
    @PostMapping("/broadcast-test-event")
    public ResponseEntity<?> broadcastTestEvent(@AuthenticationPrincipal User user) {
        try {
            // Get user profile
            var userProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            
            // Create a test prayer notification event
            PrayerNotificationEvent testEvent = PrayerNotificationEvent.builder()
                .eventType("prayer_interaction")
                .prayerRequestId(UUID.randomUUID())
                .userId(userProfile.getUserId())
                .userEmail(user.getUsername())
                .userName(userProfile.getName())
                .title("Test Prayer Broadcast")
                .message("This is a test prayer broadcast to all connected users")
                .timestamp(java.time.LocalDateTime.now().toString())
                .actionUrl("/prayers/test")
                .build();
            
            // Broadcast the event
            webSocketPrayerController.broadcastPrayerEvent(testEvent);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Test prayer event broadcasted successfully");
            response.put("broadcastBy", user.getUsername());
            
            log.info("Test prayer event broadcasted by user: {}", user.getUsername());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Error broadcasting test prayer event: {}", e.getMessage());
            
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "Failed to broadcast test event: " + e.getMessage());
            
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    /**
     * Health check endpoint for prayer notification system
     */
    @GetMapping("/health")
    public ResponseEntity<?> healthCheck() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "healthy");
        response.put("service", "prayer-notifications");
        response.put("websocketController", webSocketPrayerController != null ? "available" : "unavailable");
        response.put("timestamp", java.time.LocalDateTime.now().toString());
        
        return ResponseEntity.ok(response);
    }
}
