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
@Table(name = "post_comments", indexes = {
    @Index(name = "idx_post_comments_post_id", columnList = "post_id"),
    @Index(name = "idx_post_comments_user_id", columnList = "user_id"),
    @Index(name = "idx_post_comments_parent_comment_id", columnList = "parent_comment_id"),
    @Index(name = "idx_post_comments_created_at", columnList = "created_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PostComment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_comment_id")
    private PostComment parentComment; // For nested replies

    @NotBlank(message = "Comment content cannot be blank")
    @Size(max = 1000, message = "Comment content cannot exceed 1000 characters")
    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @ElementCollection
    @CollectionTable(name = "post_comment_media_urls", joinColumns = @JoinColumn(name = "comment_id"))
    @Column(name = "media_url")
    private List<String> mediaUrls = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "post_comment_media_types", joinColumns = @JoinColumn(name = "comment_id"))
    @Column(name = "media_type")
    private List<String> mediaTypes = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "is_anonymous", nullable = false)
    private Boolean isAnonymous = false;

    @Column(name = "likes_count", nullable = false)
    private Integer likesCount = 0;

    // Helper methods for managing like counts
    public void incrementLikesCount() {
        this.likesCount = this.likesCount + 1;
    }

    public void decrementLikesCount() {
        if (this.likesCount > 0) {
            this.likesCount = this.likesCount - 1;
        }
    }

    // Helper method to check if comment has media
    public boolean hasMedia() {
        return mediaUrls != null && !mediaUrls.isEmpty();
    }

    // Helper method to check if this is a reply to another comment
    public boolean isReply() {
        return parentComment != null;
    }

    // Helper method to get the root comment in a thread
    public PostComment getRootComment() {
        PostComment current = this;
        while (current.getParentComment() != null) {
            current = current.getParentComment();
        }
        return current;
    }

    // Getter method for boolean field (needed for DTOs)
    public Boolean getIsAnonymous() {
        return isAnonymous;
    }
}
