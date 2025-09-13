package com.churchapp.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "post_shares", indexes = {
    @Index(name = "idx_post_shares_post_id", columnList = "post_id"),
    @Index(name = "idx_post_shares_user_id", columnList = "user_id"),
    @Index(name = "idx_post_shares_created_at", columnList = "created_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PostShare {

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

    @Enumerated(EnumType.STRING)
    @Column(name = "share_type", nullable = false)
    private ShareType shareType = ShareType.REPOST;

    @Size(max = 500, message = "Quote text cannot exceed 500 characters")
    @Column(name = "content", columnDefinition = "TEXT")
    private String content; // Optional quote text

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum ShareType {
        REPOST,    // Simple share/repost
        QUOTE      // Quote with additional text
    }

    // Helper method to check if this is a quote share
    public boolean isQuoteShare() {
        return shareType == ShareType.QUOTE && content != null && !content.trim().isEmpty();
    }
}
