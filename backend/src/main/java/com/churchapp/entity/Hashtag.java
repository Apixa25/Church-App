package com.churchapp.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "hashtags", indexes = {
    @Index(name = "idx_hashtags_tag", columnList = "tag"),
    @Index(name = "idx_hashtags_usage_count", columnList = "usage_count"),
    @Index(name = "idx_hashtags_last_used", columnList = "last_used")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Hashtag {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @NotBlank(message = "Hashtag cannot be blank")
    @Pattern(regexp = "^[a-zA-Z0-9_]+$", message = "Hashtag can only contain letters, numbers, and underscores")
    @Size(min = 1, max = 100, message = "Hashtag must be between 1 and 100 characters")
    @Column(name = "tag", nullable = false, unique = true, length = 100)
    private String tag; // The hashtag without #

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "usage_count", nullable = false)
    private Integer usageCount = 0;

    @UpdateTimestamp
    @Column(name = "last_used")
    private LocalDateTime lastUsed;

    // Helper methods for managing usage count
    public void incrementUsageCount() {
        this.usageCount = this.usageCount + 1;
        this.lastUsed = LocalDateTime.now();
    }

    public void decrementUsageCount() {
        if (this.usageCount > 0) {
            this.usageCount = this.usageCount - 1;
        }
    }

    // Helper method to get the full hashtag (with #)
    public String getFullTag() {
        return "#" + tag;
    }

    // Helper method to check if hashtag is trending
    public boolean isTrending() {
        // Consider trending if used more than 10 times in the last week
        return usageCount > 10;
    }
}
