package com.churchapp.controller;

import com.churchapp.dto.MessageRequest;
import com.churchapp.dto.MessageResponse;
import com.churchapp.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Controller
@RequiredArgsConstructor
public class WebSocketChatController {
    
    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;
    
    @MessageMapping("/chat/send/{groupId}")
    @SendTo("/topic/group/{groupId}/messages")
    public MessageResponse sendMessage(@DestinationVariable UUID groupId,
                                     @Payload MessageRequest request,
                                     SimpMessageHeaderAccessor headerAccessor,
                                     Principal principal) {
        try {
            // Set the group ID from path variable
            request.setChatGroupId(groupId);
            
            // Send message through chat service
            MessageResponse response = chatService.sendMessage(principal.getName(), request);
            
            // Notify typing status (user stopped typing)
            notifyTypingStatus(groupId, principal.getName(), false);
            
            return response;
        } catch (Exception e) {
            // Send error back to sender
            messagingTemplate.convertAndSendToUser(
                principal.getName(),
                "/queue/errors",
                createErrorMessage("Failed to send message: " + e.getMessage())
            );
            return null;
        }
    }
    
    @MessageMapping("/chat/typing/{groupId}")
    public void handleTyping(@DestinationVariable UUID groupId,
                           @Payload Map<String, Object> payload,
                           Principal principal) {
        try {
            boolean isTyping = (Boolean) payload.getOrDefault("isTyping", false);
            notifyTypingStatus(groupId, principal.getName(), isTyping);
        } catch (Exception e) {
            // Ignore typing errors
        }
    }
    
    @MessageMapping("/chat/join/{groupId}")
    public void joinGroup(@DestinationVariable UUID groupId,
                         SimpMessageHeaderAccessor headerAccessor,
                         Principal principal) {
        try {
            // Join the group
            chatService.joinChatGroup(principal.getName(), groupId);
            
            // Notify group members
            Map<String, Object> notification = new HashMap<>();
            notification.put("type", "user_joined");
            notification.put("message", principal.getName() + " joined the group");
            notification.put("timestamp", LocalDateTime.now());
            notification.put("userId", principal.getName());
            
            messagingTemplate.convertAndSend("/topic/group/" + groupId, notification);
            
        } catch (Exception e) {
            messagingTemplate.convertAndSendToUser(
                principal.getName(),
                "/queue/errors",
                createErrorMessage("Failed to join group: " + e.getMessage())
            );
        }
    }
    
    @MessageMapping("/chat/leave/{groupId}")
    public void leaveGroup(@DestinationVariable UUID groupId,
                          SimpMessageHeaderAccessor headerAccessor,
                          Principal principal) {
        try {
            // Leave the group
            chatService.leaveChatGroup(principal.getName(), groupId);
            
            // Notify group members
            Map<String, Object> notification = new HashMap<>();
            notification.put("type", "user_left");
            notification.put("message", principal.getName() + " left the group");
            notification.put("timestamp", LocalDateTime.now());
            notification.put("userId", principal.getName());
            
            messagingTemplate.convertAndSend("/topic/group/" + groupId, notification);
            
        } catch (Exception e) {
            messagingTemplate.convertAndSendToUser(
                principal.getName(),
                "/queue/errors",
                createErrorMessage("Failed to leave group: " + e.getMessage())
            );
        }
    }
    
    @MessageMapping("/chat/read/{groupId}")
    public void markAsRead(@DestinationVariable UUID groupId,
                          @Payload Map<String, Object> payload,
                          Principal principal) {
        try {
            LocalDateTime timestamp = LocalDateTime.now();
            if (payload.containsKey("timestamp")) {
                timestamp = LocalDateTime.parse(payload.get("timestamp").toString());
            }
            
            chatService.markMessagesAsRead(principal.getName(), groupId, timestamp);
            
            // Notify read status
            Map<String, Object> readStatus = new HashMap<>();
            readStatus.put("type", "messages_read");
            readStatus.put("userId", principal.getName());
            readStatus.put("timestamp", timestamp);
            
            messagingTemplate.convertAndSend("/topic/group/" + groupId + "/read", readStatus);
            
        } catch (Exception e) {
            // Ignore read status errors
        }
    }
    
    @MessageMapping("/chat/edit/{messageId}")
    public void editMessage(@DestinationVariable UUID messageId,
                           @Payload Map<String, String> payload,
                           Principal principal) {
        try {
            String newContent = payload.get("content");
            MessageResponse response = chatService.editMessage(principal.getName(), messageId, newContent);
            
            // Broadcast the edited message
            messagingTemplate.convertAndSend(
                "/topic/group/" + response.getChatGroupId() + "/messages",
                response
            );
            
        } catch (Exception e) {
            messagingTemplate.convertAndSendToUser(
                principal.getName(),
                "/queue/errors",
                createErrorMessage("Failed to edit message: " + e.getMessage())
            );
        }
    }
    
    @MessageMapping("/chat/delete/{messageId}")
    public void deleteMessage(@DestinationVariable UUID messageId,
                             Principal principal) {
        try {
            // Note: We'd need to get the group ID first, but for now we'll handle this in the service
            chatService.deleteMessage(principal.getName(), messageId);
            
            // Notify deletion
            Map<String, Object> deletion = new HashMap<>();
            deletion.put("type", "message_deleted");
            deletion.put("messageId", messageId);
            deletion.put("deletedBy", principal.getName());
            deletion.put("timestamp", LocalDateTime.now());
            
            // Broadcast to all subscribers (they'll filter by message ID)
            messagingTemplate.convertAndSend("/topic/messages/deleted", deletion);
            
        } catch (Exception e) {
            messagingTemplate.convertAndSendToUser(
                principal.getName(),
                "/queue/errors",
                createErrorMessage("Failed to delete message: " + e.getMessage())
            );
        }
    }
    
    @MessageMapping("/chat/presence")
    public void updatePresence(@Payload Map<String, Object> payload,
                              Principal principal) {
        try {
            String status = (String) payload.getOrDefault("status", "online");
            
            // Broadcast presence update
            Map<String, Object> presence = new HashMap<>();
            presence.put("type", "presence_update");
            presence.put("userId", principal.getName());
            presence.put("status", status);
            presence.put("timestamp", LocalDateTime.now());
            
            messagingTemplate.convertAndSend("/topic/presence", presence);
            
        } catch (Exception e) {
            // Ignore presence errors
        }
    }
    
    // Helper methods
    private void notifyTypingStatus(UUID groupId, String username, boolean isTyping) {
        Map<String, Object> typingStatus = new HashMap<>();
        typingStatus.put("type", "typing_status");
        typingStatus.put("userId", username);
        typingStatus.put("isTyping", isTyping);
        typingStatus.put("timestamp", LocalDateTime.now());
        
        messagingTemplate.convertAndSend("/topic/group/" + groupId + "/typing", typingStatus);
    }
    
    private Map<String, Object> createErrorMessage(String message) {
        Map<String, Object> error = new HashMap<>();
        error.put("type", "error");
        error.put("message", message);
        error.put("timestamp", LocalDateTime.now());
        return error;
    }
}