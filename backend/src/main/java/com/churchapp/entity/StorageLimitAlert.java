package com.churchapp.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "storage_limit_alerts", indexes = {
        @Index(name = "idx_storage_alerts_org", columnList = "organization_id"),
        @Index(name = "idx_storage_alerts_created", columnList = "created_at DESC")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StorageLimitAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(name = "alert_level", nullable = false, length = 20)
    private String alertLevel;

    @Column(name = "usage_percent", nullable = false)
    private Integer usagePercent;

    @Column(name = "storage_used", nullable = false)
    private Long storageUsed;

    @Column(name = "limit_bytes", nullable = false)
    private Long limitBytes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}

