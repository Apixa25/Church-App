package com.churchapp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Event class for chat-related WebSocket notifications
 * Used to broadcast chat message notifications to connected clients via /topic/events
 * This allows chat notifications to appear in the Event Notification bell
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatNotificationEvent {
    
    private String eventType; // "chat_message_received"
    private UUID messageId;
    private UUID chatGroupId;
    private String chatGroupName;
    private UUID senderId;
    private String senderName;
    private String senderEmail;
    private String messageContent;
    private String messageType; // TEXT, IMAGE, VIDEO, etc.
    private String timestamp;
    private String actionUrl; // URL to navigate to the chat
    
    // Static factory method for chat message notifications
    public static ChatNotificationEvent chatMessageReceived(
            UUID messageId,
            UUID chatGroupId,
            String chatGroupName,
            UUID senderId,
            String senderName,
            String senderEmail,
            String messageContent,
            String messageType) {
        return ChatNotificationEvent.builder()
                .eventType("chat_message_received")
                .messageId(messageId)
                .chatGroupId(chatGroupId)
                .chatGroupName(chatGroupName)
                .senderId(senderId)
                .senderName(senderName)
                .senderEmail(senderEmail)
                .messageContent(messageContent)
                .messageType(messageType)
                .timestamp(LocalDateTime.now().toString())
                .actionUrl("/chat/" + chatGroupId)
                .build();
    }
}

