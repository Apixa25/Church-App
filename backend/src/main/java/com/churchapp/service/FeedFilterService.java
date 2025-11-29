package com.churchapp.service;

import com.churchapp.entity.FeedPreference;
import com.churchapp.entity.User;
import com.churchapp.repository.FeedPreferenceRepository;
import com.churchapp.repository.UserGroupMembershipRepository;
import com.churchapp.repository.UserOrganizationMembershipRepository;
import com.churchapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
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
     * - EVERYTHING: Church + Family + Groups + Global Feed + Followed Users + Org-as-Groups
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

        public FeedParameters(List<UUID> primaryOrgIds, List<UUID> secondaryOrgIds, List<UUID> groupIds, List<UUID> orgAsGroupIds) {
            this.primaryOrgIds = primaryOrgIds != null ? primaryOrgIds : new ArrayList<>();
            this.secondaryOrgIds = secondaryOrgIds != null ? secondaryOrgIds : new ArrayList<>();
            this.groupIds = groupIds != null ? groupIds : new ArrayList<>();
            this.orgAsGroupIds = orgAsGroupIds != null ? orgAsGroupIds : new ArrayList<>();
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
