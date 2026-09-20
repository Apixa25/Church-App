package com.churchapp.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "organizations", indexes = {
    @Index(name = "idx_organizations_slug", columnList = "slug"),
    @Index(name = "idx_organizations_type", columnList = "type"),
    @Index(name = "idx_organizations_status", columnList = "status"),
    @Index(name = "idx_organizations_parent", columnList = "parent_organization_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Organization {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @NotBlank(message = "Organization name is required")
    @Size(min = 2, max = 255, message = "Name must be between 2 and 255 characters")
    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @NotBlank(message = "Organization slug is required")
    @Size(min = 2, max = 100, message = "Slug must be between 2 and 100 characters")
    @Column(name = "slug", unique = true, nullable = false, length = 100)
    private String slug;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 50)
    private OrganizationType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "tier", nullable = false, length = 20)
    private SubscriptionTier tier = SubscriptionTier.BASIC;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private OrganizationStatus status = OrganizationStatus.TRIAL;

    @Column(name = "stripe_connect_account_id", length = 255)
    private String stripeConnectAccountId;

    @Column(name = "subscription_expires_at")
    private LocalDateTime subscriptionExpiresAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "settings", columnDefinition = "jsonb")
    private Map<String, Object> settings = new HashMap<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    private Map<String, Object> metadata = new HashMap<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_organization_id")
    private Organization parentOrganization;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "logo_url", length = 500)
    private String logoUrl;

    @Column(name = "storage_limit_bytes")
    private Long storageLimitBytes;

    @Column(name = "storage_alert_threshold")
    private Integer storageAlertThreshold = 80;

    @Enumerated(EnumType.STRING)
    @Column(name = "storage_limit_status", length = 20)
    private StorageLimitStatus storageLimitStatus = StorageLimitStatus.OK;

    @Column(name = "storage_limit_notified")
    private Boolean storageLimitNotified = false;

    // ---- Location & discovery (V53) -------------------------------------
    // Used by "nearby" / "same denomination" feed scopes. Mirrors the
    // structured address fields on User (V9).

    @Column(name = "denomination", length = 100)
    private String denomination;

    @Column(name = "address_line1", length = 255)
    private String addressLine1;

    @Column(name = "address_line2", length = 255)
    private String addressLine2;

    @Column(name = "city", length = 100)
    private String city;

    @Column(name = "state_province", length = 100)
    private String stateProvince;

    @Column(name = "postal_code", length = 20)
    private String postalCode;

    @Column(name = "country", length = 100)
    private String country;

    @Column(name = "latitude", precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(name = "longitude", precision = 9, scale = 6)
    private BigDecimal longitude;

    @Column(name = "geocode_status", length = 50)
    private String geocodeStatus;

    /** When false, this organization is never surfaced by nearby/denomination discovery. */
    @Column(name = "discoverable", nullable = false)
    private Boolean discoverable = true;

    public enum OrganizationType {
        CHURCH,
        MINISTRY,
        NONPROFIT,
        FAMILY,     // For family organizations - goes in Family Primary slot
        GENERAL,    // General purpose orgs - goes in Church Primary slot
        GLOBAL
    }

    public enum SubscriptionTier {
        BASIC,
        PREMIUM
    }

    public enum OrganizationStatus {
        TRIAL,
        ACTIVE,
        SUSPENDED,
        CANCELLED
    }

    public enum StorageLimitStatus {
        OK,
        WARNING,
        CRITICAL,
        OVER_LIMIT
    }
}
