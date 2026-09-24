package com.churchapp;

import com.churchapp.dto.PrayerInteractionRequest;
import com.churchapp.dto.PrayerInteractionResponse;
import com.churchapp.dto.PrayerInteractionSummary;
import com.churchapp.dto.PrayerNotificationEvent;
import com.churchapp.entity.Organization;
import com.churchapp.entity.PrayerInteraction;
import com.churchapp.entity.PrayerRequest;
import com.churchapp.entity.User;
import com.churchapp.exception.PrayerAccessDeniedException;
import com.churchapp.exception.PrayerNotFoundException;
import com.churchapp.repository.PrayerInteractionRepository;
import com.churchapp.repository.PrayerRequestRepository;
import com.churchapp.repository.UserRepository;
import com.churchapp.service.PrayerAccessPolicy;
import com.churchapp.service.PrayerInteractionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Reactions and comments must respect the prayer's church boundary and the
 * author's anonymity, and the list summary must be built in bulk.
 */
@ExtendWith(MockitoExtension.class)
class PrayerInteractionServiceTest {

    @Mock private PrayerInteractionRepository prayerInteractionRepository;
    @Mock private PrayerRequestRepository prayerRequestRepository;
    @Mock private UserRepository userRepository;
    @Mock private SimpMessagingTemplate messagingTemplate;

    private PrayerInteractionService service;

    private Organization graceChurch;
    private Organization otherChurch;
    private User owner;      // wrote the prayer
    private User alice;      // same church as owner
    private User stranger;   // other church
    private PrayerRequest prayer;

    @BeforeEach
    void setUp() {
        service = new PrayerInteractionService(
            prayerInteractionRepository,
            prayerRequestRepository,
            userRepository,
            new PrayerAccessPolicy(userRepository),
            messagingTemplate);

        graceChurch = organization("Grace Church");
        otherChurch = organization("Other Church");

        owner = member("Owner", graceChurch);
        alice = member("Alice", graceChurch);
        stranger = member("Stranger", otherChurch);

        prayer = new PrayerRequest();
        prayer.setId(UUID.randomUUID());
        prayer.setTitle("Healing for my mom");
        prayer.setUser(owner);
        prayer.setOrganization(graceChurch);
        prayer.setIsAnonymous(false);

        lenient().when(prayerRequestRepository.findById(prayer.getId())).thenReturn(Optional.of(prayer));
        for (User user : List.of(owner, alice, stranger)) {
            lenient().when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        }
    }

    // ==================== church boundary ====================

    @Test
    void createInteraction_fromAnotherChurch_isForbiddenAndSavesNothing() {
        PrayerInteractionRequest request = reaction(PrayerInteraction.InteractionType.PRAY);

        assertThrows(PrayerAccessDeniedException.class, () -> service.createInteraction(stranger.getId(), request));

        verify(prayerInteractionRepository, never()).save(any());
        verify(messagingTemplate, never()).convertAndSend(any(String.class), any(Object.class));
    }

    @Test
    void createInteraction_onMissingPrayer_isNotFound() {
        UUID missing = UUID.randomUUID();
        when(prayerRequestRepository.findById(missing)).thenReturn(Optional.empty());
        PrayerInteractionRequest request = reaction(PrayerInteraction.InteractionType.PRAY);
        request.setPrayerRequestId(missing);

        assertThrows(PrayerNotFoundException.class, () -> service.createInteraction(alice.getId(), request));
    }

    @Test
    void getComments_fromAnotherChurch_isForbidden() {
        assertThrows(PrayerAccessDeniedException.class,
            () -> service.getCommentsByPrayerRequest(prayer.getId(), stranger.getId()));

        verify(prayerInteractionRepository, never()).findCommentsByPrayerRequestId(any());
    }

    @Test
    void getParticipants_fromSameChurch_isAllowed() {
        when(prayerInteractionRepository.findDistinctParticipantsByPrayerRequestId(prayer.getId()))
            .thenReturn(List.of());

        assertNotNull(service.getParticipants(prayer.getId(), alice.getId()));
    }

    @Test
    void hasUserInteracted_fromAnotherChurch_isForbidden() {
        assertThrows(PrayerAccessDeniedException.class,
            () -> service.hasUserInteracted(prayer.getId(), stranger.getId(), PrayerInteraction.InteractionType.PRAY));
    }

    // ==================== reactions ====================

    @Test
    void createReaction_toggle_removesExistingReactionInsteadOfDuplicating() {
        PrayerInteraction existing = interaction(alice, PrayerInteraction.InteractionType.PRAY, null);
        when(prayerInteractionRepository.findByPrayerRequestAndUserAndType(prayer, alice, PrayerInteraction.InteractionType.PRAY))
            .thenReturn(Optional.of(existing));

        PrayerInteractionResponse response = service.createInteraction(alice.getId(),
            reaction(PrayerInteraction.InteractionType.PRAY));

        assertNull(response, "null signals the reaction was removed (toggle)");
        verify(prayerInteractionRepository).delete(existing);
        verify(prayerInteractionRepository, never()).save(any());
    }

    @Test
    void createReaction_new_savesAndBroadcastsToPrayerTopicAndOwnerQueue() {
        when(prayerInteractionRepository.findByPrayerRequestAndUserAndType(prayer, alice, PrayerInteraction.InteractionType.PRAY))
            .thenReturn(Optional.empty());
        when(prayerInteractionRepository.save(any(PrayerInteraction.class))).thenAnswer(inv -> {
            PrayerInteraction saved = inv.getArgument(0);
            saved.setId(UUID.randomUUID());
            return saved;
        });

        PrayerInteractionResponse response = service.createInteraction(alice.getId(),
            reaction(PrayerInteraction.InteractionType.PRAY));

        assertNotNull(response);
        assertEquals(PrayerInteraction.InteractionType.PRAY, response.getType());

        ArgumentCaptor<Object> payload = ArgumentCaptor.forClass(Object.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/prayers/" + prayer.getId() + "/interactions"), payload.capture());
        PrayerNotificationEvent event = (PrayerNotificationEvent) payload.getValue();
        assertEquals("prayer_interaction", event.getEventType());
        assertEquals(alice.getId(), event.getUserId());
        assertEquals(graceChurch.getId(), event.getOrganizationId());

        verify(messagingTemplate).convertAndSendToUser(eq(owner.getEmail()), eq("/queue/prayers"), any(Object.class));
    }

    @Test
    void createReaction_byOwner_doesNotEchoToOwnQueue() {
        when(prayerInteractionRepository.findByPrayerRequestAndUserAndType(prayer, owner, PrayerInteraction.InteractionType.AMEN))
            .thenReturn(Optional.empty());
        when(prayerInteractionRepository.save(any(PrayerInteraction.class))).thenAnswer(inv -> inv.getArgument(0));

        service.createInteraction(owner.getId(), reaction(PrayerInteraction.InteractionType.AMEN));

        verify(messagingTemplate, never()).convertAndSendToUser(any(String.class), any(String.class), any(Object.class));
    }

    @Test
    void createReaction_withParent_isRejected() {
        PrayerInteractionRequest request = reaction(PrayerInteraction.InteractionType.HEART);
        request.setParentInteractionId(UUID.randomUUID());
        when(prayerInteractionRepository.findByPrayerRequestAndUserAndType(prayer, alice, PrayerInteraction.InteractionType.HEART))
            .thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> service.createInteraction(alice.getId(), request));
    }

    // ==================== comments ====================

    @Test
    void createComment_withoutContent_isRejected() {
        PrayerInteractionRequest request = new PrayerInteractionRequest(prayer.getId(),
            PrayerInteraction.InteractionType.COMMENT, "   ", null);

        assertThrows(IllegalArgumentException.class, () -> service.createInteraction(alice.getId(), request));
        verify(prayerInteractionRepository, never()).save(any());
    }

    @Test
    void createComment_broadcastsWithoutTheCommentText() {
        when(prayerInteractionRepository.save(any(PrayerInteraction.class))).thenAnswer(inv -> inv.getArgument(0));
        PrayerInteractionRequest request = new PrayerInteractionRequest(prayer.getId(),
            PrayerInteraction.InteractionType.COMMENT, "Praying for you both", null);

        service.createInteraction(alice.getId(), request);

        ArgumentCaptor<Object> payload = ArgumentCaptor.forClass(Object.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/prayers/" + prayer.getId() + "/interactions"), payload.capture());
        PrayerNotificationEvent event = (PrayerNotificationEvent) payload.getValue();
        assertEquals("prayer_comment", event.getEventType());
        PrayerNotificationEvent.PrayerInteractionMetadata metadata =
            (PrayerNotificationEvent.PrayerInteractionMetadata) event.getMetadata();
        assertEquals("COMMENT", metadata.getInteractionType());
        assertNull(metadata.getContent(), "comment text is fetched via the tenant-checked API, never broadcast");
    }

    @Test
    void createReply_toCommentOnDifferentPrayer_isRejected() {
        PrayerRequest otherPrayer = new PrayerRequest();
        otherPrayer.setId(UUID.randomUUID());
        otherPrayer.setUser(owner);
        otherPrayer.setOrganization(graceChurch);
        PrayerInteraction parent = interaction(owner, PrayerInteraction.InteractionType.COMMENT, "first");
        parent.setPrayerRequest(otherPrayer);
        when(prayerInteractionRepository.findById(parent.getId())).thenReturn(Optional.of(parent));

        PrayerInteractionRequest request = new PrayerInteractionRequest(prayer.getId(),
            PrayerInteraction.InteractionType.COMMENT, "reply", parent.getId());

        assertThrows(IllegalArgumentException.class, () -> service.createInteraction(alice.getId(), request));
    }

    @Test
    void deleteInteraction_byNonOwner_isForbidden() {
        PrayerInteraction comment = interaction(alice, PrayerInteraction.InteractionType.COMMENT, "hi");
        when(prayerInteractionRepository.findById(comment.getId())).thenReturn(Optional.of(comment));

        assertThrows(PrayerAccessDeniedException.class, () -> service.deleteInteraction(comment.getId(), owner.getId()));
        verify(prayerInteractionRepository, never()).delete(any());
    }

    @Test
    void deleteInteraction_missing_isNotFound() {
        UUID missing = UUID.randomUUID();
        when(prayerInteractionRepository.findById(missing)).thenReturn(Optional.empty());

        assertThrows(PrayerNotFoundException.class, () -> service.deleteInteraction(missing, alice.getId()));
    }

    // ==================== comments received (profile tab) ====================

    @Test
    void commentsReceived_forSelf_includesAnonymousPrayers() {
        when(prayerInteractionRepository.findCommentsReceivedByUserId(eq(owner.getId()), eq(true), any(Pageable.class)))
            .thenReturn(Page.empty(PageRequest.of(0, 20)));

        service.getCommentsReceivedByUser(owner.getId(), owner.getId(), 0, 20);

        verify(prayerInteractionRepository).findCommentsReceivedByUserId(eq(owner.getId()), eq(true), any(Pageable.class));
    }

    @Test
    void commentsReceived_forSomeoneElseInChurch_hidesAnonymousPrayers() {
        when(prayerInteractionRepository.findCommentsReceivedByUserId(eq(owner.getId()), eq(false), any(Pageable.class)))
            .thenReturn(Page.empty(PageRequest.of(0, 20)));

        service.getCommentsReceivedByUser(owner.getId(), alice.getId(), 0, 20);

        verify(prayerInteractionRepository).findCommentsReceivedByUserId(eq(owner.getId()), eq(false), any(Pageable.class));
    }

    @Test
    void commentsReceived_fromAnotherChurch_isForbidden() {
        assertThrows(PrayerAccessDeniedException.class,
            () -> service.getCommentsReceivedByUser(owner.getId(), stranger.getId(), 0, 20));
        assertThrows(PrayerAccessDeniedException.class,
            () -> service.getCommentsReceivedCount(owner.getId(), stranger.getId()));

        verify(prayerInteractionRepository, never()).findCommentsReceivedByUserId(any(), anyBoolean(), any());
    }

    // ==================== dashboard ====================

    @Test
    void recentInteractions_withoutChurch_isEmptyAndSkipsQuery() {
        User churchless = member("Nobody", null);
        when(userRepository.findById(churchless.getId())).thenReturn(Optional.of(churchless));

        List<PrayerInteractionResponse> recent = service.getRecentInteractionsForDashboard(churchless.getId(), 10);

        assertTrue(recent.isEmpty());
        verify(prayerInteractionRepository, never()).findRecentByOrganizationId(any(), any(), any());
    }

    @Test
    void recentInteractions_isScopedToViewersChurch_andClampsLimit() {
        when(prayerInteractionRepository.findRecentByOrganizationId(eq(graceChurch.getId()), any(), any(Pageable.class)))
            .thenReturn(List.of());

        service.getRecentInteractionsForDashboard(alice.getId(), 500);

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(prayerInteractionRepository).findRecentByOrganizationId(eq(graceChurch.getId()), any(), pageable.capture());
        assertEquals(50, pageable.getValue().getPageSize());
    }

    // ==================== batched summaries ====================

    @Test
    void interactionSummaries_buildsPerPrayerCountsFromTwoGroupedQueries() {
        UUID prayerA = UUID.randomUUID();
        UUID prayerB = UUID.randomUUID();
        UUID prayerC = UUID.randomUUID(); // no interactions at all

        when(prayerInteractionRepository.getInteractionCountsByTypeForPrayers(anyCollection())).thenReturn(List.of(
            new Object[]{prayerA, PrayerInteraction.InteractionType.PRAY, 3L},
            new Object[]{prayerA, PrayerInteraction.InteractionType.COMMENT, 2L},
            new Object[]{prayerB, PrayerInteraction.InteractionType.AMEN, 1L}
        ));
        when(prayerInteractionRepository.countDistinctUsersForPrayers(anyCollection())).thenReturn(List.of(
            new Object[]{prayerA, 4L},
            new Object[]{prayerB, 1L}
        ));

        Map<UUID, PrayerInteractionSummary> summaries = service.getInteractionSummaries(List.of(prayerA, prayerB, prayerC));

        assertEquals(3, summaries.size());

        PrayerInteractionSummary a = summaries.get(prayerA);
        assertEquals(5, a.getTotalInteractions());
        assertEquals(2, a.getTotalComments());
        assertEquals(4, a.getUniqueParticipants());
        assertEquals(3L, a.getInteractionCount(PrayerInteraction.InteractionType.PRAY));
        assertEquals(0L, a.getInteractionCount(PrayerInteraction.InteractionType.HEART));

        PrayerInteractionSummary b = summaries.get(prayerB);
        assertEquals(1, b.getTotalInteractions());
        assertEquals(0, b.getTotalComments());
        assertEquals(1, b.getUniqueParticipants());

        PrayerInteractionSummary c = summaries.get(prayerC);
        assertEquals(0, c.getTotalInteractions());
        assertEquals(0, c.getUniqueParticipants());

        // Exactly one round trip per grouped query, regardless of page size
        verify(prayerInteractionRepository).getInteractionCountsByTypeForPrayers(anyCollection());
        verify(prayerInteractionRepository).countDistinctUsersForPrayers(anyCollection());
        verify(prayerInteractionRepository, never()).countByPrayerRequestId(any());
    }

    @Test
    void interactionSummaries_withNoIds_skipsTheDatabase() {
        assertTrue(service.getInteractionSummaries(List.of()).isEmpty());

        verify(prayerInteractionRepository, never()).getInteractionCountsByTypeForPrayers(anyCollection());
    }

    @Test
    void singleSummary_forViewer_runsChurchCheck() {
        assertThrows(PrayerAccessDeniedException.class,
            () -> service.getInteractionSummary(prayer.getId(), stranger.getId()));
    }

    // ==================== helpers ====================

    private PrayerInteractionRequest reaction(PrayerInteraction.InteractionType type) {
        return new PrayerInteractionRequest(prayer.getId(), type, null, null);
    }

    private PrayerInteraction interaction(User user, PrayerInteraction.InteractionType type, String content) {
        PrayerInteraction interaction = new PrayerInteraction();
        interaction.setId(UUID.randomUUID());
        interaction.setPrayerRequest(prayer);
        interaction.setUser(user);
        interaction.setType(type);
        interaction.setContent(content);
        return interaction;
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
