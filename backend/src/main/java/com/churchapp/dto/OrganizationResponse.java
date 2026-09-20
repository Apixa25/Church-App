package com.churchapp.dto;

import com.churchapp.entity.Organization;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
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
    private String logoUrl;

    // Location & discovery (V53)
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

    // Statistics (to be populated by controller)
    private Long memberCount;
    private Long primaryMemberCount;

    public static OrganizationResponse fromOrganization(Organization org) {
        OrganizationResponse response = new OrganizationResponse();
        response.setId(org.getId());
        response.setName(org.getName());
        response.setSlug(org.getSlug());
        response.setLogoUrl(org.getLogoUrl());
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
        applyLocation(response, org);
        return response;
    }

    private static void applyLocation(OrganizationResponse response, Organization org) {
        response.setDenomination(org.getDenomination());
        response.setAddressLine1(org.getAddressLine1());
        response.setAddressLine2(org.getAddressLine2());
        response.setCity(org.getCity());
        response.setStateProvince(org.getStateProvince());
        response.setPostalCode(org.getPostalCode());
        response.setCountry(org.getCountry());
        response.setLatitude(org.getLatitude());
        response.setLongitude(org.getLongitude());
        response.setGeocodeStatus(org.getGeocodeStatus());
        response.setDiscoverable(org.getDiscoverable());
    }

    // Simplified version without sensitive data (for public discovery)
    public static OrganizationResponse publicFromOrganization(Organization org) {
        OrganizationResponse response = new OrganizationResponse();
        response.setId(org.getId());
        response.setName(org.getName());
        response.setSlug(org.getSlug());
        response.setLogoUrl(org.getLogoUrl());
        response.setType(org.getType() != null ? org.getType().name() : null);
        response.setTier(org.getTier() != null ? org.getTier().name() : null);
        response.setCreatedAt(org.getCreatedAt());
        // Public discovery needs denomination + city/state (no street address)
        response.setDenomination(org.getDenomination());
        response.setCity(org.getCity());
        response.setStateProvince(org.getStateProvince());
        // Exclude: stripe account, subscription details, settings, metadata, street address
        return response;
    }
}
