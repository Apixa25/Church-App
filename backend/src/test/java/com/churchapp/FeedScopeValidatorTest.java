package com.churchapp;

import com.churchapp.dto.FeedScope;
import com.churchapp.entity.Group;
import com.churchapp.entity.Organization;
import com.churchapp.entity.User;
import com.churchapp.entity.UserGroupMembership;
import com.churchapp.entity.UserOrganizationMembership;
import com.churchapp.repository.OrganizationRepository;
import com.churchapp.repository.UserGroupMembershipRepository;
import com.churchapp.repository.UserOrganizationMembershipRepository;
import com.churchapp.repository.UserRepository;
import com.churchapp.service.FeedScopeValidator;
import com.churchapp.service.UserFollowService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

/**
 * FeedScopeValidator is the tenant-safety boundary for every scope, whether it
 * came from a chip, the rule parser, the LLM, or a raw API call.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class FeedScopeValidatorTest {

    private static final UUID GLOBAL_ORG_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    @Mock private UserRepository userRepository;
    @Mock private UserOrganizationMembershipRepository orgMembershipRepository;
    @Mock private UserGroupMembershipRepository groupMembershipRepository;
    @Mock private OrganizationRepository organizationRepository;
    @Mock private UserFollowService userFollowService;

    @InjectMocks private FeedScopeValidator validator;

    private final UUID userId = UUID.randomUUID();
    private User user;
    private Organization church;
    private Organization family;
    private Organization otherChurch;
    private Organization otherFamily;
    private Organization hiddenChurch;
    private Group myGroup;

    @BeforeEach
    void setUp() {
        church = org("First Baptist", Organization.OrganizationType.CHURCH, true);
        church.setDenomination("Baptist");
        family = org("Smith Family", Organization.OrganizationType.FAMILY, true);
        otherChurch = org("Grace Methodist", Organization.OrganizationType.CHURCH, true);
        otherFamily = org("Jones Family", Organization.OrganizationType.FAMILY, true);
        hiddenChurch = org("Quiet Chapel", Organization.OrganizationType.CHURCH, false);

        myGroup = new Group();
        myGroup.setId(UUID.randomUUID());
        myGroup.setName("Youth Group");

        user = new User();
        user.setId(userId);
        user.setChurchPrimaryOrganization(church);
        user.setFamilyPrimaryOrganization(family);
        user.setLatitude(new BigDecimal("38.5"));
        user.setLongitude(new BigDecimal("-122.5"));

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        UserOrganizationMembership churchMembership = new UserOrganizationMembership();
        churchMembership.setUser(user);
        churchMembership.setOrganization(church);
        UserOrganizationMembership familyMembership = new UserOrganizationMembership();
        familyMembership.setUser(user);
        familyMembership.setOrganization(family);
        when(orgMembershipRepository.findByUserId(userId)).thenReturn(List.of(churchMembership, familyMembership));

        UserGroupMembership groupMembership = new UserGroupMembership();
        groupMembership.setUser(user);
        groupMembership.setGroup(myGroup);
        when(groupMembershipRepository.findByUserId(userId)).thenReturn(List.of(groupMembership));

        for (Organization o : List.of(church, family, otherChurch, otherFamily, hiddenChurch)) {
            when(organizationRepository.findActiveById(o.getId())).thenReturn(Optional.of(o));
        }

        when(userFollowService.getFollowingIds(userId)).thenReturn(List.of());
    }

    @Test
    void keepsPeopleWhoShareAnOrganizationOrAreFollowed() {
        User mom = member("Terry Sills", family);
        User followed = member("Pat Follower", otherChurch);
        when(userFollowService.getFollowingIds(userId)).thenReturn(List.of(followed.getId()));

        FeedScope scope = FeedScope.builder()
            .userIds(new ArrayList<>(List.of(mom.getId(), followed.getId())))
            .build();

        FeedScopeValidator.ValidationResult result = validator.validate(userId, scope);

        assertEquals(List.of(mom.getId(), followed.getId()), result.scope().getUserIds());
        assertFalse(result.hasWarnings());
    }

    @Test
    void stripsStrangersDeletedAndUnknownPeople() {
        User stranger = member("Some Stranger", otherChurch);   // no shared org, not followed
        User deleted = member("Gone Person", church);
        deleted.setDeletedAt(java.time.LocalDateTime.now());
        UUID unknown = UUID.randomUUID();
        when(userRepository.findById(unknown)).thenReturn(Optional.empty());

        FeedScope scope = FeedScope.builder()
            .userIds(new ArrayList<>(List.of(stranger.getId(), deleted.getId(), unknown)))
            .build();

        FeedScopeValidator.ValidationResult result = validator.validate(userId, scope);

        assertTrue(result.scope().getUserIds().isEmpty());
        assertTrue(result.warnings().stream().anyMatch(w -> w.contains("Some people were skipped")));
    }

    @Test
    void personOnlyScopeIsNotConsideredEmpty() {
        User mom = member("Terry Sills", family);

        FeedScopeValidator.ValidationResult result = validator.validate(
            userId, FeedScope.builder().userIds(new ArrayList<>(List.of(mom.getId()))).build());

        assertFalse(result.scope().isEmpty());
        assertFalse(result.warnings().stream().anyMatch(w -> w.contains("empty")));
    }

    /** Creates an active user who is a member of {@code org} and wires the repository mocks. */
    private User member(String name, Organization org) {
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setName(name);
        u.setIsActive(true);
        when(userRepository.findById(u.getId())).thenReturn(Optional.of(u));
        UserOrganizationMembership m = new UserOrganizationMembership();
        m.setUser(u);
        m.setOrganization(org);
        when(orgMembershipRepository.findByUserId(u.getId())).thenReturn(List.of(m));
        return u;
    }

    @Test
    void keepsMemberOrgsAndDiscoverableNonMemberChurches() {
        FeedScope scope = FeedScope.builder()
            .organizationIds(new ArrayList<>(List.of(church.getId(), otherChurch.getId())))
            .build();

        FeedScopeValidator.ValidationResult result = validator.validate(userId, scope);

        assertEquals(List.of(church.getId(), otherChurch.getId()), result.scope().getOrganizationIds());
        assertFalse(result.hasWarnings());
    }

    @Test
    void stripsFamilyOrgsTheUserDoesNotBelongTo() {
        FeedScope scope = FeedScope.builder()
            .organizationIds(new ArrayList<>(List.of(family.getId(), otherFamily.getId())))
            .build();

        FeedScopeValidator.ValidationResult result = validator.validate(userId, scope);

        assertEquals(List.of(family.getId()), result.scope().getOrganizationIds(), "own family kept, other family removed");
        assertTrue(result.warnings().stream().anyMatch(w -> w.contains("Jones Family")));
    }

    @Test
    void stripsNonDiscoverableOrgsAndGlobalOrg() {
        FeedScope scope = FeedScope.builder()
            .organizationIds(new ArrayList<>(List.of(hiddenChurch.getId(), GLOBAL_ORG_ID)))
            .build();

        FeedScopeValidator.ValidationResult result = validator.validate(userId, scope);

        assertTrue(result.scope().getOrganizationIds().isEmpty());
        assertTrue(result.warnings().stream().anyMatch(w -> w.contains("Quiet Chapel")));
        assertTrue(result.warnings().stream().anyMatch(w -> w.contains("Everything filter")));
    }

    @Test
    void stripsGroupsTheUserIsNotAMemberOf() {
        UUID strangerGroup = UUID.randomUUID();
        FeedScope scope = FeedScope.builder()
            .groupIds(new ArrayList<>(List.of(myGroup.getId(), strangerGroup)))
            .build();

        FeedScopeValidator.ValidationResult result = validator.validate(userId, scope);

        assertEquals(List.of(myGroup.getId()), result.scope().getGroupIds());
        assertTrue(result.warnings().stream().anyMatch(w -> w.contains("not a member")));
    }

    @Test
    void clampsRadiusAndRemovesFamilyAndGlobalFromNearbyTypes() {
        FeedScope.NearbyScope nearby = FeedScope.NearbyScope.builder()
            .radiusMiles(5000)
            .orgTypes(new ArrayList<>(List.of(
                Organization.OrganizationType.FAMILY,
                Organization.OrganizationType.GLOBAL,
                Organization.OrganizationType.MINISTRY)))
            .build();
        FeedScope scope = FeedScope.builder().nearby(nearby).build();

        FeedScopeValidator.ValidationResult result = validator.validate(userId, scope);

        assertEquals(FeedScope.MAX_RADIUS_MILES, result.scope().getNearby().getRadiusMiles());
        assertEquals(List.of(Organization.OrganizationType.MINISTRY), result.scope().getNearby().getOrgTypes());
        assertTrue(result.warnings().stream().anyMatch(w -> w.contains("capped")));
    }

    @Test
    void nearbyDefaultsToChurchWhenAllTypesWereIllegal() {
        FeedScope.NearbyScope nearby = FeedScope.NearbyScope.builder()
            .radiusMiles(0)
            .orgTypes(new ArrayList<>(List.of(Organization.OrganizationType.FAMILY)))
            .build();

        FeedScopeValidator.ValidationResult result = validator.validate(userId, FeedScope.builder().nearby(nearby).build());

        assertEquals(FeedScope.MIN_RADIUS_MILES, result.scope().getNearby().getRadiusMiles());
        assertEquals(List.of(Organization.OrganizationType.CHURCH), result.scope().getNearby().getOrgTypes());
    }

    @Test
    void sameDenominationFallsBackWhenChurchHasNoDenomination() {
        church.setDenomination(null);
        FeedScope.NearbyScope nearby = FeedScope.NearbyScope.builder().sameDenominationOnly(true).build();

        FeedScopeValidator.ValidationResult result = validator.validate(userId, FeedScope.builder().nearby(nearby).build());

        assertFalse(result.scope().getNearby().isSameDenominationOnly());
        assertTrue(result.warnings().stream().anyMatch(w -> w.contains("denomination")));
    }

    @Test
    void warnsWhenUserHasNoLocationForNearby() {
        user.setLatitude(null);
        user.setLongitude(null);

        FeedScopeValidator.ValidationResult result = validator.validate(
            userId, FeedScope.builder().nearby(new FeedScope.NearbyScope()).build());

        assertTrue(result.warnings().stream().anyMatch(w -> w.toLowerCase().contains("location")));
    }

    @Test
    void turnsOffPrimaryFlagsTheUserCannotUse() {
        user.setFamilyPrimaryOrganization(null);
        FeedScope scope = FeedScope.builder().includeChurchPrimary(true).includeFamilyPrimary(true).build();

        FeedScopeValidator.ValidationResult result = validator.validate(userId, scope);

        assertTrue(result.scope().isIncludeChurchPrimary());
        assertFalse(result.scope().isIncludeFamilyPrimary());
    }

    @Test
    void emptyScopeProducesWarning() {
        FeedScopeValidator.ValidationResult result = validator.validate(userId, new FeedScope());

        assertTrue(result.scope().isEmpty());
        assertTrue(result.warnings().stream().anyMatch(w -> w.contains("empty")));
    }

    private static Organization org(String name, Organization.OrganizationType type, boolean discoverable) {
        Organization o = new Organization();
        o.setId(UUID.randomUUID());
        o.setName(name);
        o.setType(type);
        o.setDiscoverable(discoverable);
        return o;
    }
}
