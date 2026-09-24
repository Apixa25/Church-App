package com.churchapp;

import com.churchapp.dto.ChatGroupRequest;
import com.churchapp.dto.ChatGroupResponse;
import com.churchapp.dto.MessageRequest;
import com.churchapp.entity.ChatGroup;
import com.churchapp.entity.ChatGroupMember;
import com.churchapp.entity.Message;
import com.churchapp.entity.Organization;
import com.churchapp.entity.User;
import com.churchapp.exception.ChatAccessDeniedException;
import com.churchapp.exception.ChatNotFoundException;
import com.churchapp.repository.ChatGroupMemberRepository;
import com.churchapp.repository.ChatGroupRepository;
import com.churchapp.repository.MessageRepository;
import com.churchapp.repository.OrganizationRepository;
import com.churchapp.repository.UserOrganizationMembershipRepository;
import com.churchapp.repository.UserRepository;
import com.churchapp.service.ChatPresenceService;
import com.churchapp.service.ChatService;
import com.churchapp.service.MediaUrlService;
import com.churchapp.service.NotificationService;
import com.churchapp.service.UserBlockService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the chat authorization rules that were hardened in the "Chat Quality Hardening" pass:
 * organization scoping, block enforcement, delete permissions and DM de-duplication.
 */
@ExtendWith(MockitoExtension.class)
class ChatServiceTest {

    @Mock private ChatGroupRepository chatGroupRepository;
    @Mock private ChatGroupMemberRepository chatGroupMemberRepository;
    @Mock private MessageRepository messageRepository;
    @Mock private UserRepository userRepository;
    @Mock private OrganizationRepository organizationRepository;
    @Mock private UserOrganizationMembershipRepository userOrganizationMembershipRepository;
    @Mock private UserBlockService userBlockService;
    @Mock private ChatPresenceService chatPresenceService;
    @Mock private SimpMessagingTemplate messagingTemplate;
    @Mock private MediaUrlService mediaUrlService;
    @Mock private NotificationService notificationService;

    @InjectMocks
    private ChatService chatService;

    private User alice;
    private User bob;
    private Organization church;

    @BeforeEach
    void setUp() {
        church = new Organization();
        church.setId(UUID.randomUUID());
        church.setName("Grace Church");

        alice = user("alice@example.com", "Alice");
        bob = user("bob@example.com", "Bob");

        lenient().when(userRepository.findByEmail(alice.getEmail())).thenReturn(Optional.of(alice));
        lenient().when(userRepository.findByEmail(bob.getEmail())).thenReturn(Optional.of(bob));
        lenient().when(userRepository.findById(bob.getId())).thenReturn(Optional.of(bob));

        // Saves echo the entity back so the service can keep working with it
        lenient().when(chatGroupRepository.save(any(ChatGroup.class))).thenAnswer(inv -> {
            ChatGroup g = inv.getArgument(0);
            if (g.getId() == null) g.setId(UUID.randomUUID());
            return g;
        });
        lenient().when(chatGroupMemberRepository.save(any(ChatGroupMember.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(messageRepository.save(any(Message.class))).thenAnswer(inv -> {
            Message m = inv.getArgument(0);
            if (m.getId() == null) m.setId(UUID.randomUUID());
            return m;
        });
        lenient().when(chatGroupMemberRepository.findOtherActiveMembersForGroups(anyCollection(), any(User.class)))
            .thenReturn(List.of());
    }

    // ==================== Organization scoping ====================

    @Test
    void createChatGroup_usesChurchPrimaryOrganizationWhenNoneRequested() {
        alice.setChurchPrimaryOrganization(church);
        ChatGroupRequest request = groupRequest("Youth Group", ChatGroup.GroupType.YOUTH, null);

        ChatGroupResponse response = chatService.createChatGroup(alice.getEmail(), request);

        assertEquals(church.getId(), response.getOrganizationId());
        ArgumentCaptor<ChatGroup> saved = ArgumentCaptor.forClass(ChatGroup.class);
        verify(chatGroupRepository).save(saved.capture());
        assertEquals(church, saved.getValue().getOrganization());
    }

    @Test
    void createChatGroup_rejectsOrganizationTheUserDoesNotBelongTo() {
        UUID otherOrgId = UUID.randomUUID();
        when(userOrganizationMembershipRepository.existsByUserIdAndOrganizationId(alice.getId(), otherOrgId))
            .thenReturn(false);
        ChatGroupRequest request = groupRequest("Sneaky Group", ChatGroup.GroupType.STUDY, otherOrgId);

        assertThrows(ChatAccessDeniedException.class,
            () -> chatService.createChatGroup(alice.getEmail(), request));
        verify(chatGroupRepository, never()).save(any());
    }

    @Test
    void createChatGroup_fallsBackToGlobalOrganizationWhenUserHasNone() {
        Organization global = new Organization();
        global.setId(UUID.fromString("00000000-0000-0000-0000-000000000001"));
        global.setName("The Gathering");
        when(organizationRepository.findById(global.getId())).thenReturn(Optional.of(global));

        ChatGroupResponse response = chatService.createChatGroup(
            alice.getEmail(), groupRequest("Open Prayer", ChatGroup.GroupType.PRAYER, null));

        assertEquals(global.getId(), response.getOrganizationId());
    }

    @Test
    void joinChatGroup_rejectsUsersOutsideTheGroupsOrganization() {
        ChatGroup group = group("Grace Men", ChatGroup.GroupType.MENS, church, bob);
        when(chatGroupRepository.findById(group.getId())).thenReturn(Optional.of(group));
        when(userOrganizationMembershipRepository.existsByUserIdAndOrganizationId(alice.getId(), church.getId()))
            .thenReturn(false);

        assertThrows(ChatAccessDeniedException.class,
            () -> chatService.joinChatGroup(alice.getEmail(), group.getId()));
        verify(chatGroupMemberRepository, never()).save(any());
    }

    @Test
    void joinChatGroup_allowsOrganizationMembers() {
        ChatGroup group = group("Grace Men", ChatGroup.GroupType.MENS, church, bob);
        when(chatGroupRepository.findById(group.getId())).thenReturn(Optional.of(group));
        when(userOrganizationMembershipRepository.existsByUserIdAndOrganizationId(alice.getId(), church.getId()))
            .thenReturn(true);
        when(chatGroupMemberRepository.countActiveMembersByChatGroup(group)).thenReturn(1L);
        when(chatGroupMemberRepository.findByUserAndChatGroup(alice, group)).thenReturn(Optional.empty());

        ChatGroupResponse response = chatService.joinChatGroup(alice.getEmail(), group.getId());

        assertEquals(2L, response.getMemberCount());
        verify(chatGroupMemberRepository).save(any(ChatGroupMember.class));
    }

    @Test
    void joinChatGroup_neverAllowsJoiningSomeoneElsesDirectMessage() {
        ChatGroup dm = group("Bob & Carol", ChatGroup.GroupType.DIRECT_MESSAGE, null, bob);
        when(chatGroupRepository.findById(dm.getId())).thenReturn(Optional.of(dm));

        assertThrows(ChatAccessDeniedException.class,
            () -> chatService.joinChatGroup(alice.getEmail(), dm.getId()));
    }

    // ==================== Block enforcement ====================

    @Test
    void createOrGetDirectMessage_rejectsWhenRequesterBlockedTarget() {
        when(userBlockService.isBlocked(alice.getId(), bob.getId())).thenReturn(true);

        assertThrows(ChatAccessDeniedException.class,
            () -> chatService.createOrGetDirectMessageByUserId(alice.getEmail(), bob.getId()));
        verify(chatGroupRepository, never()).save(any());
    }

    @Test
    void createOrGetDirectMessage_rejectsWhenTargetBlockedRequester() {
        when(userBlockService.isBlocked(alice.getId(), bob.getId())).thenReturn(false);
        when(userBlockService.isBlocked(bob.getId(), alice.getId())).thenReturn(true);

        assertThrows(ChatAccessDeniedException.class,
            () -> chatService.createOrGetDirectMessage(alice.getEmail(), bob.getEmail()));
        verify(chatGroupRepository, never()).save(any());
    }

    @Test
    void createOrGetDirectMessage_rejectsDeactivatedAccounts() {
        bob.setIsActive(false);

        assertThrows(ChatNotFoundException.class,
            () -> chatService.createOrGetDirectMessageByUserId(alice.getEmail(), bob.getId()));
    }

    @Test
    void sendMessage_inDirectMessage_rejectsWhenBlocked() {
        ChatGroup dm = group("Alice & Bob", ChatGroup.GroupType.DIRECT_MESSAGE, null, alice);
        ChatGroupMember aliceMembership = member(alice, dm, ChatGroupMember.MemberRole.MEMBER);
        ChatGroupMember bobMembership = member(bob, dm, ChatGroupMember.MemberRole.MEMBER);
        when(chatGroupRepository.findById(dm.getId())).thenReturn(Optional.of(dm));
        when(chatGroupMemberRepository.findByUserAndChatGroupAndIsActiveTrue(alice, dm))
            .thenReturn(Optional.of(aliceMembership));
        when(chatGroupMemberRepository.findActiveMembersWithUsers(dm)).thenReturn(List.of(aliceMembership, bobMembership));
        when(userBlockService.isBlocked(alice.getId(), bob.getId())).thenReturn(false);
        when(userBlockService.isBlocked(bob.getId(), alice.getId())).thenReturn(true);

        assertThrows(ChatAccessDeniedException.class,
            () -> chatService.sendMessage(alice.getEmail(), textMessage(dm, "hi")));
        verify(messageRepository, never()).save(any());
    }

    @Test
    void sendMessage_rejectsMutedMembers() {
        ChatGroup group = group("Grace Men", ChatGroup.GroupType.MENS, church, bob);
        ChatGroupMember muted = member(alice, group, ChatGroupMember.MemberRole.MEMBER);
        muted.setIsMuted(true);
        when(chatGroupRepository.findById(group.getId())).thenReturn(Optional.of(group));
        when(chatGroupMemberRepository.findByUserAndChatGroupAndIsActiveTrue(alice, group))
            .thenReturn(Optional.of(muted));

        ChatAccessDeniedException ex = assertThrows(ChatAccessDeniedException.class,
            () -> chatService.sendMessage(alice.getEmail(), textMessage(group, "hello")));
        assertTrue(ex.getMessage().toLowerCase().contains("muted"));
    }

    // ==================== DM de-duplication ====================

    @Test
    void createOrGetDirectMessage_returnsExistingConversationInsteadOfCreatingAnother() {
        ChatGroup existing = group("Alice & Bob", ChatGroup.GroupType.DIRECT_MESSAGE, null, alice);
        ChatGroupMember aliceMembership = member(alice, existing, ChatGroupMember.MemberRole.MEMBER);
        when(chatGroupRepository.findDirectMessageBetweenUsers(alice, bob)).thenReturn(List.of(existing));
        when(chatGroupMemberRepository.findByUserAndChatGroupAndIsActiveTrue(alice, existing))
            .thenReturn(Optional.of(aliceMembership));
        when(messageRepository.countUnreadMessagesForUserInGroup(alice, existing)).thenReturn(3L);

        ChatGroupResponse response = chatService.createOrGetDirectMessageByUserId(alice.getEmail(), bob.getId());

        assertEquals(existing.getId(), response.getId());
        assertEquals(3L, response.getUnreadCount());
        assertTrue(response.getIsMember());
        verify(chatGroupRepository, never()).save(any());
    }

    @Test
    void createOrGetDirectMessage_createsConversationWithBothMembers() {
        when(chatGroupRepository.findDirectMessageBetweenUsers(alice, bob)).thenReturn(List.of());

        ChatGroupResponse response = chatService.createOrGetDirectMessageByUserId(alice.getEmail(), bob.getId());

        assertEquals(ChatGroup.GroupType.DIRECT_MESSAGE, response.getType());
        assertEquals(2L, response.getMemberCount());
        assertEquals(1, response.getRecentMembers().size());
        assertEquals(bob.getId(), response.getRecentMembers().get(0).getUserId());
        verify(chatGroupMemberRepository, org.mockito.Mockito.times(2)).save(any(ChatGroupMember.class));
    }

    // ==================== Delete permissions ====================

    @Test
    void deleteMessage_deniesMembersWhoAreNeitherAuthorNorModerator() {
        ChatGroup group = group("Grace Men", ChatGroup.GroupType.MENS, church, bob);
        Message bobsMessage = savedMessage(group, bob, "mine");
        when(messageRepository.findById(bobsMessage.getId())).thenReturn(Optional.of(bobsMessage));
        when(chatGroupMemberRepository.findByUserAndChatGroupAndIsActiveTrue(alice, group))
            .thenReturn(Optional.of(member(alice, group, ChatGroupMember.MemberRole.MEMBER)));

        assertThrows(ChatAccessDeniedException.class,
            () -> chatService.deleteMessage(alice.getEmail(), bobsMessage.getId()));
        assertFalse(bobsMessage.getIsDeleted());
    }

    @Test
    void deleteMessage_allowsGroupModerators() {
        ChatGroup group = group("Grace Men", ChatGroup.GroupType.MENS, church, bob);
        Message bobsMessage = savedMessage(group, bob, "mine");
        when(messageRepository.findById(bobsMessage.getId())).thenReturn(Optional.of(bobsMessage));
        when(chatGroupMemberRepository.findByUserAndChatGroupAndIsActiveTrue(alice, group))
            .thenReturn(Optional.of(member(alice, group, ChatGroupMember.MemberRole.MODERATOR)));

        chatService.deleteMessage(alice.getEmail(), bobsMessage.getId());

        assertTrue(bobsMessage.getIsDeleted());
        assertEquals(alice.getId(), bobsMessage.getDeletedBy());
        verify(messagingTemplate).convertAndSend(eq("/topic/group/" + group.getId() + "/messages"), any(Object.class));
    }

    @Test
    void deleteMessage_allowsTheAuthor() {
        ChatGroup group = group("Grace Men", ChatGroup.GroupType.MENS, church, bob);
        Message bobsMessage = savedMessage(group, bob, "mine");
        when(messageRepository.findById(bobsMessage.getId())).thenReturn(Optional.of(bobsMessage));

        chatService.deleteMessage(bob.getEmail(), bobsMessage.getId());

        assertTrue(bobsMessage.getIsDeleted());
        verify(chatGroupMemberRepository, never()).findByUserAndChatGroupAndIsActiveTrue(any(), any());
    }

    // ==================== helpers ====================

    private static User user(String email, String name) {
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setEmail(email);
        u.setName(name);
        u.setRole(User.Role.USER);
        u.setIsActive(true);
        return u;
    }

    private static ChatGroup group(String name, ChatGroup.GroupType type, Organization organization, User creator) {
        ChatGroup g = new ChatGroup();
        g.setId(UUID.randomUUID());
        g.setName(name);
        g.setType(type);
        g.setOrganization(organization);
        g.setCreatedBy(creator);
        g.setIsActive(true);
        g.setIsPrivate(type == ChatGroup.GroupType.DIRECT_MESSAGE);
        return g;
    }

    private static ChatGroupMember member(User user, ChatGroup group, ChatGroupMember.MemberRole role) {
        ChatGroupMember m = new ChatGroupMember();
        m.setId(UUID.randomUUID());
        m.setUser(user);
        m.setChatGroup(group);
        m.setMemberRole(role);
        m.setIsActive(true);
        return m;
    }

    private static Message savedMessage(ChatGroup group, User author, String content) {
        Message m = Message.createTextMessage(group, author, content);
        m.setId(UUID.randomUUID());
        return m;
    }

    private static ChatGroupRequest groupRequest(String name, ChatGroup.GroupType type, UUID organizationId) {
        ChatGroupRequest r = new ChatGroupRequest();
        r.setName(name);
        r.setType(type);
        r.setOrganizationId(organizationId);
        return r;
    }

    private static MessageRequest textMessage(ChatGroup group, String content) {
        MessageRequest r = new MessageRequest();
        r.setChatGroupId(group.getId());
        r.setContent(content);
        r.setMessageType(Message.MessageType.TEXT);
        return r;
    }
}
