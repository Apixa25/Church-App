package com.churchapp.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Shareable invite link for an organization. Today only FAMILY organizations mint these
 * (families are private and should be joined by invitation, not by browsing), but the
 * table is type-agnostic so churches could use it later without a migration.
 */
@Entity
@Table(name = "organization_invite_links",
    indexes = {
        @Index(name = "idx_org_invite_link_org", columnList = "organization_id"),
        @Index(name = "idx_org_invite_link_code", columnList = "invite_code"),
        @Index(name = "idx_org_invite_link_creator", columnList = "created_by_user_id")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrganizationInviteLink {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id", nullable = false)
    private User createdBy;

    @Column(name = "invite_code", nullable = false, unique = true, length = 32)
    private String inviteCode;

    @Column(name = "use_count", nullable = false)
    private Integer useCount = 0;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "deactivated_at")
    private LocalDateTime deactivatedAt;
}
