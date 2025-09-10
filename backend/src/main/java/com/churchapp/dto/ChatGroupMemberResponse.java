package com.churchapp.dto;

import com.churchapp.entity.ChatGroupMember;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatGroupMemberResponse {
    
    private UUID id;
    private UUID userId;
    private String userName;
    private String displayName;
    private String profilePicUrl;
    private String email;
    private ChatGroupMember.MemberRole memberRole;
    private String roleDisplayName;
    private Boolean isActive;
    private Boolean isMuted;
    private Boolean notificationsEnabled;
    private LocalDateTime lastReadAt;
    private LocalDateTime joinedAt;
    private LocalDateTime leftAt;
    private String customName;
    private Boolean isOnline;
    private Boolean canPost;
    private Boolean canModerate;
    private Boolean canManageMembers;
    private Long unreadCount;
    
    // Constructor from entity
    public ChatGroupMemberResponse(ChatGroupMember member) {
        this.id = member.getId();
        this.userId = member.getUser().getId();
        this.userName = member.getUser().getName();
        this.displayName = member.getDisplayName();
        this.profilePicUrl = member.getUser().getProfilePicUrl();
        this.email = member.getUser().getEmail();
        this.memberRole = member.getMemberRole();
        this.roleDisplayName = member.getMemberRole().getDisplayName();
        this.isActive = member.getIsActive();
        this.isMuted = member.getIsMuted();
        this.notificationsEnabled = member.getNotificationsEnabled();
        this.lastReadAt = member.getLastReadAt();
        this.joinedAt = member.getJoinedAt();
        this.leftAt = member.getLeftAt();
        this.customName = member.getCustomName();
        this.canPost = member.canPost();
        this.canModerate = member.canModerate();
        this.canManageMembers = member.canManageMembers();
    }
    
    // Static factory methods
    public static ChatGroupMemberResponse fromEntity(ChatGroupMember member) {
        return new ChatGroupMemberResponse(member);
    }
    
    public static ChatGroupMemberResponse fromEntityWithOnlineStatus(ChatGroupMember member, boolean isOnline) {
        ChatGroupMemberResponse response = new ChatGroupMemberResponse(member);
        response.setIsOnline(isOnline);
        return response;
    }
    
    public static ChatGroupMemberResponse fromEntityWithUnreadCount(ChatGroupMember member, Long unreadCount) {
        ChatGroupMemberResponse response = new ChatGroupMemberResponse(member);
        response.setUnreadCount(unreadCount);
        return response;
    }
    
    // Helper methods
    public boolean isOwner() {
        return memberRole == ChatGroupMember.MemberRole.OWNER;
    }
    
    public boolean isAdmin() {
        return memberRole == ChatGroupMember.MemberRole.ADMIN;
    }
    
    public boolean isModerator() {
        return memberRole == ChatGroupMember.MemberRole.MODERATOR;
    }
    
    public boolean isRegularMember() {
        return memberRole == ChatGroupMember.MemberRole.MEMBER;
    }
    
    public boolean hasModeratorRights() {
        return canModerate != null && canModerate;
    }
    
    public boolean hasManagementRights() {
        return canManageMembers != null && canManageMembers;
    }
    
    public boolean isRecentlyActive() {
        if (lastReadAt == null) return false;
        return lastReadAt.isAfter(LocalDateTime.now().minusMinutes(15));
    }
    
    public String getStatusText() {
        if (!isActive) return "Left";
        if (isMuted) return "Muted";
        if (isOnline != null && isOnline) return "Online";
        if (isRecentlyActive()) return "Recently Active";
        return "Offline";
    }
}