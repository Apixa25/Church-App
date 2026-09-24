package com.churchapp.controller;

import com.churchapp.dto.PrayerNotificationEvent;
import com.churchapp.service.PrayerTopics;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * WebSocket controller for prayer-related real-time notifications
 * Handles prayer request updates, interactions, and user-specific notifications
 */
@Controller
@RequiredArgsConstructor
@Slf4j
public class WebSocketPrayerController {
    
    private final SimpMessagingTemplate messagingTemplate;
    
    /**
     * Subscribe to general prayer request updates
     * Clients can subscribe to this to receive notifications about new prayers
     */
    @MessageMapping("/prayer/subscribe")
    public void subscribeToPrayerUpdates(Principal principal) {
        try {
            log.info("User {} subscribed to prayer updates", principal.getName());
            
            // Send confirmation message
            Map<String, Object> response = new HashMap<>();
            response.put("type", "subscription_confirmed");
            response.put("message", "Successfully subscribed to prayer notifications");
            response.put("timestamp", LocalDateTime.now().toString());
            
            messagingTemplate.convertAndSendToUser(
                principal.getName(),
                "/queue/prayers",
                response
            );
            
        } catch (Exception e) {
            log.error("Error handling prayer subscription for user {}: {}", 
                principal.getName(), e.getMessage());
            sendErrorMessage(principal.getName(), "Failed to subscribe to prayer notifications");
        }
    }
    
    /**
     * Subscribe to specific prayer request interactions
     * Used when viewing a specific prayer to get real-time updates
     */
    @MessageMapping("/prayer/{prayerRequestId}/subscribe")
    public void subscribeToPrayerInteractions(@Payload Map<String, Object> payload,
                                            Principal principal) {
        try {
            String prayerRequestIdStr = (String) payload.get("prayerRequestId");
            UUID prayerRequestId = UUID.fromString(prayerRequestIdStr);
            
            log.info("User {} subscribed to interactions for prayer {}", 
                principal.getName(), prayerRequestId);
            
            // Send confirmation message
            Map<String, Object> response = new HashMap<>();
            response.put("type", "prayer_subscription_confirmed");
            response.put("prayerRequestId", prayerRequestId.toString());
            response.put("message", "Successfully subscribed to prayer interactions");
            response.put("timestamp", LocalDateTime.now().toString());
            
            messagingTemplate.convertAndSendToUser(
                principal.getName(),
                "/queue/prayers",
                response
            );
            
        } catch (Exception e) {
            log.error("Error handling prayer interaction subscription for user {}: {}", 
                principal.getName(), e.getMessage());
            sendErrorMessage(principal.getName(), "Failed to subscribe to prayer interactions");
        }
    }
    
    // Interactions are never accepted over STOMP. Clients create them through the
    // REST API (PrayerInteractionService), which validates, persists, and then
    // broadcasts the authoritative event — so a client can't spoof another user.

    /**
     * Send prayer notification to specific user
     * Used for personal prayer notifications
     */
    public void sendPersonalPrayerNotification(String userEmail, PrayerNotificationEvent event) {
        try {
            log.info("Sending personal prayer notification to user: {}", userEmail);
            
            messagingTemplate.convertAndSendToUser(
                userEmail,
                "/queue/prayers",
                event
            );
            
        } catch (Exception e) {
            log.error("Error sending personal prayer notification to {}: {}", 
                userEmail, e.getMessage());
        }
    }
    
    /**
     * Broadcast prayer event to one church's members
     * Used for general prayer notifications
     */
    public void broadcastPrayerEvent(UUID organizationId, PrayerNotificationEvent event) {
        try {
            log.info("Broadcasting prayer event: {} for prayer {} to organization {}", 
                event.getEventType(), event.getPrayerRequestId(), organizationId);
            
            messagingTemplate.convertAndSend(PrayerTopics.organizationPrayers(organizationId), event);
            
        } catch (Exception e) {
            log.error("Error broadcasting prayer event: {}", e.getMessage());
        }
    }
    
    /**
     * Broadcast prayer interaction to specific prayer subscribers
     * Used when someone interacts with a specific prayer
     */
    public void broadcastPrayerInteraction(UUID prayerRequestId, PrayerNotificationEvent event) {
        try {
            log.info("Broadcasting prayer interaction for prayer {}: {}", 
                prayerRequestId, event.getEventType());
            
            messagingTemplate.convertAndSend(PrayerTopics.prayerInteractions(prayerRequestId), event);
            
        } catch (Exception e) {
            log.error("Error broadcasting prayer interaction for {}: {}", 
                prayerRequestId, e.getMessage());
        }
    }
    
    /**
     * Send error message to user
     */
    private void sendErrorMessage(String userEmail, String message) {
        try {
            Map<String, Object> error = new HashMap<>();
            error.put("type", "error");
            error.put("message", message);
            error.put("timestamp", LocalDateTime.now().toString());
            
            messagingTemplate.convertAndSendToUser(
                userEmail,
                "/queue/errors",
                error
            );
            
        } catch (Exception e) {
            log.error("Error sending error message to {}: {}", userEmail, e.getMessage());
        }
    }
}
