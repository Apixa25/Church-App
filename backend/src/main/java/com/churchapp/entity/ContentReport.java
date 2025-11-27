package com.churchapp.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "content_reports", indexes = {
    @Index(name = "idx_content_reports_content_type_id", columnList = "content_type, content_id"),
    @Index(name = "idx_content_reports_reporter_id", columnList = "reporter_id"),
    @Index(name = "idx_content_reports_status", columnList = "status"),
    @Index(name = "idx_content_reports_priority", columnList = "priority"),
    @Index(name = "idx_content_reports_created_at", columnList = "created_at")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContentReport {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "content_type", nullable = false, length = 50)
    private String contentType; // POST, COMMENT, PRAYER, ANNOUNCEMENT, MESSAGE, USER

    @Column(name = "content_id", nullable = false)
    private UUID contentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;

    @Column(name = "reason", nullable = false, length = 100)
    private String reason; // SPAM, HARASSMENT, HATE_SPEECH, INAPPROPRIATE, COPYRIGHT, OTHER

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "status", nullable = false, length = 50)
    @Builder.Default
    private String status = "PENDING"; // PENDING, REVIEWING, RESOLVED, DISMISSED

    @Column(name = "priority", nullable = false, length = 50)
    @Builder.Default
    private String priority = "MEDIUM"; // LOW, MEDIUM, HIGH, URGENT

    @Column(name = "moderation_action", length = 50)
    private String moderationAction; // APPROVED, REMOVED, HIDDEN, WARNED

    @Column(name = "moderation_reason", columnDefinition = "TEXT")
    private String moderationReason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "moderated_by")
    private User moderatedBy;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    @Column(name = "moderated_at")
    private LocalDateTime moderatedAt;

    @Column(name = "is_auto_flagged", nullable = false)
    @Builder.Default
    private Boolean isAutoFlagged = false;

    @Column(name = "auto_flag_reason", columnDefinition = "TEXT")
    private String autoFlagReason;

    @Column(name = "report_count", nullable = false)
    @Builder.Default
    private Integer reportCount = 1;

    @CreationTimestamp
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}

