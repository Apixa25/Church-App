package com.churchapp.dto;

import com.churchapp.entity.Organization;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
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

    public Organization toOrganization() {
        Organization org = new Organization();
        org.setName(this.name);
        org.setSlug(this.slug);

        // Parse enums
        if (this.type != null) {
            org.setType(Organization.OrganizationType.valueOf(this.type.toUpperCase()));
        }

        if (this.tier != null) {
            org.setTier(Organization.SubscriptionTier.valueOf(this.tier.toUpperCase()));
        } else {
            org.setTier(Organization.SubscriptionTier.BASIC); // Default
        }

        // Status defaults to TRIAL for new orgs
        org.setStatus(Organization.OrganizationStatus.TRIAL);

        org.setSettings(this.settings);
        org.setMetadata(this.metadata);

        // Parent org relationship set separately by service layer

        return org;
    }
}
