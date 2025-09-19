package com.churchapp.dto;

import com.churchapp.entity.PrayerInteraction;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Event class for prayer-related WebSocket notifications
 * Used to broadcast prayer events to connected clients
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrayerNotificationEvent {
    
    private String eventType;
    private UUID prayerRequestId;
    private UUID userId;
    private String userEmail;
    private String userName;
    private String title;
    private String message;
    private String timestamp;
    private String actionUrl;
    private Object metadata;
    
    // Static factory methods for different event types
    public static PrayerNotificationEvent newPrayerRequest(UUID prayerRequestId, UUID userId, 
                                                         String userEmail, String userName, 
                                                         String title, String description) {
        return PrayerNotificationEvent.builder()
                .eventType("new_prayer")
                .prayerRequestId(prayerRequestId)
                .userId(userId)
                .userEmail(userEmail)
                .userName(userName)
                .title("New Prayer Request")
                .message(userName + " has submitted a new prayer request")
                .timestamp(LocalDateTime.now().toString())
                .actionUrl("/prayers/" + prayerRequestId)
                .metadata(PrayerRequestMetadata.builder()
                        .title(title)
                        .description(description)
                        .build())
                .build();
    }
    
    public static PrayerNotificationEvent prayerInteraction(UUID prayerRequestId, UUID userId,
                                                          String userEmail, String userName,
                                                          PrayerInteraction.InteractionType interactionType,
                                                          String content) {
        String title = interactionType == PrayerInteraction.InteractionType.COMMENT 
                ? "New Prayer Comment" 
                : "Prayer Support";
                
        String message = interactionType == PrayerInteraction.InteractionType.COMMENT
                ? userName + " commented on a prayer request"
                : userName + " is praying for a request";
        
        return PrayerNotificationEvent.builder()
                .eventType(interactionType == PrayerInteraction.InteractionType.COMMENT 
                        ? "prayer_comment" : "prayer_interaction")
                .prayerRequestId(prayerRequestId)
                .userId(userId)
                .userEmail(userEmail)
                .userName(userName)
                .title(title)
                .message(message)
                .timestamp(LocalDateTime.now().toString())
                .actionUrl("/prayers/" + prayerRequestId)
                .metadata(PrayerInteractionMetadata.builder()
                        .interactionType(interactionType.toString())
                        .content(content)
                        .build())
                .build();
    }
    
    public static PrayerNotificationEvent prayerAnswered(UUID prayerRequestId, UUID userId,
                                                       String userEmail, String userName,
                                                       String title) {
        return PrayerNotificationEvent.builder()
                .eventType("prayer_answered")
                .prayerRequestId(prayerRequestId)
                .userId(userId)
                .userEmail(userEmail)
                .userName(userName)
                .title("Prayer Update")
                .message(userName + " updated their prayer request")
                .timestamp(LocalDateTime.now().toString())
                .actionUrl("/prayers/" + prayerRequestId)
                .metadata(PrayerRequestMetadata.builder()
                        .title(title)
                        .status("answered")
                        .build())
                .build();
    }
    
    // Inner classes for metadata
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PrayerRequestMetadata {
        private String title;
        private String description;
        private String status;
        private String category;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PrayerInteractionMetadata {
        private String interactionType;
        private String content;
    }
}
