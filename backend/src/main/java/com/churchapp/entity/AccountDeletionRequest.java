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
@Table(name = "account_deletion_requests", indexes = {
    @Index(name = "idx_deletion_request_user_id", columnList = "user_id"),
    @Index(name = "idx_deletion_request_status", columnList = "status"),
    @Index(name = "idx_deletion_request_scheduled", columnList = "scheduled_deletion_at")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccountDeletionRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "confirmation_token", unique = true, length = 255)
    private String confirmationToken;

    @Column(name = "scheduled_deletion_at")
    private LocalDateTime scheduledDeletionAt;

    @Column(name = "status", nullable = false, length = 50)
    @Builder.Default
    private String status = "PENDING"; // PENDING, CONFIRMED, CANCELLED, COMPLETED

    @CreationTimestamp
    @Column(name = "requested_at", nullable = false, updatable = false)
    private LocalDateTime requestedAt;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;
}

