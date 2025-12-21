package com.churchapp.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity to track when users last viewed comments on posts
 * Used to power "new comments" indicators on post cards
 *
 * Design: Tracks timestamp instead of individual comment IDs for efficiency
 * "New" comments = comments created AFTER last_read_at timestamp
 */
@Entity
@Table(name = "post_comment_read_status",
       uniqueConstraints = @UniqueConstraint(
           name = "unique_user_post_read",
           columnNames = {"user_id", "post_id"}
       ),
       indexes = {
           @Index(name = "idx_comment_read_user", columnList = "user_id"),
           @Index(name = "idx_comment_read_post", columnList = "post_id"),
           @Index(name = "idx_comment_read_timestamp", columnList = "last_read_at")
       })
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PostCommentReadStatus {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "post_id", nullable = false)
    private UUID postId;

    @Column(name = "last_read_at", nullable = false)
    private LocalDateTime lastReadAt;

    @Column(name = "last_read_comment_id")
    private UUID lastReadCommentId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * Constructor for creating new read status entry
     */
    public PostCommentReadStatus(UUID userId, UUID postId, LocalDateTime lastReadAt) {
        this.userId = userId;
        this.postId = postId;
        this.lastReadAt = lastReadAt;
    }
}
