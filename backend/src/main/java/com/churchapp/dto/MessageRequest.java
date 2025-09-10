package com.churchapp.dto;

import com.churchapp.entity.Message;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MessageRequest {
    
    @NotNull(message = "Chat group ID is required")
    private UUID chatGroupId;
    
    @Size(max = 4000, message = "Message content cannot exceed 4000 characters")
    private String content;
    
    private Message.MessageType messageType = Message.MessageType.TEXT;
    
    private String mediaUrl;
    private String mediaType;
    private String mediaFilename;
    private Long mediaSize;
    
    private UUID parentMessageId; // For replies
    
    private List<UUID> mentionedUserIds;
    
    private String tempId; // Temporary ID from client for optimistic updates
    
    // Validation methods
    public boolean isValidTextMessage() {
        return messageType == Message.MessageType.TEXT && 
               content != null && !content.trim().isEmpty();
    }
    
    public boolean isValidMediaMessage() {
        return messageType != null && messageType.isMedia() && 
               mediaUrl != null && !mediaUrl.trim().isEmpty();
    }
    
    public boolean isValidMessage() {
        if (messageType == null) return false;
        
        if (messageType == Message.MessageType.TEXT) {
            return isValidTextMessage();
        } else if (messageType.isMedia()) {
            return isValidMediaMessage();
        } else if (messageType == Message.MessageType.SYSTEM) {
            return content != null && !content.trim().isEmpty();
        }
        
        return content != null && !content.trim().isEmpty();
    }
    
    public boolean isReply() {
        return parentMessageId != null;
    }
    
    public boolean hasMentions() {
        return mentionedUserIds != null && !mentionedUserIds.isEmpty();
    }
}