package com.churchapp;

import com.churchapp.entity.Organization;
import com.churchapp.repository.AnnouncementRepository;
import com.churchapp.repository.DonationRepository;
import com.churchapp.repository.DonationSubscriptionRepository;
import com.churchapp.repository.EventBringClaimRepository;
import com.churchapp.repository.EventBringItemRepository;
import com.churchapp.repository.EventRepository;
import com.churchapp.repository.EventRsvpRepository;
import com.churchapp.repository.GroupRepository;
import com.churchapp.repository.OrganizationRepository;
import com.churchapp.repository.PostRepository;
import com.churchapp.repository.PrayerInteractionRepository;
import com.churchapp.repository.PrayerRequestRepository;
import com.churchapp.repository.UserOrganizationHistoryRepository;
import com.churchapp.repository.UserOrganizationMembershipRepository;
import com.churchapp.repository.UserRepository;
import com.churchapp.service.EmailService;
import com.churchapp.service.OrganizationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class OrganizationServiceTest {

    @Mock private OrganizationRepository organizationRepository;
    @Mock private UserOrganizationMembershipRepository membershipRepository;
    @Mock private UserOrganizationHistoryRepository historyRepository;
    @Mock private UserRepository userRepository;
    @Mock private PostRepository postRepository;
    @Mock private PrayerRequestRepository prayerRequestRepository;
    @Mock private PrayerInteractionRepository prayerInteractionRepository;
    @Mock private EventRepository eventRepository;
    @Mock private EventRsvpRepository eventRsvpRepository;
    @Mock private EventBringItemRepository eventBringItemRepository;
    @Mock private EventBringClaimRepository eventBringClaimRepository;
    @Mock private AnnouncementRepository announcementRepository;
    @Mock private DonationRepository donationRepository;
    @Mock private DonationSubscriptionRepository donationSubscriptionRepository;
    @Mock private GroupRepository groupRepository;
    @Mock private EmailService emailService;

    @InjectMocks
    private OrganizationService organizationService;

    @Test
    void updateOrganization_preservesMetadata_whenNoMetadataProvided() {
        UUID orgId = UUID.randomUUID();
        Organization existing = new Organization();
        existing.setId(orgId);
        existing.setName("Original");
        existing.setMetadata(new HashMap<>(Map.of(
            "bankingReviewStatus", "PENDING_CONTACT",
            "adminContactEmail", "admin@example.com"
        )));

        Organization updates = new Organization();
        updates.setName("Updated Name");
        updates.setMetadata(new HashMap<>());

        when(organizationRepository.findActiveById(orgId)).thenReturn(Optional.of(existing));
        when(organizationRepository.save(any(Organization.class))).thenAnswer(inv -> inv.getArgument(0));

        Organization saved = organizationService.updateOrganization(orgId, updates);

        assertEquals("Updated Name", saved.getName());
        assertEquals("PENDING_CONTACT", saved.getMetadata().get("bankingReviewStatus"));
        assertEquals("admin@example.com", saved.getMetadata().get("adminContactEmail"));
    }

    @Test
    void updateOrganization_mergesMetadata_whenMetadataProvided() {
        UUID orgId = UUID.randomUUID();
        Organization existing = new Organization();
        existing.setId(orgId);
        existing.setMetadata(new HashMap<>(Map.of(
            "bankingReviewStatus", "PENDING_CONTACT",
            "adminContactEmail", "admin@example.com"
        )));

        Organization updates = new Organization();
        updates.setMetadata(new HashMap<>(Map.of(
            "adminContactPhone", "555-1212"
        )));

        when(organizationRepository.findActiveById(orgId)).thenReturn(Optional.of(existing));
        when(organizationRepository.save(any(Organization.class))).thenAnswer(inv -> inv.getArgument(0));

        Organization saved = organizationService.updateOrganization(orgId, updates);

        assertEquals("PENDING_CONTACT", saved.getMetadata().get("bankingReviewStatus"));
        assertEquals("admin@example.com", saved.getMetadata().get("adminContactEmail"));
        assertEquals("555-1212", saved.getMetadata().get("adminContactPhone"));
    }

    @Test
    void markBankingReviewClicked_setsDismissedTimestamp_andUpdatesStatus() {
        UUID orgId = UUID.randomUUID();
        Organization existing = new Organization();
        existing.setId(orgId);
        existing.setCreatedAt(LocalDateTime.now().minusDays(1));
        existing.setMetadata(new HashMap<>(Map.of(
            "bankingReviewStatus", "PENDING_CONTACT",
            "bankingQueueEnteredAt", LocalDateTime.now().minusDays(1).toString()
        )));

        when(organizationRepository.findActiveById(orgId)).thenReturn(Optional.of(existing));
        when(organizationRepository.save(any(Organization.class))).thenAnswer(inv -> inv.getArgument(0));

        Organization saved = organizationService.markBankingReviewClicked(orgId);

        assertEquals("CONTACT_INITIATED", saved.getMetadata().get("bankingReviewStatus"));
        assertNotNull(saved.getMetadata().get("bankingQueueDismissedAt"));
        assertTrue(saved.getMetadata().containsKey("bankingQueueEnteredAt"));
        assertNotNull(saved.getUpdatedAt());
    }
}
