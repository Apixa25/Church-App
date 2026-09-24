package com.churchapp.controller;

import com.churchapp.dto.MessageRequest;
import com.churchapp.dto.MessageResponse;
import com.churchapp.entity.User;
import com.churchapp.repository.UserRepository;
import com.churchapp.service.ChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * STOMP entry points for chat. All broadcasting to group topics happens inside ChatService so the
 * REST and WebSocket paths behave identically and every message is published exactly once.
 * Errors go back to the sender only, on /user/queue/errors.
 */
@Controller
@RequiredArgsConstructor
@Slf4j
public class WebSocketChatController {
    
    private final ChatService chatService;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    
    @MessageMapping("/chat/send/{groupId}")
    public void sendMessage(@DestinationVariable UUID groupId,
                            @Payload MessageRequest request,
                            Principal principal) {
        if (principal == null) {
            return;
        }
        try {
            request.setChatGroupId(groupId);
            chatService.sendMessage(principal.getName(), request);
            notifyTypingStatus(groupId, principal.getName(), false);
        } catch (Exception e) {
            log.debug("WebSocket send failed for {} in group {}: {}", principal.getName(), groupId, e.getMessage());
            sendError(principal, "send_failed", "Failed to send message: " + e.getMessage(), request.getTempId(), groupId);
        }
    }
    
    @MessageMapping("/chat/typing/{groupId}")
    public void handleTyping(@DestinationVariable UUID groupId,
                             @Payload Map<String, Object> payload,
                             Principal principal) {
        if (principal == null) {
            return;
        }
        try {
            boolean isTyping = Boolean.TRUE.equals(payload.getOrDefault("isTyping", false));
            // Only members may broadcast typing into a group
            chatService.verifyGroupAccess(principal.getName(), groupId);
            notifyTypingStatus(groupId, principal.getName(), isTyping);
        } catch (Exception e) {
            // Typing indicators are best-effort
        }
    }
    
    @MessageMapping("/chat/join/{groupId}")
    public void joinGroup(@DestinationVariable UUID groupId, Principal principal) {
        if (principal == null) {
            return;
        }
        try {
            // ChatService publishes the system message and the user_joined notification
            chatService.joinChatGroup(principal.getName(), groupId);
        } catch (Exception e) {
            sendError(principal, "join_failed", "Failed to join group: " + e.getMessage(), null, groupId);
        }
    }
    
    @MessageMapping("/chat/leave/{groupId}")
    public void leaveGroup(@DestinationVariable UUID groupId, Principal principal) {
        if (principal == null) {
            return;
        }
        try {
            chatService.leaveChatGroup(principal.getName(), groupId);
        } catch (Exception e) {
            sendError(principal, "leave_failed", "Failed to leave group: " + e.getMessage(), null, groupId);
        }
    }
    
    @MessageMapping("/chat/read/{groupId}")
    public void markAsRead(@DestinationVariable UUID groupId,
                           @Payload Map<String, Object> payload,
                           Principal principal) {
        if (principal == null) {
            return;
        }
        try {
            LocalDateTime timestamp = parseTimestamp(payload != null ? payload.get("timestamp") : null);
            chatService.markMessagesAsRead(principal.getName(), groupId, timestamp);
            
            User user = userRepository.findByEmail(principal.getName()).orElse(null);
            Map<String, Object> readStatus = new HashMap<>();
            readStatus.put("type", "messages_read");
            readStatus.put("userId", user != null ? user.getId() : null);
            readStatus.put("displayName", user != null ? user.getName() : null);
            readStatus.put("timestamp", timestamp);
            
            messagingTemplate.convertAndSend("/topic/group/" + groupId + "/read", readStatus);
        } catch (Exception e) {
            // Read receipts are best-effort
        }
    }
    
    @MessageMapping("/chat/edit/{messageId}")
    public void editMessage(@DestinationVariable UUID messageId,
                            @Payload Map<String, String> payload,
                            Principal principal) {
        if (principal == null) {
            return;
        }
        try {
            // ChatService broadcasts the edited message to the group topic
            chatService.editMessage(principal.getName(), messageId, payload.get("content"));
        } catch (Exception e) {
            sendError(principal, "edit_failed", "Failed to edit message: " + e.getMessage(), null, null);
        }
    }
    
    @MessageMapping("/chat/delete/{messageId}")
    public void deleteMessage(@DestinationVariable UUID messageId, Principal principal) {
        if (principal == null) {
            return;
        }
        try {
            // ChatService broadcasts the deleted placeholder to the group topic only
            chatService.deleteMessage(principal.getName(), messageId);
        } catch (Exception e) {
            sendError(principal, "delete_failed", "Failed to delete message: " + e.getMessage(), null, null);
        }
    }

    @MessageMapping("/chat/react/{messageId}")
    public void reactToMessage(@DestinationVariable UUID messageId,
                               @Payload Map<String, String> payload,
                               Principal principal) {
        if (principal == null) {
            return;
        }
        try {
            chatService.toggleReaction(principal.getName(), messageId, payload.get("emoji"));
        } catch (Exception e) {
            sendError(principal, "reaction_failed", "Failed to react: " + e.getMessage(), null, null);
        }
    }
    
    // Helper methods

    private void notifyTypingStatus(UUID groupId, String email, boolean isTyping) {
        User user = userRepository.findByEmail(email).orElse(null);
        Map<String, Object> typingStatus = new HashMap<>();
        typingStatus.put("type", "typing_status");
        typingStatus.put("userId", user != null ? user.getId() : null);
        typingStatus.put("displayName", user != null ? user.getName() : "Someone");
        typingStatus.put("isTyping", isTyping);
        typingStatus.put("timestamp", LocalDateTime.now());
        
        messagingTemplate.convertAndSend("/topic/group/" + groupId + "/typing", typingStatus);
    }

    private void sendError(Principal principal, String code, String message, String tempId, UUID groupId) {
        Map<String, Object> error = new HashMap<>();
        error.put("type", "error");
        error.put("code", code);
        error.put("message", message);
        error.put("tempId", tempId);
        error.put("groupId", groupId);
        error.put("timestamp", LocalDateTime.now());
        messagingTemplate.convertAndSendToUser(principal.getName(), "/queue/errors", error);
    }

    /**
     * Clients send ISO-8601 with an offset ("...Z"). Server times are stored as UTC LocalDateTime,
     * so convert offset timestamps to UTC and accept plain LocalDateTime strings as-is.
     */
    static LocalDateTime parseTimestamp(Object raw) {
        if (raw == null) {
            return LocalDateTime.now();
        }
        String value = raw.toString().trim();
        try {
            return OffsetDateTime.parse(value).withOffsetSameInstant(ZoneOffset.UTC).toLocalDateTime();
        } catch (DateTimeParseException ignored) {
            // fall through
        }
        try {
            return LocalDateTime.parse(value);
        } catch (DateTimeParseException ignored) {
            return LocalDateTime.now();
        }
    }
}
