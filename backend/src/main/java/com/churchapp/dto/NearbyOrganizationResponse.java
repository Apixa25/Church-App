package com.churchapp.dto;

import com.churchapp.entity.Organization;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Result of GET /organizations/nearby.
 *
 * Deliberately a discovery-safe shape: the same public fields the browse list exposes
 * (no Stripe/subscription/settings) plus coordinates so the map can pin each church.
 * Coordinates are only ever present for organizations that opted in with
 * {@code discoverable = true}, which the repository query already enforces.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class NearbyOrganizationResponse {

    /** Where the search was centred; echoes back the resolved point when a text location was used. */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Center {
        private double latitude;
        private double longitude;
        /** Human label for the centre (e.g. the text the user typed, or "Your location"). */
        private String label;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Item {
        private UUID id;
        private String name;
        private String slug;
        private String logoUrl;
        private String type;
        private String denomination;
        private String city;
        private String stateProvince;
        private BigDecimal latitude;
        private BigDecimal longitude;
        /** Great-circle distance from the search centre, rounded to 0.1 mi. */
        private double distanceMiles;
        private Long memberCount;

        public static Item from(Organization org, double distanceMiles, Long memberCount) {
            Item item = new Item();
            item.setId(org.getId());
            item.setName(org.getName());
            item.setSlug(org.getSlug());
            item.setLogoUrl(org.getLogoUrl());
            item.setType(org.getType() != null ? org.getType().name() : null);
            item.setDenomination(org.getDenomination());
            item.setCity(org.getCity());
            item.setStateProvince(org.getStateProvince());
            item.setLatitude(org.getLatitude());
            item.setLongitude(org.getLongitude());
            item.setDistanceMiles(Math.round(distanceMiles * 10.0) / 10.0);
            item.setMemberCount(memberCount != null ? memberCount : 0L);
            return item;
        }
    }

    private Center center;
    private double radiusMiles;
    private List<Item> results;
}
