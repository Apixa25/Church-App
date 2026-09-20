package com.churchapp.dto;

import com.churchapp.entity.Organization;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrganizationRequest {

    @NotBlank(message = "Organization name is required")
    @Size(min = 2, max = 255, message = "Organization name must be between 2 and 255 characters")
    private String name;

    @NotBlank(message = "Organization slug is required")
    @Pattern(regexp = "^[a-z0-9-]+$", message = "Slug must contain only lowercase letters, numbers, and hyphens")
    @Size(min = 2, max = 100, message = "Slug must be between 2 and 100 characters")
    private String slug;

    @NotBlank(message = "Organization type is required")
    private String type; // CHURCH, MINISTRY, NONPROFIT, GLOBAL

    private String tier; // BASIC, PREMIUM (defaults to BASIC if not provided)

    private Map<String, Object> settings;
    private Map<String, Object> metadata;
    private UUID parentOrganizationId;
    private String logoUrl;

    private String adminContactName;

    private String adminContactPhone;

    private String adminContactEmail;

    private String adminContactAddress;

    // ---- Location & discovery (V53) - all optional --------------------------
    private String denomination;
    private String addressLine1;
    private String addressLine2;
    private String city;
    private String stateProvince;
    private String postalCode;
    private String country;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String geocodeStatus;
    private Boolean discoverable;

    public Organization toOrganization() {
        Organization org = toOrganizationUpdate();

        if (this.tier == null) {
            org.setTier(Organization.SubscriptionTier.BASIC); // Default
        }
        if (org.getDiscoverable() == null) {
            org.setDiscoverable(true);
        }

        // Status defaults to TRIAL for new orgs only.
        org.setStatus(Organization.OrganizationStatus.TRIAL);

        return org;
    }

    public Organization toOrganizationUpdate() {
        Organization org = new Organization();
        org.setTier(null);
        org.setStatus(null);
        org.setMetadata(null);
        org.setName(this.name);
        org.setSlug(this.slug);
        org.setLogoUrl(this.logoUrl);

        // Parse enums
        if (this.type != null) {
            org.setType(Organization.OrganizationType.valueOf(this.type.toUpperCase()));
        }

        if (this.tier != null) {
            org.setTier(Organization.SubscriptionTier.valueOf(this.tier.toUpperCase()));
        }

        org.setSettings(this.settings);

        // Preserve existing metadata and include admin contact details when provided.
        Map<String, Object> mergedMetadata = new java.util.HashMap<>();
        if (this.metadata != null) {
            mergedMetadata.putAll(this.metadata);
        }
        if (this.adminContactName != null && !this.adminContactName.trim().isEmpty()) {
            mergedMetadata.put("adminContactName", this.adminContactName.trim());
        }
        if (this.adminContactPhone != null && !this.adminContactPhone.trim().isEmpty()) {
            mergedMetadata.put("adminContactPhone", this.adminContactPhone.trim());
        }
        if (this.adminContactEmail != null && !this.adminContactEmail.trim().isEmpty()) {
            mergedMetadata.put("adminContactEmail", this.adminContactEmail.trim());
        }
        if (this.adminContactAddress != null && !this.adminContactAddress.trim().isEmpty()) {
            mergedMetadata.put("adminContactAddress", this.adminContactAddress.trim());
        }
        if (!mergedMetadata.isEmpty()) {
            org.setMetadata(mergedMetadata);
        }

        // Location & discovery - null means "not provided" so the service leaves the existing value alone
        org.setDenomination(trimToNull(this.denomination));
        org.setAddressLine1(trimToNull(this.addressLine1));
        org.setAddressLine2(trimToNull(this.addressLine2));
        org.setCity(trimToNull(this.city));
        org.setStateProvince(trimToNull(this.stateProvince));
        org.setPostalCode(trimToNull(this.postalCode));
        org.setCountry(trimToNull(this.country));
        org.setLatitude(this.latitude);
        org.setLongitude(this.longitude);
        org.setGeocodeStatus(trimToNull(this.geocodeStatus));
        org.setDiscoverable(this.discoverable);

        // Parent org relationship set separately by service layer

        return org;
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
