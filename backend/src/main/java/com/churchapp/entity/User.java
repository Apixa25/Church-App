package com.churchapp.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "users", indexes = {
    @Index(name = "idx_user_email", columnList = "email"),
    @Index(name = "idx_user_google_id", columnList = "google_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;
    
    @Email(message = "Email should be valid")
    @NotBlank(message = "Email is required")
    @Column(name = "email", unique = true, nullable = false, length = 255)
    private String email;
    
    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
    @Column(name = "name", nullable = false, length = 100)
    private String name;
    
    @Column(name = "profile_pic_url", length = 500)
    private String profilePicUrl;
    
    @Column(name = "banner_image_url", length = 500)
    private String bannerImageUrl;
    
    @Column(name = "bio", columnDefinition = "TEXT")
    private String bio;
    
    @Column(name = "location", length = 255)
    private String location;
    
    @Column(name = "website", length = 500)
    private String website;
    
    @Column(name = "interests", columnDefinition = "TEXT")
    private String interests; // JSON string of interests array
    
    @Column(name = "phone_number", length = 20)
    private String phoneNumber;
    
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
    
    @Column(name = "birthday")
    private LocalDate birthday;
    
    @Column(name = "spiritual_gift", length = 255)
    private String spiritualGift;
    
    @Column(name = "equipping_gifts", length = 255)
    private String equippingGifts;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private Role role = Role.USER;
    
    @Column(name = "google_id", length = 255)
    private String googleId;
    
    @Column(name = "password_hash", length = 255)
    private String passwordHash;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @Column(name = "last_login")
    private LocalDateTime lastLogin;
    
    @JsonProperty("isActive")
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    // Admin/Moderation fields
    @JsonProperty("isBanned")
    @Column(name = "is_banned", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE NOT NULL")
    private boolean isBanned = false;

    @Column(name = "ban_reason", columnDefinition = "TEXT")
    private String banReason;

    @Column(name = "banned_at")
    private LocalDateTime bannedAt;

    @Column(name = "warning_count", nullable = false, columnDefinition = "INT DEFAULT 0 NOT NULL")
    private int warningCount = 0;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    // Social score - hearts count
    @Column(name = "hearts_count", nullable = false, columnDefinition = "INT DEFAULT 0 NOT NULL")
    private Integer heartsCount = 0;

    // Multi-tenant organization fields - Dual Primary System
    // Church Primary: Can hold CHURCH, MINISTRY, NONPROFIT, GENERAL type organizations
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "church_primary_organization_id")
    private Organization churchPrimaryOrganization;

    // Family Primary: Can hold FAMILY type organizations only
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "family_primary_organization_id")
    private Organization familyPrimaryOrganization;

    @Column(name = "created_via", length = 100)
    private String createdVia; // App slug that user signed up through

    // Note: lastOrgSwitchAt removed - no more cooldown! Users can switch freely like real life!

    // Donation relationships
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Donation> donations = new ArrayList<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<DonationSubscription> donationSubscriptions = new ArrayList<>();

    public enum Role {
        USER,           // Regular user (renamed from MEMBER for clarity)
        MODERATOR,      // Platform-level content moderator
        PLATFORM_ADMIN  // System administrator - Master of Everything!
    }

    // ========================================================================
    // BACKWARD COMPATIBILITY & HELPER METHODS
    // ========================================================================

    /**
     * Backward compatibility: Returns church primary organization.
     * This allows existing code that calls getPrimaryOrganization() to still work.
     * @deprecated Use getChurchPrimaryOrganization() instead
     */
    @Deprecated
    public Organization getPrimaryOrganization() {
        return churchPrimaryOrganization;
    }

    /**
     * Backward compatibility: Sets church primary organization.
     * @deprecated Use setChurchPrimaryOrganization() instead
     */
    @Deprecated
    public void setPrimaryOrganization(Organization org) {
        this.churchPrimaryOrganization = org;
    }

    /**
     * Check if user has any primary organization (church OR family)
     */
    public boolean hasAnyPrimaryOrganization() {
        return churchPrimaryOrganization != null || familyPrimaryOrganization != null;
    }

    /**
     * Check if user has a church-type primary organization
     */
    public boolean hasChurchPrimary() {
        return churchPrimaryOrganization != null;
    }

    /**
     * Check if user has a family-type primary organization
     */
    public boolean hasFamilyPrimary() {
        return familyPrimaryOrganization != null;
    }

    // ========================================================================
    // SOCIAL SCORE - HEARTS COUNT METHODS
    // ========================================================================

    /**
     * Increment hearts count (when user receives a heart)
     */
    public void incrementHeartsCount() {
        this.heartsCount = this.heartsCount + 1;
    }

    /**
     * Decrement hearts count (when user loses a heart)
     */
    public void decrementHeartsCount() {
        if (this.heartsCount > 0) {
            this.heartsCount = this.heartsCount - 1;
        }
    }
}