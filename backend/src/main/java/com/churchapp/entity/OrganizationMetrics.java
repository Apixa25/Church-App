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
@Table(name = "organization_metrics", indexes = {
    @Index(name = "idx_org_metrics_org_id", columnList = "organization_id"),
    @Index(name = "idx_org_metrics_calculated_at", columnList = "calculated_at")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uk_org_metrics_org", columnNames = {"organization_id"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrganizationMetrics {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false, unique = true)
    private Organization organization;

    // Storage metrics (in bytes)
    @Column(name = "storage_used", nullable = false)
    private Long storageUsed = 0L;

    @Column(name = "storage_media_files", nullable = false)
    private Long storageMediaFiles = 0L;

    @Column(name = "storage_documents", nullable = false)
    private Long storageDocuments = 0L;

    @Column(name = "storage_profile_pics", nullable = false)
    private Long storageProfilePics = 0L;

    // Network metrics
    @Column(name = "api_requests_count", nullable = false)
    private Integer apiRequestsCount = 0;

    @Column(name = "data_transfer_bytes", nullable = false)
    private Long dataTransferBytes = 0L;

    // Activity metrics
    @Column(name = "active_users_count", nullable = false)
    private Integer activeUsersCount = 0;

    @Column(name = "posts_count", nullable = false)
    private Integer postsCount = 0;

    @Column(name = "prayer_requests_count", nullable = false)
    private Integer prayerRequestsCount = 0;

    @Column(name = "events_count", nullable = false)
    private Integer eventsCount = 0;

    @Column(name = "announcements_count", nullable = false)
    private Integer announcementsCount = 0;

    // Timestamps
    @Column(name = "calculated_at", nullable = false)
    private LocalDateTime calculatedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}

