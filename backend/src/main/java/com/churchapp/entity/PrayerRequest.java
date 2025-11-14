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
import java.util.UUID;

@Entity
@Table(name = "prayer_requests", indexes = {
    @Index(name = "idx_prayer_user_id", columnList = "user_id"),
    @Index(name = "idx_prayer_category", columnList = "category"),
    @Index(name = "idx_prayer_status", columnList = "status"),
    @Index(name = "idx_prayer_created_at", columnList = "created_at"),
    @Index(name = "idx_prayers_organization_id", columnList = "organization_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PrayerRequest {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, referencedColumnName = "id")
    private User user;
    
    @NotBlank(message = "Prayer title is required")
    @Size(min = 3, max = 200, message = "Prayer title must be between 3 and 200 characters")
    @Column(name = "title", nullable = false, length = 200)
    private String title;
    
    @Size(max = 2000, message = "Prayer description cannot exceed 2000 characters")
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;
    
    @Column(name = "image_url", length = 500)
    private String imageUrl;
    
    @Column(name = "is_anonymous", nullable = false)
    private Boolean isAnonymous = false;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false)
    private PrayerCategory category = PrayerCategory.GENERAL;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private PrayerStatus status = PrayerStatus.ACTIVE;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Multi-tenant organization field
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    public enum PrayerCategory {
        HEALTH,
        FAMILY,
        PRAISE,
        GUIDANCE,
        HEALING,
        SALVATION,
        WORK,
        TRAVEL,
        GENERAL,
        THANKSGIVING,
        PROTECTION,
        FINANCIAL,
        RELATIONSHIPS
    }
    
    public enum PrayerStatus {
        ACTIVE,
        ANSWERED,
        RESOLVED,
        ARCHIVED
    }
}