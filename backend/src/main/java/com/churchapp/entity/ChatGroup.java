package com.churchapp.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "chat_groups", indexes = {
    @Index(name = "idx_chat_group_type", columnList = "type"),
    @Index(name = "idx_chat_group_created_by", columnList = "created_by"),
    @Index(name = "idx_chat_group_is_active", columnList = "is_active")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatGroup {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;
    
    @NotBlank(message = "Group name is required")
    @Size(min = 2, max = 100, message = "Group name must be between 2 and 100 characters")
    @Column(name = "name", nullable = false, length = 100)
    private String name;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private GroupType type;
    
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;
    
    @Column(name = "image_url", length = 500)
    private String imageUrl;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", referencedColumnName = "id")
    private User createdBy;
    
    @Column(name = "is_private", nullable = false)
    private Boolean isPrivate = false;
    
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
    
    @Column(name = "max_members")
    private Integer maxMembers;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Relationship mappings
    @OneToMany(mappedBy = "chatGroup", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Set<ChatGroupMember> members = new HashSet<>();
    
    @OneToMany(mappedBy = "chatGroup", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Set<Message> messages = new HashSet<>();
    
    public enum GroupType {
        MAIN("Church-wide Main Chat"),
        SUBGROUP("Specialized Subgroup"),
        PRIVATE("Private Group"),
        DIRECT_MESSAGE("Direct Message"),
        ANNOUNCEMENT("Announcement Channel"),
        PRAYER("Prayer Group"),
        MINISTRY("Ministry Group"),
        EVENT("Event Discussion"),
        STUDY("Bible Study Group"),
        YOUTH("Youth Group"),
        MENS("Men's Group"),
        WOMENS("Women's Group"),
        LEADERSHIP("Leadership Team");
        
        private final String displayName;
        
        GroupType(String displayName) {
            this.displayName = displayName;
        }
        
        public String getDisplayName() {
            return displayName;
        }
    }
    
    // Helper methods
    public boolean isMember(User user) {
        return members.stream()
            .anyMatch(member -> member.getUser().equals(user));
    }
    
    public boolean isCreator(User user) {
        return createdBy != null && createdBy.equals(user);
    }
    
    public boolean canUserJoin(User user) {
        if (!isActive) return false;
        if (isPrivate && !isCreator(user)) return false;
        if (maxMembers != null && members.size() >= maxMembers) return false;
        return !isMember(user);
    }
    
    public long getMemberCount() {
        return members.stream()
            .filter(member -> member.getIsActive())
            .count();
    }
    
    public LocalDateTime getLastMessageTime() {
        return messages.stream()
            .map(Message::getTimestamp)
            .max(LocalDateTime::compareTo)
            .orElse(createdAt);
    }
}