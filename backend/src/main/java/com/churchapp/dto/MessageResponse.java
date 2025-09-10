package com.churchapp.dto;

import com.churchapp.entity.Message;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MessageResponse {
    
    private UUID id;
    private UUID chatGroupId;
    private String chatGroupName;
    private UUID userId;
    private String userName;
    private String userDisplayName;
    private String userProfilePicUrl;
    private String content;
    private Message.MessageType messageType;
    private String messageTypeDisplay;
    private String mediaUrl;
    private String mediaType;
    private String mediaFilename;
    private Long mediaSize;
    private LocalDateTime timestamp;
    private LocalDateTime editedAt;
    private Boolean isEdited;
    private Boolean isDeleted;
    private UUID parentMessageId;
    private MessageResponse parentMessage;
    private Integer replyCount;
    private List<MessageResponse> recentReplies;
    private List<UUID> mentionedUserIds;
    private List<UserMention> mentions;
    private Object reactions; // JSON object with reactions
    private Boolean canEdit;
    private Boolean canDelete;
    private String tempId; // For client-side optimistic updates
    
    // Constructor from entity
    public MessageResponse(Message message) {
        this.id = message.getId();
        this.chatGroupId = message.getChatGroup().getId();
        this.chatGroupName = message.getChatGroup().getName();
        this.userId = message.getUser().getId();
        this.userName = message.getUser().getName();
        this.userDisplayName = message.getUser().getName();
        this.userProfilePicUrl = message.getUser().getProfilePicUrl();
        this.content = message.getContent(); // Use raw content, not display content
        this.messageType = message.getMessageType();
        this.messageTypeDisplay = message.getMessageType().getDisplayName();
        this.mediaUrl = message.getMediaUrl();
        this.mediaType = message.getMediaType();
        this.mediaFilename = message.getMediaFilename();
        this.mediaSize = message.getMediaSize();
        this.timestamp = message.getTimestamp();
        this.editedAt = message.getEditedAt();
        this.isEdited = message.getIsEdited();
        this.isDeleted = message.getIsDeleted();
        this.parentMessageId = message.getParentMessage() != null ? message.getParentMessage().getId() : null;
        this.replyCount = message.getReplyCount();
    }
    
    // Static factory methods
    public static MessageResponse fromEntity(Message message) {
        return new MessageResponse(message);
    }
    
    public static MessageResponse fromEntityWithUserContext(Message message, boolean canEdit, boolean canDelete) {
        MessageResponse response = new MessageResponse(message);
        response.setCanEdit(canEdit);
        response.setCanDelete(canDelete);
        return response;
    }
    
    // Helper methods
    public boolean isSystemMessage() {
        return messageType == Message.MessageType.SYSTEM;
    }
    
    public boolean isMediaMessage() {
        return messageType != null && messageType.isMedia();
    }
    
    public boolean isReply() {
        return parentMessageId != null;
    }
    
    public boolean hasReplies() {
        return replyCount != null && replyCount > 0;
    }
    
    public boolean isMentioned(UUID userId) {
        return mentionedUserIds != null && mentionedUserIds.contains(userId);
    }
    
    public String getTimeAgo() {
        if (timestamp == null) return "";
        
        LocalDateTime now = LocalDateTime.now();
        long minutes = java.time.Duration.between(timestamp, now).toMinutes();
        
        if (minutes < 1) return "Just now";
        if (minutes < 60) return minutes + "m ago";
        
        long hours = minutes / 60;
        if (hours < 24) return hours + "h ago";
        
        long days = hours / 24;
        if (days < 7) return days + "d ago";
        
        return timestamp.toLocalDate().toString();
    }
    
    public boolean isRecent() {
        if (timestamp == null) return false;
        return timestamp.isAfter(LocalDateTime.now().minusMinutes(5));
    }
    
    // Inner class for user mentions
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserMention {
        private UUID userId;
        private String userName;
        private String displayName;
        private String profilePicUrl;
    }
}