package com.churchapp.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_organization_history", indexes = {
    @Index(name = "idx_user_org_history_user_id", columnList = "user_id"),
    @Index(name = "idx_user_org_history_switched_at", columnList = "switched_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserOrganizationHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_organization_id")
    private Organization fromOrganization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_organization_id")
    private Organization toOrganization;

    @Column(name = "switched_at", nullable = false)
    private LocalDateTime switchedAt;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;
}
