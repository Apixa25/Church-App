package com.churchapp.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_warnings", indexes = {
    @Index(name = "idx_user_warnings_user_id", columnList = "user_id, created_at"),
    @Index(name = "idx_user_warnings_warned_by", columnList = "warned_by"),
    @Index(name = "idx_user_warnings_content", columnList = "content_type, content_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserWarning {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user; // User who received the warning
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warned_by", nullable = false)
    private User warnedBy; // Moderator/admin who issued the warning
    
    @Column(name = "reason", nullable = false, length = 255)
    private String reason;
    
    @Column(name = "message", columnDefinition = "TEXT")
    private String message;
    
    @Column(name = "content_type", length = 50)
    private String contentType; // POST, COMMENT, PRAYER, etc.
    
    @Column(name = "content_id")
    private UUID contentId; // ID of the related content
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}

