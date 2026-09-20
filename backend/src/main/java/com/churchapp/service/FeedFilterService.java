package com.churchapp.service;

import com.churchapp.dto.FeedScope;
import com.churchapp.entity.FeedPreference;
import com.churchapp.entity.Organization;
import com.churchapp.entity.User;
import com.churchapp.repository.FeedPreferenceRepository;
import com.churchapp.repository.OrganizationRepository;
import com.churchapp.repository.UserGroupMembershipRepository;
import com.churchapp.repository.UserOrganizationMembershipRepository;
import com.churchapp.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class FeedFilterService {

    private final FeedPreferenceRepository feedPreferenceRepository;
    private final UserOrganizationMembershipRepository orgMembershipRepository;
    private final UserGroupMembershipRepository groupMembershipRepository;
    private final UserRepository userRepository;
    private final OrganizationGroupService organizationGroupService;
    private final OrganizationRepository organizationRepository;
    private final UserFollowService userFollowService;
    private final ObjectMapper objectMapper;

    private static final UUID GLOBAL_ORG_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    // ========================================================================
    // FEED PREFERENCE MANAGEMENT
    // ========================================================================

    public FeedPreference getFeedPreference(UUID userId) {
        return feedPreferenceRepository.findByUserId(userId)
            .orElseGet(() -> createDefaultPreference(userId));
    }

    public FeedPreference updateFeedPreference(UUID userId, FeedPreference.FeedFilter filter, List<UUID> selectedGroupIds, UUID selectedOrganizationId) {
        try {
            log.info("🔧 updateFeedPreference called: userId={}, filter={}, selectedGroupIds={}, selectedOrganizationId={}", 
                userId, filter, selectedGroupIds, selectedOrganizationId);
            
            FeedPreference preference = feedPreferenceRepository.findByUserId(userId)
                .orElseGet(() -> createDefaultPreference(userId));

            // Ensure user is loaded and set (in case it's a lazy proxy)
            if (preference.getUser() == null || preference.getUser().getId() == null) {
                log.warn("FeedPreference for user {} has null or unloaded user, reloading", userId);
                User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found: " + userId));
                preference.setUser(user);
            } else {
                // Force initialization of lazy proxy by accessing ID
                try {
                    preference.getUser().getId();
                } catch (Exception e) {
                    log.warn("Failed to access user ID, reloading user for preference", e);
                    User user = userRepository.findById(userId)
                        .orElseThrow(() -> new RuntimeException("User not found: " + userId));
                    preference.setUser(user);
                }
            }

            preference.setActiveFilter(filter);

            // Handle selectedGroupIds based on filter type
            if (filter == FeedPreference.FeedFilter.SELECTED_GROUPS) {
                // For SELECTED_GROUPS, save the selected group IDs
                preference.setSelectedGroupIds(selectedGroupIds != null ? selectedGroupIds : new ArrayList<>());
                preference.setSelectedOrganizationId(null); // Clear org selection
            } else if (filter == FeedPreference.FeedFilter.PRIMARY_ONLY) {
                // For PRIMARY_ONLY, save the selected organization ID
                preference.setSelectedOrganizationId(selectedOrganizationId);
                preference.setSelectedGroupIds(new ArrayList<>()); // Clear group selection
            } else {
                // For ALL and EVERYTHING, clear both
                preference.setSelectedGroupIds(new ArrayList<>());
                preference.setSelectedOrganizationId(null);
            }

            preference.setUpdatedAt(LocalDateTime.now());

            FeedPreference saved = feedPreferenceRepository.save(preference);
            
            log.info("✅ Saved feed preference for user {}: filter={}, selectedOrgId={}, selectedGroupIds={}", 
                userId, saved.getActiveFilter(), saved.getSelectedOrganizationId(), saved.getSelectedGroupIds());

            return saved;
        } catch (Exception e) {
            log.error("❌ Error updating feed preference for user {}", userId, e);
            throw new RuntimeException("Failed to update feed preference: " + e.getMessage(), e);
        }
    }

    private FeedPreference createDefaultPreference(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        // Check if preference already exists (race condition protection)
        FeedPreference existing = feedPreferenceRepository.findByUserId(userId).orElse(null);
        if (existing != null) {
            return existing;
        }

        FeedPreference preference = new FeedPreference();
        preference.setUser(user);
        preference.setActiveFilter(FeedPreference.FeedFilter.EVERYTHING);
        preference.setSelectedGroupIds(new ArrayList<>());
        preference.setUpdatedAt(LocalDateTime.now());

        try {
            return feedPreferenceRepository.save(preference);
        } catch (Exception e) {
            log.error("Error creating default feed preference for user {}", userId, e);
            // If save fails (e.g., unique constraint violation), try to fetch existing
            return feedPreferenceRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Failed to create or retrieve feed preference", e));
        }
    }

    // ========================================================================
    // FEED VISIBILITY CALCULATIONS
    // ========================================================================

    /**
     * Get the user's primary organization ID (nullable for global users)
     * Note: This returns the churchPrimary. For dual-primary support, use getAllPrimaryOrgIds().
     */
    public UUID getUserPrimaryOrgId(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        return user.getPrimaryOrganization() != null
            ? user.getPrimaryOrganization().getId()
            : null;
    }

    /**
     * Get ALL primary organization IDs (supports dual-primary system: churchPrimary + familyPrimary)
     * Posts from these orgs show all visibility levels in the feed
     */
    public List<UUID> getAllPrimaryOrgIds(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        List<UUID> primaryOrgIds = new ArrayList<>();
        if (user.getPrimaryOrganization() != null) {
            primaryOrgIds.add(user.getPrimaryOrganization().getId()); // churchPrimary
        }
        if (user.getFamilyPrimaryOrganization() != null) {
            primaryOrgIds.add(user.getFamilyPrimaryOrganization().getId()); // familyPrimary
        }
        return primaryOrgIds;
    }

    /**
     * Get list of secondary organization IDs (orgs user is a member of but not primary)
     */
    public List<UUID> getUserSecondaryOrgIds(UUID userId) {
        return orgMembershipRepository.findSecondaryMembershipsByUserId(userId)
            .stream()
            .map(membership -> membership.getOrganization().getId())
            .collect(Collectors.toList());
    }

    /**
     * Get list of unmuted group IDs that user is a member of
     */
    public List<UUID> getUserUnmutedGroupIds(UUID userId) {
        return groupMembershipRepository.findUnmutedGroupIdsByUserId(userId);
    }

    /**
     * Get list of all group IDs (including muted) that user is a member of
     */
    public List<UUID> getUserAllGroupIds(UUID userId) {
        return groupMembershipRepository.findByUserId(userId)
            .stream()
            .map(membership -> membership.getGroup().getId())
            .collect(Collectors.toList());
    }

    /**
     * Calculate which group IDs should be visible based on user's feed filter preference
     */
    public List<UUID> getVisibleGroupIds(UUID userId) {
        FeedPreference preference = getFeedPreference(userId);

        switch (preference.getActiveFilter()) {
            case PRIMARY_ONLY:
                // No groups shown, only primary org content
                return new ArrayList<>();

            case SELECTED_GROUPS:
                // Only show selected groups that user is actually a member of
                List<UUID> userGroupIds = getUserUnmutedGroupIds(userId);
                List<UUID> selectedIds = preference.getSelectedGroupIds();

                if (selectedIds == null || selectedIds.isEmpty()) {
                    return new ArrayList<>();
                }

                return selectedIds.stream()
                    .filter(userGroupIds::contains)
                    .collect(Collectors.toList());

            case CUSTOM:
                return resolveCustomScope(userId, readScope(preference), getAllPrimaryOrgIds(userId)).getGroupIds();

            case EVERYTHING:
            case ALL:
            default:
                // Show all unmuted groups
                return getUserUnmutedGroupIds(userId);
        }
    }

    /**
     * Calculate which organization IDs should be visible based on filter
     * Supports dual-primary system with selectedOrganizationId for PRIMARY_ONLY filter
     */
    public List<UUID> getVisibleOrgIds(UUID userId) {
        FeedPreference preference = getFeedPreference(userId);
        List<UUID> allPrimaryOrgIds = getAllPrimaryOrgIds(userId);

        List<UUID> visibleOrgs = new ArrayList<>();

        // Handle PRIMARY_ONLY filter - only show selected organization
        if (preference.getActiveFilter() == FeedPreference.FeedFilter.PRIMARY_ONLY) {
            if (preference.getSelectedOrganizationId() != null) {
                // Filter by the specifically selected organization
                visibleOrgs.add(preference.getSelectedOrganizationId());
            } else {
                // Fallback: if no selectedOrganizationId, use first primary org (churchPrimary)
                if (!allPrimaryOrgIds.isEmpty()) {
                    visibleOrgs.add(allPrimaryOrgIds.get(0));
                }
            }
            return visibleOrgs;
        }

        // CUSTOM: whatever the scope resolves to (member + discovered orgs)
        if (preference.getActiveFilter() == FeedPreference.FeedFilter.CUSTOM) {
            FeedParameters params = resolveCustomScope(userId, readScope(preference), allPrimaryOrgIds);
            visibleOrgs.addAll(params.getPrimaryOrgIds());
            visibleOrgs.addAll(params.getSecondaryOrgIds());
            return visibleOrgs;
        }

        // For other filters, include all primary orgs
        visibleOrgs.addAll(allPrimaryOrgIds);

        // Add secondary orgs
        visibleOrgs.addAll(getUserSecondaryOrgIds(userId));
        
        // When filter is EVERYTHING, include Global org so users can see posts from social-only users
        if (preference.getActiveFilter() == FeedPreference.FeedFilter.EVERYTHING) {
            visibleOrgs.add(GLOBAL_ORG_ID);
        }

        return visibleOrgs;
    }

    /**
     * Check if user has a primary organization (used to determine if prayers/events are accessible)
     */
    public boolean hasPrimaryOrganization(UUID userId) {
        return getUserPrimaryOrgId(userId) != null;
    }

    /**
     * Get the global organization ID for users without a primary org
     */
    public UUID getGlobalOrgId() {
        return GLOBAL_ORG_ID;
    }

    // ========================================================================
    // FEED COMPOSITION HELPERS
    // ========================================================================

    /**
     * Get complete feed parameters for a user based on their preferences
     * Supports dual-primary system (churchPrimary + familyPrimary)
     * 
     * FILTER BEHAVIOR:
     * - EVERYTHING: Universal catch-all (handled in PostService via global main-feed query)
     * - ALL: Church + Family + Groups + Followed Users + Org-as-Groups (NO Global Feed)
     * - PRIMARY_ONLY: ONLY the selected organization (no groups, no followed users, no org-as-groups)
     * - SELECTED_GROUPS: ONLY selected groups (no orgs, no followed users, no org-as-groups)
     */
    public FeedParameters getFeedParameters(UUID userId) {
        FeedPreference preference = getFeedPreference(userId);
        FeedPreference.FeedFilter activeFilter = preference.getActiveFilter();
        List<UUID> allPrimaryOrgIds = getAllPrimaryOrgIds(userId);
        
        log.info("📊 getFeedParameters for user {}: filter={}, selectedOrgId={}, selectedGroupIds={}", 
            userId, activeFilter, preference.getSelectedOrganizationId(), preference.getSelectedGroupIds());
        
        // ===== FILTER 1: PRIMARY_ONLY =====
        // Shows ONLY posts from the selected primary organization
        // No groups, no secondary orgs, no org-as-groups
        if (activeFilter == FeedPreference.FeedFilter.PRIMARY_ONLY) {
            UUID selectedOrgId = preference.getSelectedOrganizationId();
            
            // If no org is selected, fall back to first primary org (churchPrimary)
            if (selectedOrgId == null && !allPrimaryOrgIds.isEmpty()) {
                selectedOrgId = allPrimaryOrgIds.get(0);
                log.warn("⚠️ PRIMARY_ONLY filter but no selectedOrganizationId, falling back to first primary: {}", selectedOrgId);
            }
            
            List<UUID> primaryOnly = selectedOrgId != null ? List.of(selectedOrgId) : new ArrayList<>();
            
            log.info("🎯 PRIMARY_ONLY filter - returning only org: {}", primaryOnly);
            return new FeedParameters(
                primaryOnly,       // Only the selected org
                new ArrayList<>(), // NO secondary orgs
                new ArrayList<>(), // NO groups
                new ArrayList<>()  // NO org-as-groups
            );
        }
        
        // ===== FILTER 2: SELECTED_GROUPS =====
        // Shows ONLY posts from user-selected groups
        // No orgs, no org-as-groups
        if (activeFilter == FeedPreference.FeedFilter.SELECTED_GROUPS) {
            List<UUID> selectedGroupIds = preference.getSelectedGroupIds();
            if (selectedGroupIds == null) {
                selectedGroupIds = new ArrayList<>();
            }
            
            // Only include groups user is actually a member of
            List<UUID> userGroupIds = getUserUnmutedGroupIds(userId);
            List<UUID> validSelectedGroups = selectedGroupIds.stream()
                .filter(userGroupIds::contains)
                .collect(Collectors.toList());
            
            log.info("🎯 SELECTED_GROUPS filter - returning only groups: {}", validSelectedGroups);
            return new FeedParameters(
                new ArrayList<>(), // NO primary orgs
                new ArrayList<>(), // NO secondary orgs
                validSelectedGroups, // Only selected groups
                new ArrayList<>()  // NO org-as-groups
            );
        }
        
        // ===== FILTER 5: CUSTOM (flexible FeedScope) =====
        // Church and/or family and/or friends and/or explicit orgs/groups and/or nearby churches
        if (activeFilter == FeedPreference.FeedFilter.CUSTOM) {
            return resolveCustomScope(userId, readScope(preference), allPrimaryOrgIds);
        }

        // ===== FILTER 3 & 4: EVERYTHING and ALL =====
        // EVERYTHING: Church + Family + Groups + Global Feed + Org-as-Groups
        // ALL: Church + Family + Groups + Org-as-Groups (NO Global Feed)
        
        // Primary orgs = all primary orgs (churchPrimary + familyPrimary)
        List<UUID> primaryOrgIds = new ArrayList<>(allPrimaryOrgIds);
        
        // Secondary orgs = orgs user is a member of but not primary
        List<UUID> secondaryOrgIds = getUserSecondaryOrgIds(userId);
        
        // For EVERYTHING filter, include Global org so users can see posts from social-only users
        if (activeFilter == FeedPreference.FeedFilter.EVERYTHING) {
            if (!secondaryOrgIds.contains(GLOBAL_ORG_ID)) {
                secondaryOrgIds.add(GLOBAL_ORG_ID);
            }
            log.info("🌐 EVERYTHING filter - including Global org in secondary orgs");
        }
        
        // Groups = all unmuted groups user is a member of
        List<UUID> groupIds = getUserUnmutedGroupIds(userId);
        
        // Org-as-groups = organizations followed as groups (unmuted only)
        List<UUID> orgAsGroupIds = organizationGroupService.getUnmutedFollowedOrganizationIds(userId);
        
        log.info("🎯 {} filter - primaryOrgs={}, secondaryOrgs={}, groups={}, orgAsGroups={}", 
            activeFilter, primaryOrgIds.size(), secondaryOrgIds.size(), groupIds.size(), orgAsGroupIds.size());
        
        return new FeedParameters(primaryOrgIds, secondaryOrgIds, groupIds, orgAsGroupIds);
    }

    // ========================================================================
    // CUSTOM SCOPE (FeedScope -> FeedParameters)
    // ========================================================================

    /**
     * Reads the persisted FeedScope for a preference. Returns an empty scope when
     * none is stored so a CUSTOM filter with no scope yields an empty feed rather
     * than an error.
     */
    public FeedScope readScope(FeedPreference preference) {
        if (preference == null || preference.getScopeJson() == null || preference.getScopeJson().isEmpty()) {
            return new FeedScope();
        }
        try {
            return objectMapper.convertValue(preference.getScopeJson(), FeedScope.class);
        } catch (IllegalArgumentException e) {
            log.warn("⚠️ Could not parse stored FeedScope for preference {}: {}", preference.getId(), e.getMessage());
            return new FeedScope();
        }
    }

    /**
     * Persist a validated FeedScope and switch the user to the CUSTOM filter.
     * Callers must run the scope through {@link FeedScopeValidator} first.
     */
    public FeedPreference saveCustomScope(UUID userId, FeedScope scope, String description, String sourceText) {
        FeedPreference preference = feedPreferenceRepository.findByUserId(userId)
            .orElseGet(() -> createDefaultPreference(userId));

        if (preference.getUser() == null) {
            preference.setUser(userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId)));
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> json = objectMapper.convertValue(scope, Map.class);

        preference.setActiveFilter(FeedPreference.FeedFilter.CUSTOM);
        preference.setScopeJson(json);
        preference.setScopeDescription(description);
        preference.setScopeSourceText(sourceText);
        // Legacy single-selection columns are irrelevant for CUSTOM; clear so the UI doesn't show stale state.
        preference.setSelectedGroupIds(new ArrayList<>());
        preference.setSelectedOrganizationId(null);
        preference.setUpdatedAt(LocalDateTime.now());

        FeedPreference saved = feedPreferenceRepository.save(preference);
        log.info("✅ Saved CUSTOM feed scope for user {}: {}", userId, description);
        return saved;
    }

    /**
     * Translate a (validated) FeedScope into the ID lists the existing feed query understands.
     *
     * Mapping:
     *  - church/family primaries + member orgs           -> primaryOrgIds   (all visibility)
     *  - non-member orgs (explicit or discovered nearby) -> secondaryOrgIds (PUBLIC only - enforced by the JPQL)
     *  - explicit groups / all my groups                 -> groupIds
     *  - friends (mutual) / following / explicit people  -> followingIds (the query's author filter)
     */
    public FeedParameters resolveCustomScope(UUID userId, FeedScope scope, List<UUID> allPrimaryOrgIds) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        Set<UUID> memberOrgIds = new HashSet<>(allPrimaryOrgIds);
        orgMembershipRepository.findByUserId(userId)
            .forEach(m -> memberOrgIds.add(m.getOrganization().getId()));

        LinkedHashSet<UUID> primaryOrgIds = new LinkedHashSet<>();
        LinkedHashSet<UUID> secondaryOrgIds = new LinkedHashSet<>();
        LinkedHashSet<UUID> groupIds = new LinkedHashSet<>();
        LinkedHashSet<UUID> followingIds = new LinkedHashSet<>();

        if (scope.isIncludeChurchPrimary() && user.getPrimaryOrganization() != null) {
            primaryOrgIds.add(user.getPrimaryOrganization().getId());
        }
        if (scope.isIncludeFamilyPrimary() && user.getFamilyPrimaryOrganization() != null) {
            primaryOrgIds.add(user.getFamilyPrimaryOrganization().getId());
        }

        if (scope.getOrganizationIds() != null) {
            for (UUID orgId : scope.getOrganizationIds()) {
                if (orgId == null) continue;
                if (memberOrgIds.contains(orgId)) {
                    primaryOrgIds.add(orgId);
                } else {
                    secondaryOrgIds.add(orgId);
                }
            }
        }

        if (scope.isIncludeMyGroups()) {
            groupIds.addAll(getUserUnmutedGroupIds(userId));
        }
        if (scope.getGroupIds() != null) {
            scope.getGroupIds().stream().filter(id -> id != null).forEach(groupIds::add);
        }

        if (scope.isIncludeFollowing()) {
            followingIds.addAll(userFollowService.getFollowingIds(userId));
        }
        if (scope.isIncludeFriends()) {
            followingIds.addAll(userFollowService.getMutualFollowIds(userId));
        }
        // Explicit people ("just my mom's posts") ride the same author-filter branch of the
        // JPQL as follows. The validator has already confirmed the viewer may see each person.
        if (scope.getUserIds() != null) {
            scope.getUserIds().stream().filter(id -> id != null).forEach(followingIds::add);
        }

        if (scope.hasNearby()) {
            for (UUID orgId : discoverNearbyOrganizationIds(user, scope.getNearby())) {
                if (memberOrgIds.contains(orgId)) {
                    primaryOrgIds.add(orgId);
                } else {
                    secondaryOrgIds.add(orgId);
                }
            }
        }

        // An org can't be both primary and secondary; primary (full visibility) wins for members.
        secondaryOrgIds.removeAll(primaryOrgIds);

        log.info("🎯 CUSTOM scope for user {} -> primaryOrgs={}, secondaryOrgs={}, groups={}, authors={} (incl. {} explicit people)",
            userId, primaryOrgIds.size(), secondaryOrgIds.size(), groupIds.size(), followingIds.size(),
            scope.getUserIds() == null ? 0 : scope.getUserIds().size());

        return new FeedParameters(
            new ArrayList<>(primaryOrgIds),
            new ArrayList<>(secondaryOrgIds),
            new ArrayList<>(groupIds),
            new ArrayList<>(),          // org-as-groups are not part of CUSTOM (explicit orgIds cover it)
            new ArrayList<>(followingIds)
        );
    }

    /**
     * Runs the nearby discovery query for a NearbyScope using the user's profile coordinates.
     * Returns an empty list when the user has no location - the validator already warned them.
     */
    public List<UUID> discoverNearbyOrganizationIds(User user, FeedScope.NearbyScope nearby) {
        if (user.getLatitude() == null || user.getLongitude() == null) {
            log.info("📍 User {} has no coordinates; nearby scope yields nothing", user.getId());
            return List.of();
        }

        String denomination = nearby.getDenomination();
        if (denomination == null && nearby.isSameDenominationOnly()
                && user.getPrimaryOrganization() != null) {
            denomination = user.getPrimaryOrganization().getDenomination();
        }

        List<String> typeNames = (nearby.getOrgTypes() == null || nearby.getOrgTypes().isEmpty()
                ? List.of(Organization.OrganizationType.CHURCH)
                : nearby.getOrgTypes())
            .stream().map(Enum::name).collect(Collectors.toList());

        int radius = nearby.getRadiusMiles() != null ? nearby.getRadiusMiles() : FeedScope.DEFAULT_RADIUS_MILES;

        List<Organization> found = organizationRepository.findNearby(
            user.getLatitude().doubleValue(),
            user.getLongitude().doubleValue(),
            radius,
            typeNames,
            denomination
        );

        log.info("📍 Nearby discovery for user {}: radius={}mi, types={}, denomination={} -> {} orgs",
            user.getId(), radius, typeNames, denomination, found.size());

        return found.stream().map(Organization::getId).collect(Collectors.toList());
    }

    /**
     * Simple data class to hold feed query parameters
     * Supports dual-primary system (churchPrimary + familyPrimary)
     * Includes organization-as-groups for feed-only view of organizations
     */
    public static class FeedParameters {
        private final List<UUID> primaryOrgIds; // Changed to list to support dual-primary system
        private final List<UUID> secondaryOrgIds;
        private final List<UUID> groupIds;
        private final List<UUID> orgAsGroupIds; // Organizations followed as groups (feed-only)
        // Followed user IDs to include. null = "not part of this scope" (legacy ALL filter
        // still computes its own list in PostService; CUSTOM sets this explicitly).
        private final List<UUID> followingIds;

        public FeedParameters(List<UUID> primaryOrgIds, List<UUID> secondaryOrgIds, List<UUID> groupIds, List<UUID> orgAsGroupIds) {
            this(primaryOrgIds, secondaryOrgIds, groupIds, orgAsGroupIds, null);
        }

        public FeedParameters(List<UUID> primaryOrgIds, List<UUID> secondaryOrgIds, List<UUID> groupIds,
                              List<UUID> orgAsGroupIds, List<UUID> followingIds) {
            this.primaryOrgIds = primaryOrgIds != null ? primaryOrgIds : new ArrayList<>();
            this.secondaryOrgIds = secondaryOrgIds != null ? secondaryOrgIds : new ArrayList<>();
            this.groupIds = groupIds != null ? groupIds : new ArrayList<>();
            this.orgAsGroupIds = orgAsGroupIds != null ? orgAsGroupIds : new ArrayList<>();
            this.followingIds = (followingIds == null || followingIds.isEmpty()) ? null : followingIds;
        }

        /** Nullable: null means "no followed-user posts in this scope". */
        public List<UUID> getFollowingIds() {
            return followingIds;
        }

        public List<UUID> getPrimaryOrgIds() {
            return primaryOrgIds;
        }

        // Backward compatibility - returns first primary org ID (for code that still expects single primary)
        @Deprecated
        public UUID getPrimaryOrgId() {
            return primaryOrgIds.isEmpty() ? null : primaryOrgIds.get(0);
        }

        public List<UUID> getSecondaryOrgIds() {
            return secondaryOrgIds;
        }

        public List<UUID> getGroupIds() {
            return groupIds;
        }

        public List<UUID> getOrgAsGroupIds() {
            return orgAsGroupIds;
        }

        public boolean hasPrimaryOrg() {
            return !primaryOrgIds.isEmpty();
        }
    }
}
