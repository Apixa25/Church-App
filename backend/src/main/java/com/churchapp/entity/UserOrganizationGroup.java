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
@Table(name = "user_organization_groups",
    uniqueConstraints = @UniqueConstraint(name = "uk_user_org_group", columnNames = {"user_id", "organization_id"}),
    indexes = {
        @Index(name = "idx_user_org_groups_user_id", columnList = "user_id"),
        @Index(name = "idx_user_org_groups_org_id", columnList = "organization_id"),
        @Index(name = "idx_user_org_groups_is_muted", columnList = "is_muted")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserOrganizationGroup {

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

    @Column(name = "is_muted", nullable = false)
    private Boolean isMuted = false;

    @Column(name = "joined_at", nullable = false)
    private LocalDateTime joinedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}

