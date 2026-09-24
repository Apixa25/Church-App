package com.churchapp;

import com.churchapp.dto.PrayerNotificationEvent;
import com.churchapp.dto.PrayerRequestUpdateRequest;
import com.churchapp.dto.PrayerUpdateRequest;
import com.churchapp.dto.PrayerUpdateResponse;
import com.churchapp.entity.Organization;
import com.churchapp.entity.PrayerRequest;
import com.churchapp.entity.PrayerUpdate;
import com.churchapp.entity.User;
import com.churchapp.exception.PrayerAccessDeniedException;
import com.churchapp.exception.PrayerNotFoundException;
import com.churchapp.repository.PrayerRequestRepository;
import com.churchapp.repository.PrayerUpdateRepository;
import com.churchapp.repository.UserRepository;
import com.churchapp.service.PrayerAccessPolicy;
import com.churchapp.service.PrayerRequestService;
import com.churchapp.service.PrayerUpdateService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Only the owner writes to the timeline, the church reads it, anonymous prayers
 * stay anonymous in their updates, and a status change rides the regular path.
 */
@ExtendWith(MockitoExtension.class)
class PrayerUpdateServiceTest {

    @Mock private PrayerUpdateRepository prayerUpdateRepository;
    @Mock private PrayerRequestRepository prayerRequestRepository;
    @Mock private UserRepository userRepository;
    @Mock private PrayerRequestService prayerRequestService;
    @Mock private SimpMessagingTemplate messagingTemplate;

    private PrayerUpdateService service;

    private Organization graceChurch;
    private User owner;
    private User bob;
    private PrayerRequest prayer;

    @BeforeEach
    void setUp() {
        service = new PrayerUpdateService(
            prayerUpdateRepository,
            prayerRequestRepository,
            userRepository,
            new PrayerAccessPolicy(userRepository),
            prayerRequestService,
            messagingTemplate);

        graceChurch = organization("Grace Church");
        owner = member("Owner", graceChurch);
        bob = member("Bob", graceChurch);

        prayer = new PrayerRequest();
        prayer.setId(UUID.randomUUID());
        prayer.setTitle("Surgery on Friday");
        prayer.setUser(owner);
        prayer.setOrganization(graceChurch);
        prayer.setIsAnonymous(false);
        prayer.setStatus(PrayerRequest.PrayerStatus.ACTIVE);

        lenient().when(prayerRequestRepository.findById(prayer.getId())).thenReturn(Optional.of(prayer));
        lenient().when(userRepository.findById(owner.getId())).thenReturn(Optional.of(owner));
        lenient().when(userRepository.findById(bob.getId())).thenReturn(Optional.of(bob));
        lenient().when(prayerUpdateRepository.save(any(PrayerUpdate.class))).thenAnswer(inv -> {
            PrayerUpdate saved = inv.getArgument(0);
            saved.setId(UUID.randomUUID());
            saved.setCreatedAt(LocalDateTime.now());
            return saved;
        });
    }

    @Test
    void addUpdate_byOwner_savesAndBroadcastsToChurchAndPrayerTopics() {
        PrayerUpdateResponse response = service.addUpdate(prayer.getId(), owner.getId(),
            new PrayerUpdateRequest("  Surgery went well!  ", null));

        assertEquals("Surgery went well!", response.getContent(), "content is trimmed");
        assertEquals(owner.getId(), response.getAuthorId());
        assertNull(response.getNewStatus());

        ArgumentCaptor<Object> payload = ArgumentCaptor.forClass(Object.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/organizations/" + graceChurch.getId() + "/prayers"), payload.capture());
        verify(messagingTemplate).convertAndSend(eq("/topic/prayers/" + prayer.getId() + "/interactions"), any(Object.class));
        assertEquals("prayer_update", ((PrayerNotificationEvent) payload.getValue()).getEventType());
        verify(prayerRequestService, never()).updatePrayerRequest(any(), any(), any());
    }

    @Test
    void addUpdate_withNewStatus_delegatesStatusChangeAndRecordsIt() {
        PrayerUpdateResponse response = service.addUpdate(prayer.getId(), owner.getId(),
            new PrayerUpdateRequest("Praise God, all clear", PrayerRequest.PrayerStatus.ANSWERED));

        ArgumentCaptor<PrayerRequestUpdateRequest> statusChange = ArgumentCaptor.forClass(PrayerRequestUpdateRequest.class);
        verify(prayerRequestService).updatePrayerRequest(eq(prayer.getId()), eq(owner.getId()), statusChange.capture());
        assertEquals(PrayerRequest.PrayerStatus.ANSWERED, statusChange.getValue().getStatus());
        assertEquals(PrayerRequest.PrayerStatus.ANSWERED, response.getNewStatus());
    }

    @Test
    void addUpdate_withSameStatus_doesNotTouchThePrayer() {
        PrayerUpdateResponse response = service.addUpdate(prayer.getId(), owner.getId(),
            new PrayerUpdateRequest("Still waiting", PrayerRequest.PrayerStatus.ACTIVE));

        verify(prayerRequestService, never()).updatePrayerRequest(any(), any(), any());
        assertNull(response.getNewStatus(), "no real transition, so nothing recorded");
    }

    @Test
    void addUpdate_byNonOwner_isForbidden() {
        assertThrows(PrayerAccessDeniedException.class,
            () -> service.addUpdate(prayer.getId(), bob.getId(), new PrayerUpdateRequest("hi", null)));
        verify(prayerUpdateRepository, never()).save(any());
        verify(messagingTemplate, never()).convertAndSend(anyString(), any(Object.class));
    }

    @Test
    void addUpdate_withBlankContent_isRejected() {
        assertThrows(IllegalArgumentException.class,
            () -> service.addUpdate(prayer.getId(), owner.getId(), new PrayerUpdateRequest("   ", null)));
        verify(prayerUpdateRepository, never()).save(any());
    }

    @Test
    void addUpdate_onMissingPrayer_isNotFound() {
        UUID missing = UUID.randomUUID();
        when(prayerRequestRepository.findById(missing)).thenReturn(Optional.empty());

        assertThrows(PrayerNotFoundException.class,
            () -> service.addUpdate(missing, owner.getId(), new PrayerUpdateRequest("hi", null)));
    }

    @Test
    void getUpdates_onAnonymousPrayer_hidesAuthorFromOthersButNotOwner() {
        prayer.setIsAnonymous(true);
        PrayerUpdate update = new PrayerUpdate();
        update.setId(UUID.randomUUID());
        update.setPrayerRequest(prayer);
        update.setAuthor(owner);
        update.setContent("Doing better");
        update.setCreatedAt(LocalDateTime.now());
        when(prayerUpdateRepository.findByPrayerRequestIdOrderByCreatedAtDesc(prayer.getId())).thenReturn(List.of(update));

        PrayerUpdateResponse forBob = service.getUpdates(prayer.getId(), bob.getId()).get(0);
        assertNull(forBob.getAuthorId());
        assertEquals(PrayerNotificationEvent.ANONYMOUS_DISPLAY_NAME, forBob.getAuthorName());
        assertNull(forBob.getAuthorProfilePicUrl());

        PrayerUpdateResponse forOwner = service.getUpdates(prayer.getId(), owner.getId()).get(0);
        assertEquals(owner.getId(), forOwner.getAuthorId());
        assertEquals("Owner", forOwner.getAuthorName());
    }

    @Test
    void addUpdate_onAnonymousPrayer_broadcastsWithoutAuthor() {
        prayer.setIsAnonymous(true);

        service.addUpdate(prayer.getId(), owner.getId(), new PrayerUpdateRequest("Doing better", null));

        ArgumentCaptor<Object> payload = ArgumentCaptor.forClass(Object.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/organizations/" + graceChurch.getId() + "/prayers"), payload.capture());
        PrayerNotificationEvent event = (PrayerNotificationEvent) payload.getValue();
        assertNull(event.getUserId());
        assertEquals(PrayerNotificationEvent.ANONYMOUS_DISPLAY_NAME, event.getUserName());
    }

    @Test
    void getUpdates_fromAnotherChurch_isForbidden() {
        User stranger = member("Stranger", organization("Other Church"));
        when(userRepository.findById(stranger.getId())).thenReturn(Optional.of(stranger));

        assertThrows(PrayerAccessDeniedException.class, () -> service.getUpdates(prayer.getId(), stranger.getId()));
    }

    @Test
    void deleteUpdate_byOwner_deletes_byOthersForbidden() {
        PrayerUpdate update = new PrayerUpdate();
        update.setId(UUID.randomUUID());
        update.setPrayerRequest(prayer);
        update.setAuthor(owner);
        update.setContent("x");
        when(prayerUpdateRepository.findById(update.getId())).thenReturn(Optional.of(update));

        assertThrows(PrayerAccessDeniedException.class,
            () -> service.deleteUpdate(prayer.getId(), update.getId(), bob.getId()));
        verify(prayerUpdateRepository, never()).delete(any());

        service.deleteUpdate(prayer.getId(), update.getId(), owner.getId());
        verify(prayerUpdateRepository).delete(update);
    }

    @Test
    void deleteUpdate_underTheWrongPrayer_isNotFound() {
        PrayerUpdate update = new PrayerUpdate();
        update.setId(UUID.randomUUID());
        update.setPrayerRequest(prayer);
        update.setAuthor(owner);
        when(prayerUpdateRepository.findById(update.getId())).thenReturn(Optional.of(update));

        assertThrows(PrayerNotFoundException.class,
            () -> service.deleteUpdate(UUID.randomUUID(), update.getId(), owner.getId()));
    }

    private static Organization organization(String name) {
        Organization organization = new Organization();
        organization.setId(UUID.randomUUID());
        organization.setName(name);
        return organization;
    }

    private static User member(String name, Organization church) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail(name.toLowerCase() + "@example.com");
        user.setName(name);
        user.setRole(User.Role.USER);
        user.setChurchPrimaryOrganization(church);
        return user;
    }
}
