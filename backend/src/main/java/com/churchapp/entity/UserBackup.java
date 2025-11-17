package com.churchapp.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_backups", indexes = {
    @Index(name = "idx_user_backup_user_id", columnList = "user_id"),
    @Index(name = "idx_user_backup_created_at", columnList = "created_at")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserBackup {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "backup_id", unique = true, nullable = false, length = 50)
    private String backupId;

    @Column(name = "data_snapshot", columnDefinition = "TEXT")
    private String dataSnapshot; // JSON snapshot of user data

    @Column(name = "file_path", length = 500)
    private String filePath; // Path to backup file if stored

    @Column(name = "file_size_bytes")
    private Long fileSizeBytes;

    @Column(name = "backup_type", nullable = false, length = 50)
    @Builder.Default
    private String backupType = "MANUAL"; // MANUAL, AUTOMATIC, SCHEDULED

    @Column(name = "status", nullable = false, length = 50)
    @Builder.Default
    private String status = "COMPLETED"; // IN_PROGRESS, COMPLETED, FAILED

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt; // When backup should be deleted (GDPR compliance)
}

