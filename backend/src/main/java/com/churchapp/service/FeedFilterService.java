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

    private static final UUID GLOBAL_ORG_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    // ========================================================================
    // FEED PREFERENCE MANAGEMENT
    // ========================================================================

    public FeedPreference getFeedPreference(UUID userId) {
        return feedPreferenceRepository.findByUserId(userId)
            .orElseGet(() -> createDefaultPreference(userId));
    }

    public FeedPreference updateFeedPreference(UUID userId, FeedPreference.FeedFilter filter, List<UUID> selectedGroupIds) {
        try {
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

            // Always update selectedGroupIds - if null, set to empty list; if provided, use it
            if (selectedGroupIds != null) {
                preference.setSelectedGroupIds(selectedGroupIds);
            } else {
                // If null and filter is not SELECTED_GROUPS, clear the selection
                if (filter != FeedPreference.FeedFilter.SELECTED_GROUPS) {
                    preference.setSelectedGroupIds(new ArrayList<>());
                }
                // If null and filter is SELECTED_GROUPS, keep existing selection
            }

            preference.setUpdatedAt(LocalDateTime.now());

            FeedPreference saved = feedPreferenceRepository.save(preference);
            
            log.info("Updated feed preference for user {} to filter: {}", userId, filter);

            return saved;
        } catch (Exception e) {
            log.error("Error updating feed preference for user {}", userId, e);
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
     */
    public UUID getUserPrimaryOrgId(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        return user.getPrimaryOrganization() != null
            ? user.getPrimaryOrganization().getId()
            : null;
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
     */
    public List<UUID> getVisibleOrgIds(UUID userId) {
        FeedPreference preference = getFeedPreference(userId);
        UUID primaryOrgId = getUserPrimaryOrgId(userId);

        List<UUID> visibleOrgs = new ArrayList<>();

        // Always include primary org if user has one
        if (primaryOrgId != null) {
            visibleOrgs.add(primaryOrgId);
        }

        // Add secondary orgs unless filter is PRIMARY_ONLY
        if (preference.getActiveFilter() != FeedPreference.FeedFilter.PRIMARY_ONLY) {
            visibleOrgs.addAll(getUserSecondaryOrgIds(userId));
            
            // When filter is EVERYTHING, include Global org so users can see posts from social-only users
            if (preference.getActiveFilter() == FeedPreference.FeedFilter.EVERYTHING) {
                visibleOrgs.add(GLOBAL_ORG_ID);
            }
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
     */
    public FeedParameters getFeedParameters(UUID userId) {
        // Use getVisibleOrgIds to respect filter preferences
        List<UUID> visibleOrgIds = getVisibleOrgIds(userId);
        UUID primaryOrgId = getUserPrimaryOrgId(userId);
        
        // Extract secondary orgs (exclude primary org, but include Global org if it's in visibleOrgs)
        // Global org should be included in secondaryOrgIds when filter is ALL so posts from social-only users are visible
        List<UUID> secondaryOrgIds = visibleOrgIds.stream()
            .filter(orgId -> !orgId.equals(primaryOrgId))
            .collect(Collectors.toList());
        
        List<UUID> groupIds = getVisibleGroupIds(userId);

        return new FeedParameters(primaryOrgId, secondaryOrgIds, groupIds);
    }

    /**
     * Simple data class to hold feed query parameters
     */
    public static class FeedParameters {
        private final UUID primaryOrgId;
        private final List<UUID> secondaryOrgIds;
        private final List<UUID> groupIds;

        public FeedParameters(UUID primaryOrgId, List<UUID> secondaryOrgIds, List<UUID> groupIds) {
            this.primaryOrgId = primaryOrgId;
            this.secondaryOrgIds = secondaryOrgIds != null ? secondaryOrgIds : new ArrayList<>();
            this.groupIds = groupIds != null ? groupIds : new ArrayList<>();
        }

        public UUID getPrimaryOrgId() {
            return primaryOrgId;
        }

        public List<UUID> getSecondaryOrgIds() {
            return secondaryOrgIds;
        }

        public List<UUID> getGroupIds() {
            return groupIds;
        }

        public boolean hasPrimaryOrg() {
            return primaryOrgId != null;
        }
    }
}
