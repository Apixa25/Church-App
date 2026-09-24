package com.churchapp;

import com.churchapp.dto.PrayerNotificationEvent;
import com.churchapp.dto.PrayerRequestRequest;
import com.churchapp.dto.PrayerRequestUpdateRequest;
import com.churchapp.dto.PrayerRequestResponse;
import com.churchapp.entity.Organization;
import com.churchapp.entity.PrayerRequest;
import com.churchapp.entity.User;
import com.churchapp.entity.UserSettings;
import com.churchapp.exception.PrayerAccessDeniedException;
import com.churchapp.exception.PrayerNotFoundException;
import com.churchapp.repository.PrayerInteractionRepository;
import com.churchapp.repository.PrayerRequestRepository;
import com.churchapp.repository.UserRepository;
import com.churchapp.repository.UserSettingsRepository;
import com.churchapp.service.AdminAuthorizationService;
import com.churchapp.service.ChurchPrimaryResolver;
import com.churchapp.service.FileUploadService;
import com.churchapp.service.NotificationService;
import com.churchapp.service.PrayerAccessPolicy;
import com.churchapp.service.PrayerRequestService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Notifications go only to church members who want them, "answered" fires
 * only on a real transition, and moderation stays inside the church.
 */
@ExtendWith(MockitoExtension.class)
class PrayerRequestServiceTest {

    @Mock private PrayerRequestRepository prayerRequestRepository;
    @Mock private UserRepository userRepository;
    @Mock private UserSettingsRepository userSettingsRepository;
    @Mock private PrayerInteractionRepository prayerInteractionRepository;
    @Mock private FileUploadService fileUploadService;
    @Mock private NotificationService notificationService;
    @Mock private ChurchPrimaryResolver churchPrimaryResolver;
    @Mock private AdminAuthorizationService adminAuthorizationService;
    @Mock private SimpMessagingTemplate messagingTemplate;

    private PrayerRequestService service;

    private Organization graceChurch;
    private Organization otherChurch;
    private User owner;
    private User bob;      // same church, has device token, wants prayer pushes
    private User carol;    // same church, has device token, turned prayer pushes off
    private User dave;     // same church, no device token
    private PrayerRequest prayer;

    @BeforeEach
    void setUp() {
        service = new PrayerRequestService(
            prayerRequestRepository,
            userRepository,
            userSettingsRepository,
            prayerInteractionRepository,
            fileUploadService,
            notificationService,
            churchPrimaryResolver,
            new PrayerAccessPolicy(userRepository),
            adminAuthorizationService,
            messagingTemplate);

        graceChurch = organization("Grace Church");
        otherChurch = organization("Other Church");

        owner = member("Owner", graceChurch, "token-owner");
        bob = member("Bob", graceChurch, "token-bob");
        carol = member("Carol", graceChurch, "token-carol");
        dave = member("Dave", graceChurch, null);

        prayer = new PrayerRequest();
        prayer.setId(UUID.randomUUID());
        prayer.setTitle("Surgery on Friday");
        prayer.setUser(owner);
        prayer.setOrganization(graceChurch);
        prayer.setIsAnonymous(false);
        prayer.setStatus(PrayerRequest.PrayerStatus.ACTIVE);

        lenient().when(prayerRequestRepository.findById(prayer.getId())).thenReturn(Optional.of(prayer));
        lenient().when(prayerRequestRepository.save(any(PrayerRequest.class))).thenAnswer(inv -> {
            PrayerRequest saved = inv.getArgument(0);
            if (saved.getId() == null) {
                saved.setId(UUID.randomUUID());
            }
            return saved;
        });
        for (User user : List.of(owner, bob, carol, dave)) {
            lenient().when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        }
    }

    // ==================== push notifications ====================

    @Test
    void newPrayer_pushesOnlyToMembersWhoWantPrayerNotifications() {
        when(churchPrimaryResolver.requireChurchMatch(owner, null)).thenReturn(graceChurch);
        when(userRepository.findByChurchPrimaryOrganization(graceChurch)).thenReturn(List.of(owner, bob, carol, dave));
        when(userSettingsRepository.findUserIdsOptedOutOfPrayerPush(anyCollection())).thenReturn(Set.of(carol.getId()));

        service.createPrayerRequest(owner.getId(), newRequest());

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<String>> tokens = ArgumentCaptor.forClass(List.class);
        verify(notificationService).sendBulkNotification(tokens.capture(), anyString(), anyString(), anyMap());
        assertEquals(List.of("token-bob"), tokens.getValue(),
            "author excluded, Carol opted out, Dave has no device — only Bob is left");

        // Opt-out lookup only asks about members who could actually be notified
        @SuppressWarnings("unchecked")
        ArgumentCaptor<java.util.Collection<UUID>> asked = ArgumentCaptor.forClass(java.util.Collection.class);
        verify(userSettingsRepository).findUserIdsOptedOutOfPrayerPush(asked.capture());
        assertEquals(Set.of(bob.getId(), carol.getId()), Set.copyOf(asked.getValue()));
    }

    @Test
    void newPrayer_withNoEligibleDevices_sendsNothingAndSkipsSettingsLookup() {
        when(churchPrimaryResolver.requireChurchMatch(owner, null)).thenReturn(graceChurch);
        when(userRepository.findByChurchPrimaryOrganization(graceChurch)).thenReturn(List.of(owner, dave));

        service.createPrayerRequest(owner.getId(), newRequest());

        verify(notificationService, never()).sendBulkNotification(anyList(), anyString(), anyString(), anyMap());
        verify(userSettingsRepository, never()).findUserIdsOptedOutOfPrayerPush(anyCollection());
    }

    @Test
    void newPrayer_broadcastsToTheChurchTopic() {
        when(churchPrimaryResolver.requireChurchMatch(owner, null)).thenReturn(graceChurch);
        when(userRepository.findByChurchPrimaryOrganization(graceChurch)).thenReturn(List.of());

        service.createPrayerRequest(owner.getId(), newRequest());

        ArgumentCaptor<Object> payload = ArgumentCaptor.forClass(Object.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/organizations/" + graceChurch.getId() + "/prayers"), payload.capture());
        assertEquals("new_prayer", ((PrayerNotificationEvent) payload.getValue()).getEventType());
    }

    // ==================== answered transition ====================

    @Test
    void update_toAnswered_broadcastsOnce() {
        PrayerRequestUpdateRequest update = new PrayerRequestUpdateRequest();
        update.setStatus(PrayerRequest.PrayerStatus.ANSWERED);

        service.updatePrayerRequest(prayer.getId(), owner.getId(), update);

        ArgumentCaptor<Object> payload = ArgumentCaptor.forClass(Object.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/organizations/" + graceChurch.getId() + "/prayers"), payload.capture());
        assertEquals("prayer_answered", ((PrayerNotificationEvent) payload.getValue()).getEventType());
    }

    @Test
    void update_ofTitleOnly_doesNotBroadcast() {
        PrayerRequestUpdateRequest update = new PrayerRequestUpdateRequest();
        update.setTitle("Surgery moved to Monday");

        service.updatePrayerRequest(prayer.getId(), owner.getId(), update);

        verify(messagingTemplate, never()).convertAndSend(anyString(), any(Object.class));
    }

    @Test
    void update_ofAlreadyAnsweredPrayer_doesNotBroadcastAgain() {
        prayer.setStatus(PrayerRequest.PrayerStatus.ANSWERED);
        PrayerRequestUpdateRequest update = new PrayerRequestUpdateRequest();
        update.setStatus(PrayerRequest.PrayerStatus.ANSWERED);
        update.setDescription("Praise God, all went well");

        service.updatePrayerRequest(prayer.getId(), owner.getId(), update);

        verify(messagingTemplate, never()).convertAndSend(anyString(), any(Object.class));
    }

    @Test
    void update_byNonOwner_isForbidden_evenForChurchModerators() {
        // Lenient: the owner check must reject before moderator status is even consulted.
        lenient().when(adminAuthorizationService.canModerateOrg(bob, graceChurch.getId())).thenReturn(true);
        PrayerRequestUpdateRequest update = new PrayerRequestUpdateRequest();
        update.setTitle("edited by someone else");

        assertThrows(PrayerAccessDeniedException.class,
            () -> service.updatePrayerRequest(prayer.getId(), bob.getId(), update));
        verify(prayerRequestRepository, never()).save(any());
        verify(adminAuthorizationService, never()).canModerateOrg(any(), any());
    }

    // ==================== not found / forbidden ====================

    @Test
    void getPrayer_missing_isNotFound() {
        UUID missing = UUID.randomUUID();
        when(prayerRequestRepository.findById(missing)).thenReturn(Optional.empty());

        assertThrows(PrayerNotFoundException.class, () -> service.getPrayerRequest(missing, owner.getId()));
    }

    @Test
    void getPrayer_fromAnotherChurch_isForbidden() {
        User stranger = member("Stranger", otherChurch, null);
        when(userRepository.findById(stranger.getId())).thenReturn(Optional.of(stranger));

        assertThrows(PrayerAccessDeniedException.class, () -> service.getPrayerRequest(prayer.getId(), stranger.getId()));
    }

    // ==================== moderation ====================

    @Test
    void delete_byOwner_isAllowed() {
        service.deletePrayerRequest(prayer.getId(), owner.getId());

        verify(prayerRequestRepository).delete(prayer);
    }

    @Test
    void delete_byChurchModerator_ofSameChurch_isAllowed() {
        when(adminAuthorizationService.canModerateOrg(bob, graceChurch.getId())).thenReturn(true);

        service.deletePrayerRequest(prayer.getId(), bob.getId());

        verify(prayerRequestRepository).delete(prayer);
    }

    @Test
    void delete_byAdminOfAnotherChurch_isForbidden() {
        User otherAdmin = member("OtherAdmin", otherChurch, null);
        when(userRepository.findById(otherAdmin.getId())).thenReturn(Optional.of(otherAdmin));
        when(adminAuthorizationService.canModerateOrg(otherAdmin, graceChurch.getId())).thenReturn(false);

        assertThrows(PrayerAccessDeniedException.class, () -> service.deletePrayerRequest(prayer.getId(), otherAdmin.getId()));
        verify(prayerRequestRepository, never()).delete(any());
    }

    @Test
    void delete_byOrdinaryMember_isForbidden() {
        when(adminAuthorizationService.canModerateOrg(bob, graceChurch.getId())).thenReturn(false);

        assertThrows(PrayerAccessDeniedException.class, () -> service.deletePrayerRequest(prayer.getId(), bob.getId()));
    }

    @Test
    void delete_byPlatformAdmin_isAllowedWithoutMembership() {
        User platformAdmin = member("Platform", otherChurch, null);
        platformAdmin.setRole(User.Role.PLATFORM_ADMIN);
        when(userRepository.findById(platformAdmin.getId())).thenReturn(Optional.of(platformAdmin));

        service.deletePrayerRequest(prayer.getId(), platformAdmin.getId());

        verify(prayerRequestRepository).delete(prayer);
        verify(adminAuthorizationService, never()).canModerateOrg(any(), any());
    }

    @Test
    void archiveForModeration_byChurchModerator_hidesFromFeed() {
        when(adminAuthorizationService.canModerateOrg(bob, graceChurch.getId())).thenReturn(true);

        service.archivePrayerRequestForModeration(prayer.getId(), bob.getId(), "off-topic");

        assertEquals(PrayerRequest.PrayerStatus.ARCHIVED, prayer.getStatus());
        verify(prayerRequestRepository).save(prayer);
    }

    @Test
    void archiveForModeration_byOrdinaryMember_isForbidden() {
        when(adminAuthorizationService.canModerateOrg(bob, graceChurch.getId())).thenReturn(false);

        assertThrows(PrayerAccessDeniedException.class,
            () -> service.archivePrayerRequestForModeration(prayer.getId(), bob.getId(), "nope"));
        assertEquals(PrayerRequest.PrayerStatus.ACTIVE, prayer.getStatus());
    }

    @Test
    void findOwnerId_returnsOwnerOrEmpty() {
        assertEquals(Optional.of(owner.getId()), service.findOwnerId(prayer.getId()));

        UUID missing = UUID.randomUUID();
        when(prayerRequestRepository.findById(missing)).thenReturn(Optional.empty());
        assertEquals(Optional.empty(), service.findOwnerId(missing));
    }

    // ==================== default anonymity from settings ====================

    @Test
    void create_withNoAnonymityChoice_followsAnonymousVisibilitySetting() {
        when(churchPrimaryResolver.requireChurchMatch(owner, null)).thenReturn(graceChurch);
        when(userRepository.findByChurchPrimaryOrganization(graceChurch)).thenReturn(List.of());
        UserSettings settings = new UserSettings();
        settings.setPrayerRequestVisibility(UserSettings.PrayerVisibility.ANONYMOUS);
        when(userSettingsRepository.findByUserId(owner.getId())).thenReturn(Optional.of(settings));

        PrayerRequestRequest request = newRequest();
        request.setIsAnonymous(null);

        assertTrue(service.createPrayerRequest(owner.getId(), request).getIsAnonymous());
    }

    @Test
    void create_withExplicitChoice_ignoresVisibilitySetting() {
        when(churchPrimaryResolver.requireChurchMatch(owner, null)).thenReturn(graceChurch);
        when(userRepository.findByChurchPrimaryOrganization(graceChurch)).thenReturn(List.of());

        PrayerRequestRequest request = newRequest();
        request.setIsAnonymous(false);

        assertFalse(service.createPrayerRequest(owner.getId(), request).getIsAnonymous());
        verify(userSettingsRepository, never()).findByUserId(any());
    }

    @Test
    void create_withNoSettingsRow_defaultsToNamed() {
        when(churchPrimaryResolver.requireChurchMatch(owner, null)).thenReturn(graceChurch);
        when(userRepository.findByChurchPrimaryOrganization(graceChurch)).thenReturn(List.of());
        when(userSettingsRepository.findByUserId(owner.getId())).thenReturn(Optional.empty());

        PrayerRequestRequest request = newRequest();
        request.setIsAnonymous(null);

        assertFalse(service.createPrayerRequest(owner.getId(), request).getIsAnonymous());
    }

    @Test
    void prefersAnonymity_treatsPrivateAndAnonymousAsAnonymous() {
        assertTrue(PrayerRequestService.prefersAnonymity(UserSettings.PrayerVisibility.ANONYMOUS));
        assertTrue(PrayerRequestService.prefersAnonymity(UserSettings.PrayerVisibility.PRIVATE));
        assertFalse(PrayerRequestService.prefersAnonymity(UserSettings.PrayerVisibility.CHURCH_MEMBERS));
        assertFalse(PrayerRequestService.prefersAnonymity(UserSettings.PrayerVisibility.PUBLIC));
        assertFalse(PrayerRequestService.prefersAnonymity(null));
    }

    // ==================== list filters ====================

    @Test
    void list_withNoFilters_returnsActiveOnly() {
        when(churchPrimaryResolver.requireChurchMatch(owner, null)).thenReturn(graceChurch);
        when(prayerRequestRepository.findByOrganizationIdAndStatusIn(eq(graceChurch.getId()), anyCollection(), any()))
            .thenReturn(new PageImpl<>(List.of(prayer)));

        Page<PrayerRequestResponse> page = service.getAllPrayerRequests(owner.getId(), null, null, null, 0, 20);

        assertEquals(1, page.getTotalElements());
        @SuppressWarnings("unchecked")
        ArgumentCaptor<java.util.Collection<PrayerRequest.PrayerStatus>> statuses =
            ArgumentCaptor.forClass(java.util.Collection.class);
        verify(prayerRequestRepository).findByOrganizationIdAndStatusIn(eq(graceChurch.getId()), statuses.capture(), any());
        assertEquals(List.of(PrayerRequest.PrayerStatus.ACTIVE), List.copyOf(statuses.getValue()));
    }

    @Test
    void list_withCategoryAndStatus_combinesBothInOneQuery() {
        when(churchPrimaryResolver.requireChurchMatch(owner, null)).thenReturn(graceChurch);
        when(prayerRequestRepository.findByOrganizationIdAndCategoryAndStatusIn(
                eq(graceChurch.getId()), eq(PrayerRequest.PrayerCategory.HEALTH), anyCollection(), any()))
            .thenReturn(new PageImpl<>(List.of(prayer)));

        service.getAllPrayerRequests(owner.getId(), null,
            PrayerRequest.PrayerCategory.HEALTH, PrayerRequest.PrayerStatus.ANSWERED, 0, 20);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<java.util.Collection<PrayerRequest.PrayerStatus>> statuses =
            ArgumentCaptor.forClass(java.util.Collection.class);
        verify(prayerRequestRepository).findByOrganizationIdAndCategoryAndStatusIn(
            eq(graceChurch.getId()), eq(PrayerRequest.PrayerCategory.HEALTH), statuses.capture(), any());
        assertEquals(List.of(PrayerRequest.PrayerStatus.ANSWERED), List.copyOf(statuses.getValue()));
    }

    @Test
    void list_archived_onlyShowsTheCallersOwnPrayers() {
        when(churchPrimaryResolver.requireChurchMatch(bob, null)).thenReturn(graceChurch);
        when(prayerRequestRepository.findArchivedByOrganizationIdAndUserId(eq(graceChurch.getId()), eq(bob.getId()), any()))
            .thenReturn(Page.empty());

        service.getAllPrayerRequests(bob.getId(), null, null, PrayerRequest.PrayerStatus.ARCHIVED, 0, 20);

        verify(prayerRequestRepository).findArchivedByOrganizationIdAndUserId(eq(graceChurch.getId()), eq(bob.getId()), any());
        verify(prayerRequestRepository, never()).findByOrganizationIdAndStatusIn(any(), anyCollection(), any());
    }

    @Test
    void findOrganizationId_returnsChurchOrEmpty() {
        assertEquals(Optional.of(graceChurch.getId()), service.findOrganizationId(prayer.getId()));

        UUID missing = UUID.randomUUID();
        when(prayerRequestRepository.findById(missing)).thenReturn(Optional.empty());
        assertEquals(Optional.empty(), service.findOrganizationId(missing));
    }

    // ==================== helpers ====================

    private static PrayerRequestRequest newRequest() {
        PrayerRequestRequest request = new PrayerRequestRequest();
        request.setTitle("Surgery on Friday");
        request.setDescription("Please pray for a steady hand.");
        request.setIsAnonymous(false);
        request.setCategory(PrayerRequest.PrayerCategory.HEALTH);
        return request;
    }

    private static Organization organization(String name) {
        Organization organization = new Organization();
        organization.setId(UUID.randomUUID());
        organization.setName(name);
        return organization;
    }

    private static User member(String name, Organization church, String fcmToken) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail(name.toLowerCase() + "@example.com");
        user.setName(name);
        user.setRole(User.Role.USER);
        user.setChurchPrimaryOrganization(church);
        user.setFcmToken(fcmToken);
        return user;
    }
}
