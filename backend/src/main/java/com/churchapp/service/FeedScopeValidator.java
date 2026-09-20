package com.churchapp.service;

import com.churchapp.dto.FeedScope;
import com.churchapp.entity.Organization;
import com.churchapp.entity.User;
import com.churchapp.repository.OrganizationRepository;
import com.churchapp.repository.UserGroupMembershipRepository;
import com.churchapp.repository.UserOrganizationMembershipRepository;
import com.churchapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Sanitizes a {@link FeedScope} against what the user is actually allowed to see.
 *
 * Every scope - whether it came from a quick chip, the natural-language parser,
 * or a raw API call - passes through here before it is saved or resolved. This
 * is the security boundary: the LLM can suggest anything, but only IDs that
 * survive validation ever reach the feed query.
 *
 * Rules:
 *  - Group IDs must be groups the user belongs to.
 *  - FAMILY organizations are only allowed when the user is a member. Families
 *    are never discoverable.
 *  - Non-member organizations must be non-deleted and discoverable.
 *  - The GLOBAL organization cannot be added explicitly (use the EVERYTHING filter).
 *  - Radius is clamped to [1, 250] miles; FAMILY/GLOBAL are removed from nearby orgTypes.
 *  - Explicit people must share an organization with the user or be someone the user
 *    follows - i.e. people whose posts the user could already see in a normal feed.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class FeedScopeValidator {

    private static final UUID GLOBAL_ORG_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    private final UserRepository userRepository;
    private final UserOrganizationMembershipRepository orgMembershipRepository;
    private final UserGroupMembershipRepository groupMembershipRepository;
    private final OrganizationRepository organizationRepository;
    private final UserFollowService userFollowService;

    /**
     * Result of validation: the sanitized scope plus human-readable notes about
     * anything that was removed (surfaced to the user in the preview card).
     */
    public record ValidationResult(FeedScope scope, List<String> warnings) {
        public boolean hasWarnings() {
            return warnings != null && !warnings.isEmpty();
        }
    }

    public ValidationResult validate(UUID userId, FeedScope input) {
        FeedScope scope = input != null ? input : new FeedScope();
        List<String> warnings = new ArrayList<>();

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        Set<UUID> memberOrgIds = memberOrganizationIds(user);
        Set<UUID> memberGroupIds = new HashSet<>(memberGroupIds(userId));

        // ---- Primary flags: only meaningful if the user actually has that primary ----
        if (scope.isIncludeChurchPrimary() && user.getPrimaryOrganization() == null) {
            scope.setIncludeChurchPrimary(false);
            warnings.add("You don't have a church set as your primary organization yet.");
        }
        if (scope.isIncludeFamilyPrimary() && user.getFamilyPrimaryOrganization() == null) {
            scope.setIncludeFamilyPrimary(false);
            warnings.add("You don't have a family group set up yet.");
        }

        // ---- Explicit organizations ----
        scope.setOrganizationIds(sanitizeOrganizationIds(scope.getOrganizationIds(), memberOrgIds, warnings));

        // ---- Explicit groups ----
        scope.setGroupIds(sanitizeGroupIds(scope.getGroupIds(), memberGroupIds, warnings));

        // ---- Explicit people ----
        scope.setUserIds(sanitizeUserIds(userId, scope.getUserIds(), memberOrgIds, warnings));

        // ---- Nearby ----
        if (scope.getNearby() != null) {
            sanitizeNearby(scope.getNearby(), user, warnings);
        }

        if (scope.isEmpty()) {
            warnings.add("Nothing selected - your feed would be empty.");
        }

        return new ValidationResult(scope, warnings);
    }

    // ------------------------------------------------------------------------

    private List<UUID> sanitizeOrganizationIds(List<UUID> requested, Set<UUID> memberOrgIds, List<String> warnings) {
        if (requested == null || requested.isEmpty()) {
            return new ArrayList<>();
        }
        LinkedHashSet<UUID> kept = new LinkedHashSet<>();
        for (UUID orgId : requested) {
            if (orgId == null) continue;
            if (GLOBAL_ORG_ID.equals(orgId)) {
                warnings.add("The Gathering global feed can't be added here - use the Everything filter instead.");
                continue;
            }
            if (memberOrgIds.contains(orgId)) {
                kept.add(orgId); // members can always see their own orgs
                continue;
            }
            Organization org = organizationRepository.findActiveById(orgId).orElse(null);
            if (org == null) {
                warnings.add("One of the organizations you asked for no longer exists.");
                continue;
            }
            if (org.getType() == Organization.OrganizationType.FAMILY) {
                warnings.add("Family groups are private - only members can see " + org.getName() + ".");
                continue;
            }
            if (org.getType() == Organization.OrganizationType.GLOBAL) {
                continue;
            }
            if (Boolean.FALSE.equals(org.getDiscoverable())) {
                warnings.add(org.getName() + " has chosen not to be discoverable.");
                continue;
            }
            kept.add(orgId);
        }
        return new ArrayList<>(kept);
    }

    private List<UUID> sanitizeGroupIds(List<UUID> requested, Set<UUID> memberGroupIds, List<String> warnings) {
        if (requested == null || requested.isEmpty()) {
            return new ArrayList<>();
        }
        List<UUID> kept = requested.stream()
            .filter(id -> id != null && memberGroupIds.contains(id))
            .distinct()
            .collect(Collectors.toList());
        if (kept.size() < requested.stream().filter(id -> id != null).distinct().count()) {
            warnings.add("Some groups were skipped because you're not a member of them.");
        }
        return kept;
    }

    /**
     * A person can be named only if the viewer already has a relationship that makes their
     * posts visible: a shared organization (church, family, ministry...) or a follow.
     * Anyone else is silently dropped with a warning - this is what stops "show me posts by
     * <stranger at another church>" from ever reaching the feed query.
     */
    private List<UUID> sanitizeUserIds(UUID viewerId, List<UUID> requested, Set<UUID> viewerOrgIds, List<String> warnings) {
        if (requested == null || requested.isEmpty()) {
            return new ArrayList<>();
        }
        Set<UUID> following = new HashSet<>(userFollowService.getFollowingIds(viewerId));
        LinkedHashSet<UUID> kept = new LinkedHashSet<>();
        boolean droppedSomeone = false;

        for (UUID targetId : requested) {
            if (targetId == null) continue;
            User target = userRepository.findById(targetId).orElse(null);
            if (target == null || target.getDeletedAt() != null || Boolean.FALSE.equals(target.getIsActive())) {
                droppedSomeone = true;
                continue;
            }
            if (targetId.equals(viewerId) || following.contains(targetId)
                    || sharesOrganization(target, viewerOrgIds)) {
                kept.add(targetId);
            } else {
                droppedSomeone = true;
            }
        }
        if (droppedSomeone) {
            warnings.add("Some people were skipped - you can only pick members of your organizations or people you follow.");
        }
        return new ArrayList<>(kept);
    }

    private boolean sharesOrganization(User target, Set<UUID> viewerOrgIds) {
        if (viewerOrgIds.isEmpty()) return false;
        Set<UUID> targetOrgIds = memberOrganizationIds(target);
        for (UUID id : targetOrgIds) {
            if (viewerOrgIds.contains(id)) return true;
        }
        return false;
    }

    private void sanitizeNearby(FeedScope.NearbyScope nearby, User user, List<String> warnings) {
        Integer radius = nearby.getRadiusMiles();
        if (radius == null) {
            radius = FeedScope.DEFAULT_RADIUS_MILES;
        }
        if (radius < FeedScope.MIN_RADIUS_MILES) {
            radius = FeedScope.MIN_RADIUS_MILES;
        }
        if (radius > FeedScope.MAX_RADIUS_MILES) {
            warnings.add("Radius capped at " + FeedScope.MAX_RADIUS_MILES + " miles.");
            radius = FeedScope.MAX_RADIUS_MILES;
        }
        nearby.setRadiusMiles(radius);

        List<Organization.OrganizationType> types = nearby.getOrgTypes() == null
            ? new ArrayList<>()
            : nearby.getOrgTypes().stream()
                .filter(t -> t != null
                    && t != Organization.OrganizationType.FAMILY
                    && t != Organization.OrganizationType.GLOBAL)
                .distinct()
                .collect(Collectors.toList());
        if (types.isEmpty()) {
            types.add(Organization.OrganizationType.CHURCH);
        }
        nearby.setOrgTypes(types);

        if (nearby.getDenomination() != null) {
            String trimmed = nearby.getDenomination().trim();
            nearby.setDenomination(trimmed.isEmpty() ? null : trimmed);
        }

        if (nearby.isSameDenominationOnly() && nearby.getDenomination() == null) {
            Organization church = user.getPrimaryOrganization();
            if (church == null || church.getDenomination() == null || church.getDenomination().isBlank()) {
                nearby.setSameDenominationOnly(false);
                warnings.add("Your church hasn't set a denomination yet, so showing all nearby churches instead.");
            }
        }

        if (user.getLatitude() == null || user.getLongitude() == null) {
            warnings.add("Add your location in your profile so we can find churches near you.");
        }
    }

    private Set<UUID> memberOrganizationIds(User user) {
        Set<UUID> ids = orgMembershipRepository.findByUserId(user.getId()).stream()
            .map(m -> m.getOrganization().getId())
            .collect(Collectors.toCollection(HashSet::new));
        if (user.getPrimaryOrganization() != null) {
            ids.add(user.getPrimaryOrganization().getId());
        }
        if (user.getFamilyPrimaryOrganization() != null) {
            ids.add(user.getFamilyPrimaryOrganization().getId());
        }
        return ids;
    }

    private List<UUID> memberGroupIds(UUID userId) {
        return groupMembershipRepository.findByUserId(userId).stream()
            .map(m -> m.getGroup().getId())
            .collect(Collectors.toList());
    }
}
