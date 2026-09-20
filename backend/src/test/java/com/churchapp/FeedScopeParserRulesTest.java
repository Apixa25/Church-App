package com.churchapp;

import com.churchapp.dto.FeedScope;
import com.churchapp.dto.FeedScopeParseResult;
import com.churchapp.entity.Group;
import com.churchapp.entity.Organization;
import com.churchapp.entity.User;
import com.churchapp.entity.UserGroupMembership;
import com.churchapp.entity.UserOrganizationMembership;
import com.churchapp.repository.GroupRepository;
import com.churchapp.repository.OrganizationRepository;
import com.churchapp.repository.UserGroupMembershipRepository;
import com.churchapp.repository.UserOrganizationMembershipRepository;
import com.churchapp.repository.UserRepository;
import com.churchapp.service.FeedScopeParserService;
import com.churchapp.service.FeedScopeValidator;
import com.churchapp.service.OrganizationGroupService;
import com.churchapp.service.UserFollowService;
import com.churchapp.service.ai.OpenAiClient;
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
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * The rule-based first pass must handle the everyday phrases with zero LLM
 * calls. OpenAI is disabled in every test here.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class FeedScopeParserRulesTest {

    @Mock private UserRepository userRepository;
    @Mock private UserOrganizationMembershipRepository orgMembershipRepository;
    @Mock private UserGroupMembershipRepository groupMembershipRepository;
    @Mock private OrganizationRepository organizationRepository;
    @Mock private GroupRepository groupRepository;
    @Mock private OrganizationGroupService organizationGroupService;
    @Mock private UserFollowService userFollowService;
    @Mock private FeedScopeValidator validator;
    @Mock private OpenAiClient openAiClient;
    @Spy private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks private FeedScopeParserService parser;

    private final UUID userId = UUID.randomUUID();
    private Organization church;
    private Organization family;
    private Organization gracePoint;
    private Group youthGroup;
    private User mom;        // family member "Terry Sills"
    private User graceMember; // church member whose first name is a common word

    @BeforeEach
    void setUp() {
        church = org("First Baptist Church", Organization.OrganizationType.CHURCH);
        church.setDenomination("Baptist");
        family = org("Smith Family", Organization.OrganizationType.FAMILY);
        gracePoint = org("Grace Point Fellowship", Organization.OrganizationType.CHURCH);

        youthGroup = new Group();
        youthGroup.setId(UUID.randomUUID());
        youthGroup.setName("Youth Group");

        User user = new User();
        user.setId(userId);
        user.setChurchPrimaryOrganization(church);
        user.setFamilyPrimaryOrganization(family);
        user.setLatitude(new BigDecimal("38.4"));
        user.setLongitude(new BigDecimal("-122.7"));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        UserOrganizationMembership m1 = new UserOrganizationMembership();
        m1.setOrganization(church);
        UserOrganizationMembership m2 = new UserOrganizationMembership();
        m2.setOrganization(family);
        UserOrganizationMembership m3 = new UserOrganizationMembership();
        m3.setOrganization(gracePoint);
        when(orgMembershipRepository.findByUserId(userId)).thenReturn(List.of(m1, m2, m3));

        UserGroupMembership gm = new UserGroupMembership();
        gm.setGroup(youthGroup);
        when(groupMembershipRepository.findByUserId(userId)).thenReturn(List.of(gm));

        when(organizationGroupService.getUnmutedFollowedOrganizationIds(userId)).thenReturn(List.of());
        when(organizationRepository.findDistinctDenominations()).thenReturn(List.of("Baptist", "Methodist", "Lutheran"));
        when(organizationRepository.findAllById(any())).thenAnswer(inv -> {
            Iterable<UUID> ids = inv.getArgument(0);
            java.util.List<Organization> out = new java.util.ArrayList<>();
            for (UUID id : ids) {
                for (Organization o : List.of(church, family, gracePoint)) {
                    if (o.getId().equals(id)) out.add(o);
                }
            }
            return out;
        });
        when(groupRepository.findAllById(any())).thenReturn(List.of(youthGroup));

        // People directory: mom is in the family org, "Grace Will" is in the church.
        mom = person("Terry Sills");
        graceMember = person("Grace Will");
        UserOrganizationMembership momInFamily = new UserOrganizationMembership();
        momInFamily.setUser(mom);
        momInFamily.setOrganization(family);
        UserOrganizationMembership graceInChurch = new UserOrganizationMembership();
        graceInChurch.setUser(graceMember);
        graceInChurch.setOrganization(church);
        when(orgMembershipRepository.findByOrganizationId(family.getId())).thenReturn(List.of(momInFamily));
        when(orgMembershipRepository.findByOrganizationId(church.getId())).thenReturn(List.of(graceInChurch));
        when(orgMembershipRepository.findByOrganizationId(gracePoint.getId())).thenReturn(List.of());
        when(userFollowService.getFollowingIds(userId)).thenReturn(List.of());
        when(userRepository.findAllById(any())).thenAnswer(inv -> {
            Iterable<UUID> ids = inv.getArgument(0);
            java.util.List<User> out = new java.util.ArrayList<>();
            for (UUID id : ids) {
                for (User u : List.of(mom, graceMember)) {
                    if (u.getId().equals(id)) out.add(u);
                }
            }
            return out;
        });

        // Validator is exercised separately; here it passes scopes through untouched.
        when(validator.validate(eq(userId), any(FeedScope.class)))
            .thenAnswer(inv -> new FeedScopeValidator.ValidationResult(inv.getArgument(1), List.of()));

        when(openAiClient.isEnabled()).thenReturn(false);
    }

    @Test
    void justMyFamily() {
        FeedScopeParseResult r = parser.parse(userId, "I want to just see my family right now");

        assertRules(r);
        assertTrue(r.getScope().isIncludeFamilyPrimary());
        assertFalse(r.getScope().isIncludeChurchPrimary());
        assertFalse(r.getScope().isIncludeFriends());
        assertNull(r.getScope().getNearby());
        assertEquals("Smith Family", r.getDescription());
    }

    @Test
    void familyAndFriends() {
        FeedScopeParseResult r = parser.parse(userId, "I want to see my family and friends");

        assertRules(r);
        assertTrue(r.getScope().isIncludeFamilyPrimary());
        assertTrue(r.getScope().isIncludeFriends());
        assertFalse(r.getScope().isIncludeFollowing(), "'friends' should not also switch on one-way following");
        assertEquals("Smith Family + friends", r.getDescription());
    }

    @Test
    void churchAndFamily() {
        FeedScopeParseResult r = parser.parse(userId, "show me my church and my family");

        assertRules(r);
        assertTrue(r.getScope().isIncludeChurchPrimary());
        assertTrue(r.getScope().isIncludeFamilyPrimary());
        assertNull(r.getScope().getNearby());
        assertEquals("First Baptist Church + Smith Family", r.getDescription());
    }

    @Test
    void churchOnly() {
        FeedScopeParseResult r = parser.parse(userId, "I want to see my church only");

        assertRules(r);
        assertTrue(r.getScope().isIncludeChurchPrimary());
        assertFalse(r.getScope().isIncludeFamilyPrimary());
        assertNull(r.getScope().getNearby());
    }

    @Test
    void churchPlusSameDenominationWithinRadius() {
        FeedScopeParseResult r = parser.parse(userId,
            "I want to see my church and all of the churches in the same denomination within 100 miles of me");

        assertRules(r);
        assertTrue(r.getScope().isIncludeChurchPrimary());
        FeedScope.NearbyScope nearby = r.getScope().getNearby();
        assertNotNull(nearby);
        assertEquals(100, nearby.getRadiusMiles());
        assertTrue(nearby.isSameDenominationOnly());
        assertNull(nearby.getDenomination());
        assertEquals(List.of(Organization.OrganizationType.CHURCH), nearby.getOrgTypes());
        assertEquals("First Baptist Church + Baptist churches within 100 mi", r.getDescription());
    }

    @Test
    void everyChurchWithinRadiusDoesNotForceMyChurch() {
        FeedScopeParseResult r = parser.parse(userId, "I want to see every church within 20 miles of me in my feed right now");

        assertRules(r);
        assertFalse(r.getScope().isIncludeChurchPrimary(), "plural discovery phrase without 'my church'");
        assertNotNull(r.getScope().getNearby());
        assertEquals(20, r.getScope().getNearby().getRadiusMiles());
        assertFalse(r.getScope().getNearby().isSameDenominationOnly());
    }

    @Test
    void explicitDenominationName() {
        FeedScopeParseResult r = parser.parse(userId, "my church and Methodist churches within 50 miles");

        assertRules(r);
        assertTrue(r.getScope().isIncludeChurchPrimary());
        assertEquals("Methodist", r.getScope().getNearby().getDenomination());
        assertEquals(50, r.getScope().getNearby().getRadiusMiles());
        assertEquals("First Baptist Church + Methodist churches within 50 mi", r.getDescription());
    }

    @Test
    void nearbyWithoutRadiusUsesDefault() {
        FeedScopeParseResult r = parser.parse(userId, "churches near me");

        assertRules(r);
        assertEquals(FeedScope.DEFAULT_RADIUS_MILES, r.getScope().getNearby().getRadiusMiles());
    }

    @Test
    void namedOrganizationIsMatchedAndNotConfusedWithMyChurch() {
        FeedScopeParseResult r = parser.parse(userId, "just Grace Point Fellowship");

        assertRules(r);
        assertEquals(List.of(gracePoint.getId()), r.getScope().getOrganizationIds());
        assertFalse(r.getScope().isIncludeChurchPrimary());
        assertEquals("Grace Point Fellowship", r.getDescription());
    }

    @Test
    void ownChurchNameContainingChurchDoesNotTriggerNearby() {
        FeedScopeParseResult r = parser.parse(userId, "First Baptist Church and my family");

        assertRules(r);
        // Naming your own church is canonicalised to the church-primary flag, not an explicit ID
        assertTrue(r.getScope().isIncludeChurchPrimary());
        assertTrue(r.getScope().getOrganizationIds().isEmpty());
        assertTrue(r.getScope().isIncludeFamilyPrimary());
        assertNull(r.getScope().getNearby(), "'Baptist' inside the org name must not become a denomination search");
        assertEquals("First Baptist Church + Smith Family", r.getDescription());
    }

    @Test
    void namedGroup() {
        FeedScopeParseResult r = parser.parse(userId, "show me the youth group");

        assertRules(r);
        assertEquals(List.of(youthGroup.getId()), r.getScope().getGroupIds());
        assertFalse(r.getScope().isIncludeMyGroups());
    }

    @Test
    void allMyGroups() {
        FeedScopeParseResult r = parser.parse(userId, "my groups");

        assertRules(r);
        assertTrue(r.getScope().isIncludeMyGroups());
    }

    @Test
    void everythingMapsToLegacyFilter() {
        FeedScopeParseResult r = parser.parse(userId, "show me everything");

        assertEquals("EVERYTHING", r.getLegacyFilter());
        assertNull(r.getScope());
        assertEquals(FeedScopeParserService.SOURCE_RULES, r.getSource());
    }

    @Test
    void peopleIFollow() {
        FeedScopeParseResult r = parser.parse(userId, "people I follow");

        assertRules(r);
        assertTrue(r.getScope().isIncludeFollowing());
        assertFalse(r.getScope().isIncludeFriends());
    }

    @Test
    void namedPersonBecomesAuthorFilterWithoutTurningOnFamily() {
        FeedScopeParseResult r = parser.parse(userId,
            "show me all of my mothers posts please her name is Terry Sills");

        assertRules(r);
        assertEquals(List.of(mom.getId()), r.getScope().getUserIds());
        assertFalse(r.getScope().isIncludeFamilyPrimary(), "'mothers' is a relationship word, not a request for the whole family");
        assertFalse(r.getScope().isIncludeChurchPrimary());
        assertEquals("posts by Terry Sills", r.getDescription());
    }

    @Test
    void personPlusFamilyKeepsBoth() {
        FeedScopeParseResult r = parser.parse(userId, "Terry Sills and my family");

        assertRules(r);
        assertEquals(List.of(mom.getId()), r.getScope().getUserIds());
        assertTrue(r.getScope().isIncludeFamilyPrimary());
        assertEquals("Smith Family + posts by Terry Sills", r.getDescription());
    }

    @Test
    void commonWordFirstNameDoesNotMatchByAccident() {
        // "grace" appears inside "Grace Point Fellowship" and could appear as an ordinary word;
        // rules only match a person's FULL name on word boundaries.
        FeedScopeParseResult r = parser.parse(userId, "just Grace Point Fellowship");

        assertRules(r);
        assertTrue(r.getScope().getUserIds().isEmpty());
        assertEquals(List.of(gracePoint.getId()), r.getScope().getOrganizationIds());
    }

    @Test
    void firstNameOnlyFallsThroughToAiOrClarification() {
        // With AI disabled, a bare first name is not enough for the rules to act on.
        FeedScopeParseResult r = parser.parse(userId, "posts by Terry");

        assertNull(r.getScope());
        assertNotNull(r.getClarificationQuestion());
    }

    @Test
    void gibberishAsksForClarificationWhenAiDisabled() {
        FeedScopeParseResult r = parser.parse(userId, "purple elephants on tuesday");

        assertNull(r.getScope());
        assertNull(r.getLegacyFilter());
        assertNotNull(r.getClarificationQuestion());
        assertTrue(r.getConfidence() < 0.5);
        verify(openAiClient, never()).completeStructured(anyString(), anyString(), anyString(), any(), any());
    }

    @Test
    void emptyTextAsksForClarification() {
        FeedScopeParseResult r = parser.parse(userId, "   ");

        assertNull(r.getScope());
        assertNotNull(r.getClarificationQuestion());
    }

    @Test
    void neverCallsOpenAiForSimplePhrases() {
        parser.parse(userId, "my family");
        parser.parse(userId, "my church and my family");
        parser.parse(userId, "friends");

        verify(openAiClient, never()).completeStructured(anyString(), anyString(), anyString(), any(), any());
    }

    private static void assertRules(FeedScopeParseResult r) {
        assertNotNull(r.getScope(), "expected a scope, got clarification: " + r.getClarificationQuestion());
        assertEquals(FeedScopeParserService.SOURCE_RULES, r.getSource());
        assertTrue(r.getConfidence() >= 0.7, "rules should be confident: " + r.getConfidence());
    }

    private static Organization org(String name, Organization.OrganizationType type) {
        Organization o = new Organization();
        o.setId(UUID.randomUUID());
        o.setName(name);
        o.setType(type);
        o.setDiscoverable(true);
        return o;
    }

    private static User person(String name) {
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setName(name);
        u.setIsActive(true);
        return u;
    }
}
