package com.churchapp;

import com.churchapp.dto.FeedScope;
import com.churchapp.entity.FeedPreference;
import com.churchapp.entity.Organization;
import com.churchapp.entity.User;
import com.churchapp.entity.UserOrganizationMembership;
import com.churchapp.repository.FeedPreferenceRepository;
import com.churchapp.repository.OrganizationRepository;
import com.churchapp.repository.UserGroupMembershipRepository;
import com.churchapp.repository.UserOrganizationMembershipRepository;
import com.churchapp.repository.UserRepository;
import com.churchapp.service.FeedFilterService;
import com.churchapp.service.OrganizationGroupService;
import com.churchapp.service.UserFollowService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * The CUSTOM branch translates a FeedScope into the same FeedParameters shape the
 * legacy filters use, so PostRepository.findMultiTenantFeed stays untouched.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class FeedFilterServiceCustomScopeTest {

    @Mock private FeedPreferenceRepository feedPreferenceRepository;
    @Mock private UserOrganizationMembershipRepository orgMembershipRepository;
    @Mock private UserGroupMembershipRepository groupMembershipRepository;
    @Mock private UserRepository userRepository;
    @Mock private OrganizationGroupService organizationGroupService;
    @Mock private OrganizationRepository organizationRepository;
    @Mock private UserFollowService userFollowService;
    @Spy private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks private FeedFilterService feedFilterService;

    private final UUID userId = UUID.randomUUID();
    private User user;
    private Organization church;
    private Organization family;
    private Organization secondaryChurch;
    private Organization strangerChurch;

    @BeforeEach
    void setUp() {
        church = org("First Baptist", Organization.OrganizationType.CHURCH);
        church.setDenomination("Baptist");
        family = org("Smith Family", Organization.OrganizationType.FAMILY);
        secondaryChurch = org("Second Church", Organization.OrganizationType.CHURCH);
        strangerChurch = org("Far Away Chapel", Organization.OrganizationType.CHURCH);

        user = new User();
        user.setId(userId);
        user.setChurchPrimaryOrganization(church);
        user.setFamilyPrimaryOrganization(family);
        user.setLatitude(new BigDecimal("38.440000"));
        user.setLongitude(new BigDecimal("-122.714000"));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        UserOrganizationMembership m1 = membership(church);
        UserOrganizationMembership m2 = membership(family);
        UserOrganizationMembership m3 = membership(secondaryChurch);
        when(orgMembershipRepository.findByUserId(userId)).thenReturn(List.of(m1, m2, m3));
        when(groupMembershipRepository.findUnmutedGroupIdsByUserId(userId)).thenReturn(List.of());
    }

    @Test
    void churchAndFamilyPrimariesBecomePrimaryOrgIds() {
        FeedScope scope = FeedScope.builder().includeChurchPrimary(true).includeFamilyPrimary(true).build();

        FeedFilterService.FeedParameters params =
            feedFilterService.resolveCustomScope(userId, scope, List.of(church.getId(), family.getId()));

        assertEquals(List.of(church.getId(), family.getId()), params.getPrimaryOrgIds());
        assertTrue(params.getSecondaryOrgIds().isEmpty());
        assertTrue(params.getGroupIds().isEmpty());
        assertNull(params.getFollowingIds());
    }

    @Test
    void memberOrgsGoPrimaryAndNonMemberOrgsGoSecondary() {
        // Non-member orgs land in secondaryOrgIds so the existing JPQL enforces PUBLIC-only for them.
        FeedScope scope = FeedScope.builder()
            .organizationIds(new ArrayList<>(List.of(secondaryChurch.getId(), strangerChurch.getId())))
            .build();

        FeedFilterService.FeedParameters params =
            feedFilterService.resolveCustomScope(userId, scope, List.of(church.getId(), family.getId()));

        assertEquals(List.of(secondaryChurch.getId()), params.getPrimaryOrgIds());
        assertEquals(List.of(strangerChurch.getId()), params.getSecondaryOrgIds());
    }

    @Test
    void friendsAndFollowingPopulateFollowingIds() {
        UUID friend = UUID.randomUUID();
        UUID followed = UUID.randomUUID();
        when(userFollowService.getMutualFollowIds(userId)).thenReturn(List.of(friend));
        when(userFollowService.getFollowingIds(userId)).thenReturn(List.of(followed, friend));

        FeedFilterService.FeedParameters friendsOnly = feedFilterService.resolveCustomScope(
            userId, FeedScope.builder().includeFriends(true).build(), List.of());
        assertEquals(List.of(friend), friendsOnly.getFollowingIds());

        FeedFilterService.FeedParameters both = feedFilterService.resolveCustomScope(
            userId, FeedScope.builder().includeFriends(true).includeFollowing(true).build(), List.of());
        assertEquals(2, both.getFollowingIds().size(), "friend + followed, de-duplicated");
    }

    @Test
    void explicitPeopleBecomeAuthorFilterAlongsideFriends() {
        UUID mom = UUID.randomUUID();
        UUID friend = UUID.randomUUID();
        when(userFollowService.getMutualFollowIds(userId)).thenReturn(List.of(friend));

        FeedFilterService.FeedParameters momOnly = feedFilterService.resolveCustomScope(
            userId, FeedScope.builder().userIds(new ArrayList<>(List.of(mom))).build(), List.of());
        assertEquals(List.of(mom), momOnly.getFollowingIds());
        assertTrue(momOnly.getPrimaryOrgIds().isEmpty(), "a person-only scope must not widen to any organization");

        FeedFilterService.FeedParameters momAndFriends = feedFilterService.resolveCustomScope(
            userId, FeedScope.builder().includeFriends(true).userIds(new ArrayList<>(List.of(mom, friend))).build(), List.of());
        assertEquals(2, momAndFriends.getFollowingIds().size(), "de-duplicated: friend listed once");
        assertTrue(momAndFriends.getFollowingIds().containsAll(List.of(mom, friend)));
    }

    @Test
    void myGroupsAndExplicitGroupsMerge() {
        UUID g1 = UUID.randomUUID();
        UUID g2 = UUID.randomUUID();
        when(groupMembershipRepository.findUnmutedGroupIdsByUserId(userId)).thenReturn(List.of(g1));

        FeedScope scope = FeedScope.builder()
            .includeMyGroups(true)
            .groupIds(new ArrayList<>(List.of(g2, g1)))
            .build();

        FeedFilterService.FeedParameters params = feedFilterService.resolveCustomScope(userId, scope, List.of());

        assertEquals(2, params.getGroupIds().size());
        assertTrue(params.getGroupIds().containsAll(List.of(g1, g2)));
    }

    @Test
    void nearbyDiscoveryUsesUserCoordinatesAndDenominationFromPrimaryChurch() {
        when(organizationRepository.findNearby(anyDouble(), anyDouble(), anyDouble(), anyList(), eq("Baptist")))
            .thenReturn(List.of(strangerChurch, secondaryChurch));

        FeedScope.NearbyScope nearby = FeedScope.NearbyScope.builder()
            .radiusMiles(50)
            .sameDenominationOnly(true)
            .build();
        FeedScope scope = FeedScope.builder().includeChurchPrimary(true).nearby(nearby).build();

        FeedFilterService.FeedParameters params =
            feedFilterService.resolveCustomScope(userId, scope, List.of(church.getId(), family.getId()));

        verify(organizationRepository).findNearby(
            eq(38.44), eq(-122.714), eq(50.0), eq(List.of("CHURCH")), eq("Baptist"));
        // Discovered org that the user is already a member of gets full visibility; stranger stays PUBLIC-only.
        assertTrue(params.getPrimaryOrgIds().containsAll(List.of(church.getId(), secondaryChurch.getId())));
        assertEquals(List.of(strangerChurch.getId()), params.getSecondaryOrgIds());
    }

    @Test
    void explicitDenominationOverridesSameDenominationFlag() {
        when(organizationRepository.findNearby(anyDouble(), anyDouble(), anyDouble(), anyList(), eq("Methodist")))
            .thenReturn(List.of());

        FeedScope.NearbyScope nearby = FeedScope.NearbyScope.builder()
            .radiusMiles(20)
            .sameDenominationOnly(true)
            .denomination("Methodist")
            .build();

        feedFilterService.resolveCustomScope(userId, FeedScope.builder().nearby(nearby).build(), List.of());

        verify(organizationRepository).findNearby(anyDouble(), anyDouble(), eq(20.0), anyList(), eq("Methodist"));
    }

    @Test
    void nearbyWithoutUserLocationSkipsDiscovery() {
        user.setLatitude(null);
        user.setLongitude(null);

        FeedScope scope = FeedScope.builder().nearby(new FeedScope.NearbyScope()).build();
        FeedFilterService.FeedParameters params = feedFilterService.resolveCustomScope(userId, scope, List.of());

        verify(organizationRepository, never()).findNearby(anyDouble(), anyDouble(), anyDouble(), anyList(), any());
        assertTrue(params.getPrimaryOrgIds().isEmpty());
        assertTrue(params.getSecondaryOrgIds().isEmpty());
    }

    @Test
    void nearbyWithNoDenominationPassesNull() {
        when(organizationRepository.findNearby(anyDouble(), anyDouble(), anyDouble(), anyList(), isNull()))
            .thenReturn(List.of());

        feedFilterService.resolveCustomScope(userId,
            FeedScope.builder().nearby(FeedScope.NearbyScope.builder().radiusMiles(10).build()).build(), List.of());

        verify(organizationRepository).findNearby(anyDouble(), anyDouble(), eq(10.0), eq(List.of("CHURCH")), isNull());
    }

    @Test
    void readScopeRoundTripsThroughJson() {
        FeedScope original = FeedScope.builder()
            .includeChurchPrimary(true)
            .includeFriends(true)
            .organizationIds(new ArrayList<>(List.of(strangerChurch.getId())))
            .nearby(FeedScope.NearbyScope.builder().radiusMiles(75).denomination("Baptist").build())
            .build();

        @SuppressWarnings("unchecked")
        Map<String, Object> json = objectMapper.convertValue(original, Map.class);
        FeedPreference pref = new FeedPreference();
        pref.setScopeJson(json);

        FeedScope restored = feedFilterService.readScope(pref);

        assertTrue(restored.isIncludeChurchPrimary());
        assertTrue(restored.isIncludeFriends());
        assertFalse(restored.isIncludeFamilyPrimary());
        assertEquals(List.of(strangerChurch.getId()), restored.getOrganizationIds());
        assertEquals(75, restored.getNearby().getRadiusMiles());
        assertEquals("Baptist", restored.getNearby().getDenomination());
    }

    @Test
    void readScopeReturnsEmptyScopeWhenNothingStored() {
        FeedPreference pref = new FeedPreference();
        assertTrue(feedFilterService.readScope(pref).isEmpty());
        assertTrue(feedFilterService.readScope(null).isEmpty());
    }

    @Test
    void getFeedParametersRoutesCustomFilterThroughScope() {
        FeedPreference pref = new FeedPreference();
        pref.setUser(user);
        pref.setActiveFilter(FeedPreference.FeedFilter.CUSTOM);
        @SuppressWarnings("unchecked")
        Map<String, Object> json = objectMapper.convertValue(
            FeedScope.builder().includeFamilyPrimary(true).build(), Map.class);
        pref.setScopeJson(json);
        when(feedPreferenceRepository.findByUserId(userId)).thenReturn(Optional.of(pref));

        FeedFilterService.FeedParameters params = feedFilterService.getFeedParameters(userId);

        assertEquals(List.of(family.getId()), params.getPrimaryOrgIds());
        assertTrue(params.getSecondaryOrgIds().isEmpty());
        assertTrue(params.getOrgAsGroupIds().isEmpty());
    }

    private UserOrganizationMembership membership(Organization org) {
        UserOrganizationMembership m = new UserOrganizationMembership();
        m.setUser(user);
        m.setOrganization(org);
        return m;
    }

    private static Organization org(String name, Organization.OrganizationType type) {
        Organization o = new Organization();
        o.setId(UUID.randomUUID());
        o.setName(name);
        o.setType(type);
        o.setDiscoverable(true);
        return o;
    }
}
