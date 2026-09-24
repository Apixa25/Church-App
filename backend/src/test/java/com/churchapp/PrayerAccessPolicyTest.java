package com.churchapp;

import com.churchapp.entity.Organization;
import com.churchapp.entity.PrayerRequest;
import com.churchapp.entity.User;
import com.churchapp.exception.PrayerAccessDeniedException;
import com.churchapp.repository.UserRepository;
import com.churchapp.service.PrayerAccessPolicy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

/**
 * The single rule every prayer read goes through: you see prayers from your
 * own church, platform admins see everything, everyone else sees nothing.
 */
@ExtendWith(MockitoExtension.class)
class PrayerAccessPolicyTest {

    @Mock private UserRepository userRepository;

    private PrayerAccessPolicy policy;
    private Organization graceChurch;
    private Organization otherChurch;
    private PrayerRequest gracePrayer;

    @BeforeEach
    void setUp() {
        policy = new PrayerAccessPolicy(userRepository);

        graceChurch = organization("Grace Church");
        otherChurch = organization("Other Church");

        gracePrayer = new PrayerRequest();
        gracePrayer.setId(UUID.randomUUID());
        gracePrayer.setOrganization(graceChurch);
    }

    @Test
    void memberOfSameChurch_canView() {
        assertTrue(policy.canView(gracePrayer, member(graceChurch)));
    }

    @Test
    void memberOfOtherChurch_cannotView() {
        assertFalse(policy.canView(gracePrayer, member(otherChurch)));
    }

    @Test
    void userWithoutChurch_cannotView() {
        assertFalse(policy.canView(gracePrayer, member(null)));
    }

    @Test
    void prayerWithoutChurch_isInvisibleToMembers() {
        gracePrayer.setOrganization(null);

        assertFalse(policy.canView(gracePrayer, member(graceChurch)));
    }

    @Test
    void platformAdmin_canViewAnyChurch() {
        User admin = member(otherChurch);
        admin.setRole(User.Role.PLATFORM_ADMIN);

        assertTrue(policy.canView(gracePrayer, admin));
    }

    @Test
    void platformModerator_isNotAdmin_andStaysChurchScoped() {
        User moderator = member(otherChurch);
        moderator.setRole(User.Role.MODERATOR);

        assertFalse(policy.canView(gracePrayer, moderator));
    }

    @Test
    void assertCanView_throwsForbiddenWithFriendlyMessage() {
        PrayerAccessDeniedException ex = assertThrows(PrayerAccessDeniedException.class,
            () -> policy.assertCanView(gracePrayer, member(otherChurch)));

        assertEquals(PrayerAccessPolicy.OUTSIDE_CHURCH_MESSAGE, ex.getMessage());
        assertEquals(403, ex.getStatus().value());
    }

    @Test
    void assertCanView_byId_loadsViewerAndReturnsIt() {
        User alice = member(graceChurch);
        when(userRepository.findById(alice.getId())).thenReturn(Optional.of(alice));

        assertSame(alice, policy.assertCanView(gracePrayer, alice.getId()));
    }

    @Test
    void churchIdOf_isNullWithoutChurch() {
        assertEquals(graceChurch.getId(), policy.churchIdOf(member(graceChurch)));
        assertEquals(null, policy.churchIdOf(member(null)));
    }

    private static Organization organization(String name) {
        Organization organization = new Organization();
        organization.setId(UUID.randomUUID());
        organization.setName(name);
        return organization;
    }

    private static User member(Organization church) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail(UUID.randomUUID() + "@example.com");
        user.setName("Member");
        user.setRole(User.Role.USER);
        user.setChurchPrimaryOrganization(church);
        return user;
    }
}
