package com.churchapp.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "chat_group_members", 
    indexes = {
        @Index(name = "idx_chat_group_member_user", columnList = "user_id"),
        @Index(name = "idx_chat_group_member_group", columnList = "chat_group_id"),
        @Index(name = "idx_chat_group_member_role", columnList = "member_role"),
        @Index(name = "idx_chat_group_member_active", columnList = "is_active")
    },
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_group", columnNames = {"user_id", "chat_group_id"})
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatGroupMember {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", referencedColumnName = "id", nullable = false)
    private User user;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_group_id", referencedColumnName = "id", nullable = false)
    private ChatGroup chatGroup;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "member_role", nullable = false)
    private MemberRole memberRole = MemberRole.MEMBER;
    
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
    
    @Column(name = "is_muted", nullable = false)
    private Boolean isMuted = false;
    
    @Column(name = "notifications_enabled", nullable = false)
    private Boolean notificationsEnabled = true;
    
    @Column(name = "last_read_at")
    private LocalDateTime lastReadAt;
    
    @CreationTimestamp
    @Column(name = "joined_at", nullable = false, updatable = false)
    private LocalDateTime joinedAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @Column(name = "left_at")
    private LocalDateTime leftAt;
    
    @Column(name = "invited_by")
    private UUID invitedBy;
    
    @Column(name = "custom_name", length = 50)
    private String customName; // User can set a custom display name for this group
    
    public enum MemberRole {
        OWNER("Owner"),
        ADMIN("Administrator"),
        MODERATOR("Moderator"), 
        MEMBER("Member"),
        GUEST("Guest"),
        RESTRICTED("Restricted"); // Can read but cannot post
        
        private final String displayName;
        
        MemberRole(String displayName) {
            this.displayName = displayName;
        }
        
        public String getDisplayName() {
            return displayName;
        }
        
        public boolean canModerate() {
            return this == OWNER || this == ADMIN || this == MODERATOR;
        }
        
        public boolean canPost() {
            return this != RESTRICTED;
        }
        
        public boolean canManageMembers() {
            return this == OWNER || this == ADMIN;
        }
        
        public boolean canDeleteGroup() {
            return this == OWNER;
        }
    }
    
    // Helper methods
    public boolean canPost() {
        return isActive && memberRole.canPost();
    }
    
    public boolean canModerate() {
        return isActive && memberRole.canModerate();
    }
    
    public boolean canManageMembers() {
        return isActive && memberRole.canManageMembers();
    }
    
    public boolean hasUnreadMessages(LocalDateTime lastMessageTime) {
        return lastReadAt == null || (lastMessageTime != null && lastReadAt.isBefore(lastMessageTime));
    }
    
    public void markAsRead() {
        this.lastReadAt = LocalDateTime.now();
    }
    
    public void leave() {
        this.isActive = false;
        this.leftAt = LocalDateTime.now();
    }
    
    public String getDisplayName() {
        return customName != null && !customName.trim().isEmpty() 
            ? customName 
            : user.getName();
    }
}