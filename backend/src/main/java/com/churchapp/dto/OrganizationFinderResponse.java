package com.churchapp.dto;

import com.churchapp.entity.Organization;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Result of POST /organizations/finder - the natural-language organization search.
 *
 * Always explains itself: {@code interpretation} says what we actually searched for so the
 * user can tell when the AI (or the rules) misread them, and {@code warnings} lists criteria
 * we had to ignore.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrganizationFinderResponse {

    /** Structured reading of the request; echoed so the UI can offer tweaks (radius, denomination). */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Intent {
        @Builder.Default
        private List<String> nameHints = new ArrayList<>();
        private String denomination;
        @Builder.Default
        private List<String> orgTypes = new ArrayList<>();
        private String placeText;
        private boolean nearUser;
        private Integer radiusMiles;
    }

    /** Discovery-safe organization card data (same fields as the public browse list) plus distance. */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Match {
        private UUID id;
        private String name;
        private String slug;
        private String logoUrl;
        private String type;
        private String tier;
        private String denomination;
        private String city;
        private String stateProvince;
        private Long memberCount;
        /** Null when the search wasn't centred on a place. */
        private Double distanceMiles;

        public static Match from(Organization org, Long memberCount, Double distanceMiles) {
            Match m = new Match();
            m.setId(org.getId());
            m.setName(org.getName());
            m.setSlug(org.getSlug());
            m.setLogoUrl(org.getLogoUrl());
            m.setType(org.getType() != null ? org.getType().name() : null);
            m.setTier(org.getTier() != null ? org.getTier().name() : null);
            m.setDenomination(org.getDenomination());
            m.setCity(org.getCity());
            m.setStateProvince(org.getStateProvince());
            m.setMemberCount(memberCount != null ? memberCount : 0L);
            m.setDistanceMiles(distanceMiles);
            return m;
        }
    }

    /** Human sentence: "Baptist churches within 25 mi of Austin, TX". */
    private String interpretation;
    /** RULES or AI. */
    private String source;
    private double confidence;
    private String clarificationQuestion;

    /** True when the user said "near me" but no coordinates were supplied - client should retry with lat/lng. */
    private boolean needsLocation;
    /** True when the request was really about a family group - client should point at the invite flow. */
    private boolean familyRequested;

    private Intent intent;
    @Builder.Default
    private List<Match> results = new ArrayList<>();
    @Builder.Default
    private List<String> warnings = new ArrayList<>();
    private String sourceText;
}
