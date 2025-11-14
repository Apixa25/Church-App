package com.churchapp.dto;

import com.churchapp.entity.Organization;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrganizationResponse {

    private UUID id;
    private String name;
    private String slug;
    private String type;
    private String tier;
    private String status;
    private String stripeConnectAccountId;
    private LocalDateTime subscriptionExpiresAt;
    private Map<String, Object> settings;
    private Map<String, Object> metadata;
    private UUID parentOrganizationId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Statistics (to be populated by controller)
    private Long memberCount;
    private Long primaryMemberCount;

    public static OrganizationResponse fromOrganization(Organization org) {
        OrganizationResponse response = new OrganizationResponse();
        response.setId(org.getId());
        response.setName(org.getName());
        response.setSlug(org.getSlug());
        response.setType(org.getType() != null ? org.getType().name() : null);
        response.setTier(org.getTier() != null ? org.getTier().name() : null);
        response.setStatus(org.getStatus() != null ? org.getStatus().name() : null);
        response.setStripeConnectAccountId(org.getStripeConnectAccountId());
        response.setSubscriptionExpiresAt(org.getSubscriptionExpiresAt());
        response.setSettings(org.getSettings());
        response.setMetadata(org.getMetadata());
        response.setParentOrganizationId(org.getParentOrganization() != null ? org.getParentOrganization().getId() : null);
        response.setCreatedAt(org.getCreatedAt());
        response.setUpdatedAt(org.getUpdatedAt());
        return response;
    }

    // Simplified version without sensitive data (for public discovery)
    public static OrganizationResponse publicFromOrganization(Organization org) {
        OrganizationResponse response = new OrganizationResponse();
        response.setId(org.getId());
        response.setName(org.getName());
        response.setSlug(org.getSlug());
        response.setType(org.getType() != null ? org.getType().name() : null);
        response.setTier(org.getTier() != null ? org.getTier().name() : null);
        response.setCreatedAt(org.getCreatedAt());
        // Exclude: stripe account, subscription details, settings, metadata
        return response;
    }
}
