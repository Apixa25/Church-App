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
@Table(name = "posts", indexes = {
    @Index(name = "idx_posts_user_id", columnList = "user_id"),
    @Index(name = "idx_posts_created_at", columnList = "created_at"),
    @Index(name = "idx_posts_post_type", columnList = "post_type"),
    @Index(name = "idx_posts_category", columnList = "category"),
    @Index(name = "idx_posts_parent_post_id", columnList = "parent_post_id"),
    @Index(name = "idx_posts_quoted_post_id", columnList = "quoted_post_id"),
    @Index(name = "idx_posts_is_reply", columnList = "is_reply"),
    @Index(name = "idx_posts_is_quote", columnList = "is_quote"),
    @Index(name = "idx_posts_organization_id", columnList = "organization_id"),
    @Index(name = "idx_posts_group_id", columnList = "group_id"),
    @Index(name = "idx_posts_user_primary_org_snapshot", columnList = "user_primary_org_id_snapshot")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @NotBlank(message = "Post content cannot be blank")
    @Size(max = 2000, message = "Post content cannot exceed 2000 characters")
    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @ElementCollection
    @CollectionTable(name = "post_media_urls", joinColumns = @JoinColumn(name = "post_id"))
    @Column(name = "media_url")
    private List<String> mediaUrls = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "post_media_types", joinColumns = @JoinColumn(name = "post_id"))
    @Column(name = "media_type")
    private List<String> mediaTypes = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_post_id")
    private Post parentPost; // For replies/threads

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quoted_post_id")
    private Post quotedPost; // For quote posts

    @Column(name = "is_reply", nullable = false)
    private Boolean isReply = false;

    @Column(name = "is_quote", nullable = false)
    private Boolean isQuote = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "post_type", nullable = false)
    private PostType postType = PostType.GENERAL;

    @Column(name = "is_anonymous", nullable = false)
    private Boolean isAnonymous = false;

    @Column(name = "category", length = 100)
    private String category;

    @Column(name = "location", length = 255)
    private String location;

    @Column(name = "likes_count", nullable = false)
    private Integer likesCount = 0;

    @Column(name = "comments_count", nullable = false)
    private Integer commentsCount = 0;

    @Column(name = "shares_count", nullable = false)
    private Integer sharesCount = 0;

    @Column(name = "bookmarks_count", nullable = false)
    private Integer bookmarksCount = 0;

    // Multi-tenant organization/group fields
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id")
    private Group group;

    @Column(name = "user_primary_org_id_snapshot")
    private UUID userPrimaryOrgIdSnapshot; // Snapshot of user's primary org at post time

    @Enumerated(EnumType.STRING)
    @Column(name = "visibility", length = 20)
    private PostVisibility visibility = PostVisibility.PUBLIC;

    @Column(name = "is_hidden", nullable = false)
    private Boolean isHidden = false;

    @Column(name = "hidden_at")
    private LocalDateTime hiddenAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hidden_by")
    private User hiddenBy; // Moderator who hid the post

    public enum PostVisibility {
        PUBLIC,
        ORG_ONLY
    }

    // Helper methods for managing counts
    public void incrementLikesCount() {
        this.likesCount = this.likesCount + 1;
    }

    public void decrementLikesCount() {
        if (this.likesCount > 0) {
            this.likesCount = this.likesCount - 1;
        }
    }

    public void incrementCommentsCount() {
        this.commentsCount = this.commentsCount + 1;
    }

    public void decrementCommentsCount() {
        if (this.commentsCount > 0) {
            this.commentsCount = this.commentsCount - 1;
        }
    }

    public void incrementSharesCount() {
        this.sharesCount = this.sharesCount + 1;
    }

    public void decrementSharesCount() {
        if (this.sharesCount > 0) {
            this.sharesCount = this.sharesCount - 1;
        }
    }

    public void incrementBookmarksCount() {
        this.bookmarksCount = this.bookmarksCount + 1;
    }

    public void decrementBookmarksCount() {
        if (this.bookmarksCount > 0) {
            this.bookmarksCount = this.bookmarksCount - 1;
        }
    }

    public enum PostType {
        GENERAL,
        PRAYER,
        TESTIMONY,
        ANNOUNCEMENT
    }

    // Helper method to check if post has media
    public boolean hasMedia() {
        return mediaUrls != null && !mediaUrls.isEmpty();
    }

    // Helper method to check if post is a thread reply
    public boolean isThreadReply() {
        return parentPost != null;
    }

    // Helper method to check if post is a quote
    public boolean isQuotePost() {
        return quotedPost != null;
    }

    // Getter methods for boolean fields (needed for DTOs)
    public Boolean getIsReply() {
        return isReply;
    }

    public Boolean getIsQuote() {
        return isQuote;
    }

    public Boolean getIsAnonymous() {
        return isAnonymous;
    }
}
