package com.churchapp;

import com.churchapp.entity.ChatGroup;
import com.churchapp.entity.MarketplaceListing;
import com.churchapp.entity.Message;
import com.churchapp.entity.Organization;
import com.churchapp.entity.Post;
import com.churchapp.entity.User;
import com.churchapp.repository.ContentReportRepository;
import com.churchapp.repository.MarketplaceListingRepository;
import com.churchapp.repository.MessageRepository;
import com.churchapp.repository.PostBookmarkRepository;
import com.churchapp.repository.PostCommentRepository;
import com.churchapp.repository.PostLikeRepository;
import com.churchapp.repository.PostRepository;
import com.churchapp.repository.PostShareRepository;
import com.churchapp.repository.UserRepository;
import com.churchapp.service.AdminAuthorizationService;
import com.churchapp.service.AuditLogService;
import com.churchapp.service.ContentModerationService;
import com.churchapp.service.PrayerRequestService;
import com.churchapp.service.UserManagementService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * A church moderator may only act on posts, listings, messages and prayers that
 * live in a church they moderate. Platform admins/moderators are unrestricted.
 */
@ExtendWith(MockitoExtension.class)
class ContentModerationScopeTest {

    @Mock private AuditLogService auditLogService;
    @Mock private ContentReportRepository contentReportRepository;
    @Mock private PostRepository postRepository;
    @Mock private PostCommentRepository postCommentRepository;
    @Mock private PostLikeRepository postLikeRepository;
    @Mock private PostBookmarkRepository postBookmarkRepository;
    @Mock private PostShareRepository postShareRepository;
    @Mock private MarketplaceListingRepository marketplaceListingRepository;
    @Mock private MessageRepository messageRepository;
    @Mock private UserRepository userRepository;
    @Mock private UserManagementService userManagementService;
    @Mock private PrayerRequestService prayerRequestService;
    @Mock private AdminAuthorizationService adminAuthorizationService;

    private ContentModerationService service;

    private Organization graceChurch;
    private Organization otherChurch;
    private User churchModerator;

    @BeforeEach
    void setUp() {
        service = new ContentModerationService(
            auditLogService, contentReportRepository, postRepository, postCommentRepository,
            postLikeRepository, postBookmarkRepository, postShareRepository, marketplaceListingRepository,
            messageRepository, userRepository, userManagementService, prayerRequestService,
            adminAuthorizationService);

        graceChurch = organization("Grace Church");
        otherChurch = organization("Other Church");

        churchModerator = new User();
        churchModerator.setId(UUID.randomUUID());
        churchModerator.setRole(User.Role.USER);
        churchModerator.setChurchPrimaryOrganization(graceChurch);
    }

    @Test
    void post_inAnotherChurch_isDeniedForChurchModerator() {
        Post post = new Post();
        post.setId(UUID.randomUUID());
        post.setOrganization(otherChurch);
        when(postRepository.findById(post.getId())).thenReturn(Optional.of(post));
        when(adminAuthorizationService.canModerateOrg(churchModerator, otherChurch.getId())).thenReturn(false);

        assertThrows(AccessDeniedException.class,
            () -> service.assertModeratorMayActOn("POST", post.getId(), churchModerator));
    }

    @Test
    void post_inOwnChurch_isAllowedForChurchModerator() {
        Post post = new Post();
        post.setId(UUID.randomUUID());
        post.setOrganization(graceChurch);
        when(postRepository.findById(post.getId())).thenReturn(Optional.of(post));
        when(adminAuthorizationService.canModerateOrg(churchModerator, graceChurch.getId())).thenReturn(true);

        assertDoesNotThrow(() -> service.assertModeratorMayActOn("post", post.getId(), churchModerator));
    }

    @Test
    void platformAdmin_isNeverScoped() {
        User platformAdmin = new User();
        platformAdmin.setId(UUID.randomUUID());
        platformAdmin.setRole(User.Role.PLATFORM_ADMIN);

        assertDoesNotThrow(() -> service.assertModeratorMayActOn("POST", UUID.randomUUID(), platformAdmin));
        verify(postRepository, never()).findById(any());
        verify(adminAuthorizationService, never()).canModerateOrg(any(), any());
    }

    @Test
    void marketplaceListing_resolvesItsOrganization() {
        MarketplaceListing listing = new MarketplaceListing();
        listing.setId(UUID.randomUUID());
        listing.setOrganization(otherChurch);
        when(marketplaceListingRepository.findById(listing.getId())).thenReturn(Optional.of(listing));

        assertEquals(otherChurch.getId(), service.getContentOrganizationId("MARKETPLACE", listing.getId()));
    }

    @Test
    void message_resolvesOrganizationThroughItsChatGroup() {
        ChatGroup group = new ChatGroup();
        group.setId(UUID.randomUUID());
        group.setOrganization(graceChurch);
        Message message = new Message();
        message.setId(UUID.randomUUID());
        message.setChatGroup(group);
        when(messageRepository.findById(message.getId())).thenReturn(Optional.of(message));

        assertEquals(graceChurch.getId(), service.getContentOrganizationId("MESSAGE", message.getId()));
    }

    @Test
    void prayer_resolvesThroughPrayerService() {
        UUID prayerId = UUID.randomUUID();
        when(prayerRequestService.findOrganizationId(prayerId)).thenReturn(Optional.of(graceChurch.getId()));

        assertEquals(graceChurch.getId(), service.getContentOrganizationId("PRAYER", prayerId));
    }

    @Test
    void unknownOrMissingContent_isLeftToTheTypeHandler() {
        UUID missing = UUID.randomUUID();
        when(postRepository.findById(missing)).thenReturn(Optional.empty());

        assertNull(service.getContentOrganizationId("POST", missing));
        assertNull(service.getContentOrganizationId("USER", missing));
        assertDoesNotThrow(() -> service.assertModeratorMayActOn("POST", missing, churchModerator));
        verify(adminAuthorizationService, never()).canModerateOrg(any(), any());
    }

    private static Organization organization(String name) {
        Organization organization = new Organization();
        organization.setId(UUID.randomUUID());
        organization.setName(name);
        return organization;
    }
}
