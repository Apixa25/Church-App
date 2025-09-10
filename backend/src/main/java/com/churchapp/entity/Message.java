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
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "messages", indexes = {
    @Index(name = "idx_message_chat_group", columnList = "chat_group_id"),
    @Index(name = "idx_message_user", columnList = "user_id"),
    @Index(name = "idx_message_timestamp", columnList = "timestamp"),
    @Index(name = "idx_message_type", columnList = "message_type"),
    @Index(name = "idx_message_deleted", columnList = "is_deleted"),
    @Index(name = "idx_message_parent", columnList = "parent_message_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Message {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_group_id", referencedColumnName = "id", nullable = false)
    private ChatGroup chatGroup;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", referencedColumnName = "id", nullable = false)
    private User user;
    
    @Column(name = "content", columnDefinition = "TEXT")
    private String content;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "message_type", nullable = false)
    private MessageType messageType = MessageType.TEXT;
    
    @Column(name = "media_url", length = 500)
    private String mediaUrl;
    
    @Column(name = "media_type", length = 50)
    private String mediaType; // image/jpeg, video/mp4, application/pdf, etc.
    
    @Column(name = "media_size")
    private Long mediaSize; // in bytes
    
    @Column(name = "media_filename", length = 255)
    private String mediaFilename;
    
    @CreationTimestamp
    @Column(name = "timestamp", nullable = false, updatable = false)
    private LocalDateTime timestamp;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @Column(name = "edited_at")
    private LocalDateTime editedAt;
    
    @Column(name = "is_edited", nullable = false)
    private Boolean isEdited = false;
    
    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;
    
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
    
    @Column(name = "deleted_by")
    private UUID deletedBy;
    
    // Thread support - reply to a message
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_message_id", referencedColumnName = "id")
    private Message parentMessage;
    
    @OneToMany(mappedBy = "parentMessage", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Message> replies = new ArrayList<>();
    
    // Mentions support - JSON array of user IDs
    @Column(name = "mentioned_users", columnDefinition = "TEXT")
    private String mentionedUsers; // JSON array: ["uuid1", "uuid2"]
    
    // Reactions support - JSON object
    @Column(name = "reactions", columnDefinition = "TEXT")
    private String reactions; // JSON: {"👍": ["user1", "user2"], "❤️": ["user3"]}
    
    // System message metadata
    @Column(name = "system_metadata", columnDefinition = "TEXT")
    private String systemMetadata; // JSON for system message details
    
    public enum MessageType {
        TEXT("Text Message"),
        IMAGE("Image"),
        VIDEO("Video"),
        AUDIO("Audio"),
        DOCUMENT("Document"),
        LINK("Link"),
        SYSTEM("System Message"),
        ANNOUNCEMENT("Announcement"),
        POLL("Poll"),
        LOCATION("Location"),
        CONTACT("Contact"),
        STICKER("Sticker"),
        GIF("GIF");
        
        private final String displayName;
        
        MessageType(String displayName) {
            this.displayName = displayName;
        }
        
        public String getDisplayName() {
            return displayName;
        }
        
        public boolean isMedia() {
            return this == IMAGE || this == VIDEO || this == AUDIO || this == DOCUMENT || this == GIF;
        }
        
        public boolean isSystem() {
            return this == SYSTEM;
        }
        
        public boolean canBeEdited() {
            return this == TEXT || this == LINK;
        }
        
        public boolean canBeDeleted() {
            return this != SYSTEM;
        }
    }
    
    // Helper methods
    public boolean canBeEditedBy(User editor) {
        if (isDeleted || !messageType.canBeEdited()) {
            return false;
        }
        
        // User can edit their own messages within 24 hours
        if (user.equals(editor)) {
            return timestamp.isAfter(LocalDateTime.now().minusHours(24));
        }
        
        return false;
    }
    
    public boolean canBeDeletedBy(User deleter) {
        if (isDeleted || !messageType.canBeDeleted()) {
            return false;
        }
        
        // User can delete their own messages
        if (user.equals(deleter)) {
            return true;
        }
        
        // Check if user is moderator/admin in the chat group (would need to query membership)
        return false;
    }
    
    public void edit(String newContent) {
        this.content = newContent;
        this.isEdited = true;
        this.editedAt = LocalDateTime.now();
    }
    
    public void delete(UUID deletedByUserId) {
        this.isDeleted = true;
        this.deletedAt = LocalDateTime.now();
        this.deletedBy = deletedByUserId;
        this.content = null; // Clear content for privacy
    }
    
    public boolean isReply() {
        return parentMessage != null;
    }
    
    public boolean hasReplies() {
        return !replies.isEmpty();
    }
    
    public int getReplyCount() {
        return replies.size();
    }
    
    public String getDisplayContent() {
        if (isDeleted) {
            return "[Message deleted]";
        }
        
        if (messageType.isMedia() && content == null) {
            return "[" + messageType.getDisplayName() + "]";
        }
        
        return content;
    }
    
    // Static factory methods for different message types
    public static Message createTextMessage(ChatGroup chatGroup, User user, String content) {
        Message message = new Message();
        message.setChatGroup(chatGroup);
        message.setUser(user);
        message.setContent(content);
        message.setMessageType(MessageType.TEXT);
        return message;
    }
    
    public static Message createMediaMessage(ChatGroup chatGroup, User user, String content, 
            String mediaUrl, String mediaType, String filename, Long size) {
        Message message = new Message();
        message.setChatGroup(chatGroup);
        message.setUser(user);
        message.setContent(content);
        message.setMediaUrl(mediaUrl);
        message.setMediaType(mediaType);
        message.setMediaFilename(filename);
        message.setMediaSize(size);
        
        // Determine message type from media type
        if (mediaType.startsWith("image/")) {
            message.setMessageType(MessageType.IMAGE);
        } else if (mediaType.startsWith("video/")) {
            message.setMessageType(MessageType.VIDEO);
        } else if (mediaType.startsWith("audio/")) {
            message.setMessageType(MessageType.AUDIO);
        } else {
            message.setMessageType(MessageType.DOCUMENT);
        }
        
        return message;
    }
    
    public static Message createSystemMessage(ChatGroup chatGroup, User user, String content, String metadata) {
        Message message = new Message();
        message.setChatGroup(chatGroup);
        message.setUser(user);
        message.setContent(content);
        message.setMessageType(MessageType.SYSTEM);
        message.setSystemMetadata(metadata);
        return message;
    }
}