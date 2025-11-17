package com.churchapp.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Entity for storing historical snapshots of organization metrics.
 * Allows tracking metrics over time for trending and analytics.
 */
@Entity
@Table(name = "organization_metrics_history", indexes = {
    @Index(name = "idx_metrics_history_org_id", columnList = "organization_id"),
    @Index(name = "idx_metrics_history_recorded_at", columnList = "recorded_at"),
    @Index(name = "idx_metrics_history_org_recorded", columnList = "organization_id, recorded_at"),
    @Index(name = "idx_metrics_history_org_time_range", columnList = "organization_id, recorded_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrganizationMetricsHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metrics_snapshot", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> metricsSnapshot = new HashMap<>();

    @Column(name = "recorded_at", nullable = false, updatable = false)
    private LocalDateTime recordedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * Create a history record from current metrics
     */
    public static OrganizationMetricsHistory fromMetrics(OrganizationMetrics metrics) {
        OrganizationMetricsHistory history = new OrganizationMetricsHistory();
        history.setOrganization(metrics.getOrganization());
        history.setRecordedAt(LocalDateTime.now());
        
        // Convert metrics to JSON map
        Map<String, Object> snapshot = new HashMap<>();
        snapshot.put("storageUsed", metrics.getStorageUsed());
        snapshot.put("storageMediaFiles", metrics.getStorageMediaFiles());
        snapshot.put("storageDocuments", metrics.getStorageDocuments());
        snapshot.put("storageProfilePics", metrics.getStorageProfilePics());
        snapshot.put("apiRequestsCount", metrics.getApiRequestsCount());
        snapshot.put("dataTransferBytes", metrics.getDataTransferBytes());
        snapshot.put("activeUsersCount", metrics.getActiveUsersCount());
        snapshot.put("postsCount", metrics.getPostsCount());
        snapshot.put("prayerRequestsCount", metrics.getPrayerRequestsCount());
        snapshot.put("eventsCount", metrics.getEventsCount());
        snapshot.put("announcementsCount", metrics.getAnnouncementsCount());
        snapshot.put("calculatedAt", metrics.getCalculatedAt() != null ? metrics.getCalculatedAt().toString() : null);
        
        history.setMetricsSnapshot(snapshot);
        return history;
    }
}

