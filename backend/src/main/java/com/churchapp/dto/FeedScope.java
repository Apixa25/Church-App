package com.churchapp.dto;

import com.churchapp.entity.Organization;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Structured description of "what the user wants in their feed".
 *
 * This is the contract between every front door (quick chips, natural-language
 * input, future settings screens) and the deterministic feed resolver in
 * {@code FeedFilterService}. The AI parser only ever produces one of these; it
 * never touches posts directly.
 *
 * Persisted as JSONB in {@code feed_preferences.scope_json} when
 * {@code active_filter = CUSTOM}.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class FeedScope {

    public static final int MIN_RADIUS_MILES = 1;
    public static final int MAX_RADIUS_MILES = 250;
    public static final int DEFAULT_RADIUS_MILES = 25;

    /** Include the user's church-primary organization (all visibility levels). */
    @Builder.Default
    private boolean includeChurchPrimary = false;

    /** Include the user's family-primary organization (all visibility levels). */
    @Builder.Default
    private boolean includeFamilyPrimary = false;

    /** Include posts from mutual follows ("friends": both users follow each other). */
    @Builder.Default
    private boolean includeFriends = false;

    /** Include posts from everyone the user follows (one-way). */
    @Builder.Default
    private boolean includeFollowing = false;

    /** Include every unmuted group the user belongs to. */
    @Builder.Default
    private boolean includeMyGroups = false;

    /** Explicit organizations (member or non-member). Non-member orgs only surface PUBLIC posts. */
    @Builder.Default
    private List<UUID> organizationIds = new ArrayList<>();

    /** Explicit groups. Must be groups the user belongs to; others are stripped by the validator. */
    @Builder.Default
    private List<UUID> groupIds = new ArrayList<>();

    /** Discover organizations near the user. Null when not requested. */
    private NearbyScope nearby;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class NearbyScope {

        /** Search radius in miles, clamped to [MIN_RADIUS_MILES, MAX_RADIUS_MILES]. */
        @Builder.Default
        private Integer radiusMiles = DEFAULT_RADIUS_MILES;

        /** Only include organizations sharing the user's church-primary denomination. */
        @Builder.Default
        private boolean sameDenominationOnly = false;

        /** Explicit denomination filter (e.g. "Baptist"). Overrides sameDenominationOnly when set. */
        private String denomination;

        /** Organization types to discover. FAMILY and GLOBAL are always excluded. Defaults to CHURCH. */
        @Builder.Default
        private List<Organization.OrganizationType> orgTypes = new ArrayList<>(List.of(Organization.OrganizationType.CHURCH));
    }

    /** True when nothing at all is selected; the resolver treats this as an empty feed. */
    public boolean isEmpty() {
        return !includeChurchPrimary
            && !includeFamilyPrimary
            && !includeFriends
            && !includeFollowing
            && !includeMyGroups
            && (organizationIds == null || organizationIds.isEmpty())
            && (groupIds == null || groupIds.isEmpty())
            && nearby == null;
    }

    public boolean hasNearby() {
        return nearby != null;
    }
}
