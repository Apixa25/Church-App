package com.churchapp.dto;

import com.churchapp.entity.ChatGroup;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatGroupResponse {
    
    private UUID id;
    private String name;
    private ChatGroup.GroupType type;
    private String description;
    private String imageUrl;
    private UUID createdBy;
    private String createdByName;
    private String createdByProfilePic;
    private Boolean isPrivate;
    private Boolean isActive;
    private Integer maxMembers;
    private Long memberCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime lastMessageTime;
    private String lastMessage;
    private String lastMessageBy;
    private Boolean isMember;
    private Boolean canPost;
    private Boolean canModerate;
    private String userRole;
    private Long unreadCount;
    private List<ChatGroupMemberResponse> recentMembers;
    
    // Constructor from entity for basic info
    public ChatGroupResponse(ChatGroup chatGroup) {
        this.id = chatGroup.getId();
        this.name = chatGroup.getName();
        this.type = chatGroup.getType();
        this.description = chatGroup.getDescription();
        this.imageUrl = chatGroup.getImageUrl();
        this.createdBy = chatGroup.getCreatedBy() != null ? chatGroup.getCreatedBy().getId() : null;
        this.createdByName = chatGroup.getCreatedBy() != null ? chatGroup.getCreatedBy().getName() : null;
        this.createdByProfilePic = chatGroup.getCreatedBy() != null ? chatGroup.getCreatedBy().getProfilePicUrl() : null;
        this.isPrivate = chatGroup.getIsPrivate();
        this.isActive = chatGroup.getIsActive();
        this.maxMembers = chatGroup.getMaxMembers();
        this.memberCount = chatGroup.getMemberCount();
        this.createdAt = chatGroup.getCreatedAt();
        this.updatedAt = chatGroup.getUpdatedAt();
        this.lastMessageTime = chatGroup.getLastMessageTime();
    }
    
    // Static factory methods
    public static ChatGroupResponse fromEntity(ChatGroup chatGroup) {
        return new ChatGroupResponse(chatGroup);
    }
    
    public static ChatGroupResponse fromEntityWithUserContext(ChatGroup chatGroup, 
            boolean isMember, boolean canPost, boolean canModerate, String userRole, Long unreadCount) {
        ChatGroupResponse response = new ChatGroupResponse(chatGroup);
        response.setIsMember(isMember);
        response.setCanPost(canPost);
        response.setCanModerate(canModerate);
        response.setUserRole(userRole);
        response.setUnreadCount(unreadCount);
        return response;
    }
    
    // Helper methods
    public boolean isMainChat() {
        return type == ChatGroup.GroupType.MAIN;
    }
    
    public boolean isDirectMessage() {
        return type == ChatGroup.GroupType.DIRECT_MESSAGE;
    }
    
    public String getDisplayName() {
        if (type == ChatGroup.GroupType.DIRECT_MESSAGE && recentMembers != null && recentMembers.size() == 1) {
            return recentMembers.get(0).getDisplayName();
        }
        return name;
    }
    
    public String getDisplayImage() {
        if (imageUrl != null && !imageUrl.trim().isEmpty()) {
            return imageUrl;
        }

        if (type == ChatGroup.GroupType.DIRECT_MESSAGE && recentMembers != null && recentMembers.size() == 1) {
            return recentMembers.get(0).getProfilePicUrl();
        }

        return null;
    }

    // Expose other user's profile pic for DMs in JSON response
    @JsonProperty("otherUserProfilePic")
    public String getOtherUserProfilePic() {
        if (type == ChatGroup.GroupType.DIRECT_MESSAGE && recentMembers != null && !recentMembers.isEmpty()) {
            return recentMembers.get(0).getProfilePicUrl();
        }
        return null;
    }
    
    public boolean hasUnreadMessages() {
        return unreadCount != null && unreadCount > 0;
    }
    
    public boolean isFullGroup() {
        return maxMembers != null && memberCount != null && memberCount >= maxMembers;
    }
}