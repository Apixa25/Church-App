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
        FeedPreference preference = feedPreferenceRepository.findByUserId(userId)
            .orElseGet(() -> createDefaultPreference(userId));

        preference.setActiveFilter(filter);

        if (selectedGroupIds != null) {
            preference.setSelectedGroupIds(selectedGroupIds);
        }

        preference.setUpdatedAt(LocalDateTime.now());

        FeedPreference saved = feedPreferenceRepository.save(preference);
        log.info("Updated feed preference for user {} to filter: {}", userId, filter);

        return saved;
    }

    private FeedPreference createDefaultPreference(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        FeedPreference preference = new FeedPreference();
        preference.setUser(user);
        preference.setActiveFilter(FeedPreference.FeedFilter.ALL);
        preference.setSelectedGroupIds(new ArrayList<>());
        preference.setUpdatedAt(LocalDateTime.now());

        return feedPreferenceRepository.save(preference);
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
        UUID primaryOrgId = getUserPrimaryOrgId(userId);
        List<UUID> secondaryOrgIds = getUserSecondaryOrgIds(userId);
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
