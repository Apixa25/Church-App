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
@Table(name = "user_organization_memberships",
    uniqueConstraints = @UniqueConstraint(name = "uk_user_org", columnNames = {"user_id", "organization_id"}),
    indexes = {
        @Index(name = "idx_user_org_user_id", columnList = "user_id"),
        @Index(name = "idx_user_org_organization_id", columnList = "organization_id"),
        @Index(name = "idx_user_org_is_primary", columnList = "is_primary")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserOrganizationMembership {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(name = "is_primary", nullable = false)
    private Boolean isPrimary = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private OrgRole role = OrgRole.MEMBER;

    // Slot type for dual-primary system: CHURCH, FAMILY, or GROUP
    @Column(name = "slot_type", length = 20)
    private String slotType;

    @Column(name = "joined_at", nullable = false)
    private LocalDateTime joinedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum OrgRole {
        MEMBER,         // Regular organization member
        MODERATOR,      // Organization content moderator
        ORG_ADMIN       // Organization administrator - full control of their org
    }
}
