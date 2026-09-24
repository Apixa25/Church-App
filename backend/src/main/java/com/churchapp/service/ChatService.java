package com.churchapp.service;

import com.churchapp.dto.*;
import com.churchapp.entity.ChatGroup;
import com.churchapp.entity.ChatGroupMember;
import com.churchapp.entity.Message;
import com.churchapp.entity.Organization;
import com.churchapp.entity.User;
import com.churchapp.exception.ChatAccessDeniedException;
import com.churchapp.exception.ChatNotFoundException;
import com.churchapp.exception.ChatValidationException;
import com.churchapp.repository.ChatGroupRepository;
import com.churchapp.repository.ChatGroupMemberRepository;
import com.churchapp.repository.MessageRepository;
import com.churchapp.repository.OrganizationRepository;
import com.churchapp.repository.UserOrganizationMembershipRepository;
import com.churchapp.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class ChatService {

    private static final UUID GLOBAL_ORG_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final int MAX_SEARCH_LIMIT = 100;
    
    private final ChatGroupRepository chatGroupRepository;
    private final ChatGroupMemberRepository chatGroupMemberRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final UserOrganizationMembershipRepository userOrganizationMembershipRepository;
    private final UserBlockService userBlockService;
    private final ChatPresenceService chatPresenceService;
    private final SimpMessagingTemplate messagingTemplate;
    private final MediaUrlService mediaUrlService;
    private final NotificationService notificationService;
    
    // ==================== CHAT GROUP OPERATIONS ====================
    
    @Transactional
    public ChatGroupResponse createChatGroup(String userEmail, ChatGroupRequest request) {
        User user = getUserByEmail(userEmail);
        
        if (!canCreateGroup(user, request.getType())) {
            throw new ChatAccessDeniedException("Insufficient permissions to create this type of group");
        }
        if (request.getType() == ChatGroup.GroupType.DIRECT_MESSAGE) {
            throw new ChatValidationException("Direct messages are started from a person, not created as a group");
        }

        Organization organization = resolveGroupOrganization(user, request.getOrganizationId());
        
        if (request.getType() == ChatGroup.GroupType.MAIN) {
            if (chatGroupRepository.findByNameAndOrganizationIdAndIsActiveTrue(request.getName(), organization.getId()).isPresent()) {
                throw new ChatValidationException("A main chat group with this name already exists in this organization");
            }
        }
        
        ChatGroup chatGroup = new ChatGroup();
        chatGroup.setName(request.getName());
        chatGroup.setType(request.getType());
        chatGroup.setDescription(request.getDescription());
        chatGroup.setImageUrl(request.getImageUrl());
        chatGroup.setCreatedBy(user);
        chatGroup.setOrganization(organization);
        chatGroup.setIsPrivate(Boolean.TRUE.equals(request.getIsPrivate()));
        chatGroup.setMaxMembers(request.getMaxMembers());
        
        chatGroup = chatGroupRepository.save(chatGroup);
        
        ChatGroupMember creatorMember = new ChatGroupMember();
        creatorMember.setUser(user);
        creatorMember.setChatGroup(chatGroup);
        creatorMember.setMemberRole(ChatGroupMember.MemberRole.OWNER);
        chatGroupMemberRepository.save(creatorMember);
        
        createSystemMessage(chatGroup, user, user.getName() + " created the group", null);
        
        return ChatGroupResponse.fromEntity(chatGroup, 1);
    }

    /**
     * Organization context for a new chat group, following the same resolution order as posts and prayers:
     * (1) explicitly requested organization the user belongs to, (2) church primary, (3) family primary,
     * (4) Global Organization fallback.
     */
    private Organization resolveGroupOrganization(User user, UUID requestedOrganizationId) {
        if (requestedOrganizationId != null) {
            boolean allowed = user.getRole() == User.Role.PLATFORM_ADMIN
                || userOrganizationMembershipRepository.existsByUserIdAndOrganizationId(user.getId(), requestedOrganizationId);
            if (!allowed) {
                throw new ChatAccessDeniedException("You can only create chat groups in organizations you belong to");
            }
            return organizationRepository.findById(requestedOrganizationId)
                .orElseThrow(() -> new ChatNotFoundException("Organization not found"));
        }
        if (user.getChurchPrimaryOrganization() != null) {
            return user.getChurchPrimaryOrganization();
        }
        if (user.getFamilyPrimaryOrganization() != null) {
            return user.getFamilyPrimaryOrganization();
        }
        return organizationRepository.findById(GLOBAL_ORG_ID)
            .orElseThrow(() -> new ChatNotFoundException("Global organization not found"));
    }
    
    /**
     * The user's chat list. Runs a fixed handful of queries regardless of how many groups the user is in
     * (memberships+groups, member counts, unread counts, latest messages, DM counterparts).
     */
    @Transactional(readOnly = true)
    public List<ChatGroupResponse> getUserChatGroups(String userEmail) {
        User user = getUserByEmail(userEmail);
        List<ChatGroupMember> memberships = chatGroupMemberRepository.findActiveMembershipsWithGroups(user);
        if (memberships.isEmpty()) {
            return List.of();
        }

        List<UUID> groupIds = memberships.stream().map(m -> m.getChatGroup().getId()).collect(Collectors.toList());
        Map<UUID, Long> memberCounts = toCountMap(chatGroupMemberRepository.countActiveMembersForGroups(groupIds));
        Map<UUID, Long> unreadCounts = toCountMap(messageRepository.countUnreadPerGroupForUser(user));
        Map<UUID, Message> latestMessages = messageRepository.findLatestMessagesForGroups(groupIds).stream()
            .collect(Collectors.toMap(m -> m.getChatGroup().getId(), Function.identity(), (a, b) -> a));

        List<UUID> dmGroupIds = memberships.stream()
            .map(ChatGroupMember::getChatGroup)
            .filter(g -> g.getType() == ChatGroup.GroupType.DIRECT_MESSAGE)
            .map(ChatGroup::getId)
            .collect(Collectors.toList());
        Map<UUID, List<ChatGroupMemberResponse>> dmCounterparts = new HashMap<>();
        if (!dmGroupIds.isEmpty()) {
            for (ChatGroupMember other : chatGroupMemberRepository.findOtherActiveMembersForGroups(dmGroupIds, user)) {
                dmCounterparts.computeIfAbsent(other.getChatGroup().getId(), k -> new ArrayList<>())
                    .add(new ChatGroupMemberResponse(other));
            }
        }

        List<ChatGroupResponse> responses = new ArrayList<>(memberships.size());
        for (ChatGroupMember membership : memberships) {
            ChatGroup group = membership.getChatGroup();
            ChatGroupResponse response = ChatGroupResponse.fromEntityWithUserContext(
                group, true, membership.canPost(), membership.canModerate(),
                membership.getMemberRole().name(), unreadCounts.getOrDefault(group.getId(), 0L));
            response.setMemberCount(memberCounts.getOrDefault(group.getId(), 0L));
            response.setNotificationsEnabled(membership.getNotificationsEnabled());

            Message lastMessage = latestMessages.get(group.getId());
            if (lastMessage != null) {
                response.setLastMessageTime(lastMessage.getTimestamp());
                response.setLastMessage(describeLastMessage(lastMessage));
                if (lastMessage.getUser() != null) {
                    response.setLastMessageBy(lastMessage.getUser().getName());
                }
            }

            if (group.getType() == ChatGroup.GroupType.DIRECT_MESSAGE) {
                response.setRecentMembers(dmCounterparts.getOrDefault(group.getId(), List.of()));
            }
            responses.add(response);
        }

        // Most recent conversation first, like every mainstream messenger
        responses.sort((a, b) -> {
            LocalDateTime ta = a.getLastMessageTime() != null ? a.getLastMessageTime() : a.getCreatedAt();
            LocalDateTime tb = b.getLastMessageTime() != null ? b.getLastMessageTime() : b.getCreatedAt();
            if (ta == null && tb == null) return 0;
            if (ta == null) return 1;
            if (tb == null) return -1;
            return tb.compareTo(ta);
        });
        return responses;
    }

    private String describeLastMessage(Message lastMessage) {
        if (lastMessage.getContent() != null && !lastMessage.getContent().trim().isEmpty()) {
            return lastMessage.getContent();
        }
        switch (lastMessage.getMessageType()) {
            case IMAGE: return "📷 Image";
            case VIDEO: return "🎥 Video";
            case AUDIO: return "🎵 Audio";
            case DOCUMENT: return "📄 Document";
            default: return "Message";
        }
    }

    @Transactional(readOnly = true)
    public long getTotalUnreadCount(String userEmail) {
        User user = getUserByEmail(userEmail);
        return messageRepository.countUnreadForUser(user);
    }
    
    /**
     * Public groups the user can join, limited to organizations the user belongs to.
     * Platform admins see every public group.
     */
    @Transactional(readOnly = true)
    public List<ChatGroupResponse> getJoinableGroups(String userEmail) {
        User user = getUserByEmail(userEmail);
        List<ChatGroup> groups;
        if (user.getRole() == User.Role.PLATFORM_ADMIN) {
            groups = chatGroupRepository.findJoinableGroups(user);
        } else {
            List<UUID> organizationIds = userOrganizationMembershipRepository.findOrganizationIdsByUserId(user.getId());
            if (organizationIds.isEmpty()) {
                return List.of();
            }
            groups = chatGroupRepository.findJoinableGroupsInOrganizations(user, organizationIds);
        }
        if (groups.isEmpty()) {
            return List.of();
        }

        Map<UUID, Long> memberCounts = toCountMap(chatGroupMemberRepository.countActiveMembersForGroups(
            groups.stream().map(ChatGroup::getId).collect(Collectors.toList())));
        
        return groups.stream()
            .map(group -> ChatGroupResponse.fromEntity(group, memberCounts.getOrDefault(group.getId(), 0L)))
            .collect(Collectors.toList());
    }
    
    @Transactional
    public ChatGroupResponse joinChatGroup(String userEmail, UUID groupId) {
        User user = getUserByEmail(userEmail);
        ChatGroup chatGroup = getChatGroupById(groupId);

        if (chatGroup.getType() == ChatGroup.GroupType.DIRECT_MESSAGE) {
            throw new ChatAccessDeniedException("You cannot join someone else's direct message");
        }
        if (!Boolean.TRUE.equals(chatGroup.getIsActive())) {
            throw new ChatNotFoundException("This group is no longer active");
        }
        if (Boolean.TRUE.equals(chatGroup.getIsPrivate()) && !chatGroup.isCreator(user)
                && user.getRole() != User.Role.PLATFORM_ADMIN) {
            throw new ChatAccessDeniedException("This group is private. Ask an admin to add you.");
        }
        if (chatGroup.getOrganization() != null && user.getRole() != User.Role.PLATFORM_ADMIN
                && !userOrganizationMembershipRepository.existsByUserIdAndOrganizationId(user.getId(), chatGroup.getOrganizationId())) {
            throw new ChatAccessDeniedException("This group belongs to an organization you are not a member of");
        }

        long activeMembers = chatGroupMemberRepository.countActiveMembersByChatGroup(chatGroup);
        if (chatGroup.getMaxMembers() != null && activeMembers >= chatGroup.getMaxMembers()) {
            throw new ChatValidationException("This group is full");
        }
        
        ChatGroupMember existingMember = chatGroupMemberRepository.findByUserAndChatGroup(user, chatGroup).orElse(null);
        
        if (existingMember != null) {
            if (existingMember.getIsActive()) {
                throw new ChatValidationException("You are already a member of this group");
            }
            existingMember.setIsActive(true);
            existingMember.setLeftAt(null);
            chatGroupMemberRepository.save(existingMember);
        } else {
            ChatGroupMember member = new ChatGroupMember();
            member.setUser(user);
            member.setChatGroup(chatGroup);
            member.setMemberRole(ChatGroupMember.MemberRole.MEMBER);
            chatGroupMemberRepository.save(member);
        }
        
        createSystemMessage(chatGroup, user, user.getName() + " joined the group", null);
        notifyGroupMembers(chatGroup, "user_joined", user.getName() + " joined the group");
        
        return ChatGroupResponse.fromEntity(chatGroup, activeMembers + 1);
    }
    
    @Transactional
    public void leaveChatGroup(String userEmail, UUID groupId) {
        User user = getUserByEmail(userEmail);
        ChatGroup chatGroup = getChatGroupById(groupId);
        
        ChatGroupMember membership = requireActiveMembership(user, chatGroup);
        
        if (membership.getMemberRole() == ChatGroupMember.MemberRole.OWNER) {
            List<ChatGroupMember> admins = chatGroupMemberRepository
                .findByChatGroupAndMemberRoleAndIsActiveTrue(chatGroup, ChatGroupMember.MemberRole.ADMIN);
            
            if (!admins.isEmpty()) {
                ChatGroupMember newOwner = admins.get(0);
                newOwner.setMemberRole(ChatGroupMember.MemberRole.OWNER);
                chatGroupMemberRepository.save(newOwner);
            } else {
                long memberCount = chatGroupMemberRepository.countActiveMembersByChatGroup(chatGroup);
                if (memberCount <= 1) {
                    chatGroup.setIsActive(false);
                    chatGroupRepository.save(chatGroup);
                }
            }
        }
        
        membership.leave();
        chatGroupMemberRepository.save(membership);
        
        createSystemMessage(chatGroup, user, user.getName() + " left the group", null);
        notifyGroupMembers(chatGroup, "user_left", user.getName() + " left the group");
    }
    
    @Transactional
    public ChatGroupResponse createOrGetDirectMessage(String userEmail, String targetUserEmail) {
        User user = getUserByEmail(userEmail);
        User targetUser = userRepository.findByEmail(targetUserEmail)
            .orElseThrow(() -> new ChatNotFoundException("Target user not found"));

        return createOrGetDirectMessageForUsers(user, targetUser);
    }

    @Transactional
    public ChatGroupResponse createOrGetDirectMessageByUserId(String userEmail, UUID targetUserId) {
        User user = getUserByEmail(userEmail);
        User targetUser = userRepository.findById(targetUserId)
            .orElseThrow(() -> new ChatNotFoundException("Target user not found"));

        return createOrGetDirectMessageForUsers(user, targetUser);
    }

    private ChatGroupResponse createOrGetDirectMessageForUsers(User user, User targetUser) {
        if (user.getId().equals(targetUser.getId())) {
            throw new ChatValidationException("You cannot start a conversation with yourself");
        }
        assertCanDirectMessage(user, targetUser);

        List<ChatGroup> existingDM = chatGroupRepository.findDirectMessageBetweenUsers(user, targetUser);
        
        if (!existingDM.isEmpty()) {
            ChatGroup dmGroup = existingDM.get(0);
            ChatGroupMember membership = chatGroupMemberRepository
                .findByUserAndChatGroupAndIsActiveTrue(user, dmGroup).orElse(null);
            
            boolean isMember = membership != null;
            boolean canPost = isMember && membership.canPost();
            boolean canModerate = isMember && membership.canModerate();
            String userRole = isMember ? membership.getMemberRole().name() : null;
            Long unreadCount = isMember ? messageRepository.countUnreadMessagesForUserInGroup(user, dmGroup) : 0L;
            
            ChatGroupResponse response = ChatGroupResponse.fromEntityWithUserContext(
                dmGroup, isMember, canPost, canModerate, userRole, unreadCount);
            response.setMemberCount(2L);
            response.setRecentMembers(chatGroupMemberRepository.findOtherActiveMembersForGroups(List.of(dmGroup.getId()), user)
                .stream().map(ChatGroupMemberResponse::new).collect(Collectors.toList()));
            return response;
        }
        
        ChatGroup dmGroup = new ChatGroup();
        dmGroup.setName(user.getName() + " & " + targetUser.getName());
        dmGroup.setType(ChatGroup.GroupType.DIRECT_MESSAGE);
        dmGroup.setDescription("Direct message conversation");
        dmGroup.setCreatedBy(user);
        dmGroup.setIsPrivate(true);
        dmGroup.setMaxMembers(2);
        
        dmGroup = chatGroupRepository.save(dmGroup);
        
        ChatGroupMember userMember = new ChatGroupMember();
        userMember.setUser(user);
        userMember.setChatGroup(dmGroup);
        userMember.setMemberRole(ChatGroupMember.MemberRole.MEMBER);
        chatGroupMemberRepository.save(userMember);
        
        ChatGroupMember targetMember = new ChatGroupMember();
        targetMember.setUser(targetUser);
        targetMember.setChatGroup(dmGroup);
        targetMember.setMemberRole(ChatGroupMember.MemberRole.MEMBER);
        chatGroupMemberRepository.save(targetMember);
        
        createSystemMessage(dmGroup, user, "Started a conversation", null);
        
        ChatGroupResponse response = ChatGroupResponse.fromEntityWithUserContext(
            dmGroup, true, true, false, ChatGroupMember.MemberRole.MEMBER.name(), 0L);
        response.setMemberCount(2L);
        response.setRecentMembers(List.of(new ChatGroupMemberResponse(targetMember)));
        return response;
    }

    /**
     * Direct messages are person-to-person and may cross organizations (the "Find People" feature relies on that),
     * so the gate is the block list and account status rather than shared membership.
     */
    private void assertCanDirectMessage(User user, User targetUser) {
        if (targetUser.getDeletedAt() != null || !Boolean.TRUE.equals(targetUser.getIsActive()) || targetUser.isBanned()) {
            throw new ChatNotFoundException("This person is not available for messaging");
        }
        if (userBlockService.isBlocked(user.getId(), targetUser.getId())) {
            throw new ChatAccessDeniedException("You have blocked this person. Unblock them to start a conversation.");
        }
        if (userBlockService.isBlocked(targetUser.getId(), user.getId())) {
            throw new ChatAccessDeniedException("You cannot message this person");
        }
    }
    
    // ==================== MESSAGE OPERATIONS ====================
    
    @Transactional
    public MessageResponse sendMessage(String userEmail, MessageRequest request) {
        User user = getUserByEmail(userEmail);
        ChatGroup chatGroup = getChatGroupById(request.getChatGroupId());
        
        ChatGroupMember membership = requireActiveMembership(user, chatGroup);
        
        if (!membership.canPost()) {
            throw new ChatAccessDeniedException(Boolean.TRUE.equals(membership.getIsMuted())
                ? "You have been muted in this group"
                : "You cannot post in this group");
        }
        
        if (request.getMessageType() == null) {
            request.setMessageType(Message.MessageType.TEXT);
        }
        if (request.getMessageType() == Message.MessageType.SYSTEM) {
            throw new ChatValidationException("System messages cannot be sent by users");
        }
        if (!request.isValidMessage()) {
            throw new ChatValidationException("Invalid message content");
        }

        List<ChatGroupMember> members = chatGroupMemberRepository.findActiveMembersWithUsers(chatGroup);
        if (chatGroup.getType() == ChatGroup.GroupType.DIRECT_MESSAGE) {
            members.stream()
                .map(ChatGroupMember::getUser)
                .filter(other -> !other.getId().equals(user.getId()))
                .findFirst()
                .ifPresent(other -> assertCanDirectMessage(user, other));
        }
        
        Message message;
        if (request.getMessageType().isMedia()) {
            message = Message.createMediaMessage(
                chatGroup, user, request.getContent(),
                request.getMediaUrl(), request.getMediaType(),
                request.getMediaFilename(), request.getMediaSize()
            );
        } else {
            message = Message.createTextMessage(chatGroup, user, request.getContent());
            message.setMessageType(request.getMessageType());
        }
        
        if (request.isReply()) {
            Message parentMessage = messageRepository.findById(request.getParentMessageId())
                .orElseThrow(() -> new ChatNotFoundException("Parent message not found"));
            if (!parentMessage.getChatGroup().getId().equals(chatGroup.getId())) {
                throw new ChatValidationException("Parent message must belong to the same chat group");
            }
            message.setParentMessage(parentMessage);
        }

        List<UUID> mentionedUserIds = List.of();
        if (request.hasMentions()) {
            Set<UUID> memberIds = members.stream().map(m -> m.getUser().getId()).collect(Collectors.toSet());
            mentionedUserIds = request.getMentionedUserIds().stream()
                .filter(Objects::nonNull)
                .distinct()
                .filter(memberIds::contains)
                .filter(id -> !id.equals(user.getId()))
                .collect(Collectors.toList());
            if (!mentionedUserIds.isEmpty()) {
                message.setMentionedUsers(convertUserIdsToJson(mentionedUserIds));
            }
        }
        
        message = messageRepository.save(message);
        
        MessageResponse response = resolveMessageResponse(
            MessageResponse.fromEntityWithUserContext(
                message, message.canBeEditedBy(user), canDeleteMessage(user, message, membership)));
        response.setTempId(request.getTempId());
        
        membership.markAsRead();
        chatGroupMemberRepository.save(membership);

        // Bump the group so it sorts to the top of everyone's chat list
        chatGroup.setUpdatedAt(LocalDateTime.now());
        chatGroupRepository.save(chatGroup);
        
        notifyGroupMessage(chatGroup, response);
        notifyChatMessageReceived(chatGroup, message, user, members, mentionedUserIds);
        
        return response;
    }
    
    @Transactional(readOnly = true)
    public Page<MessageResponse> getGroupMessages(String userEmail, UUID groupId, int page, int size) {
        User user = getUserByEmail(userEmail);
        ChatGroup chatGroup = getChatGroupById(groupId);
        
        ChatGroupMember membership = requireActiveMembership(user, chatGroup);
        
        Pageable pageable = PageRequest.of(page, Math.min(Math.max(size, 1), 100), Sort.by(Sort.Direction.DESC, "timestamp"));
        Page<Message> messages = messageRepository.findPageWithAuthors(chatGroup, pageable);
        Map<UUID, Long> replyCounts = replyCountsFor(messages.getContent());
        
        return messages.map(message -> {
            MessageResponse response = resolveMessageResponse(
                MessageResponse.fromEntityWithUserContext(
                    message, message.canBeEditedBy(user), canDeleteMessage(user, message, membership)));
            response.setReplyCount(replyCounts.getOrDefault(message.getId(), 0L).intValue());
            return response;
        });
    }

    private Map<UUID, Long> replyCountsFor(Collection<Message> messages) {
        if (messages.isEmpty()) {
            return Map.of();
        }
        List<UUID> ids = messages.stream().map(Message::getId).collect(Collectors.toList());
        return toCountMap(messageRepository.countRepliesForParents(ids));
    }
    
    @Transactional
    public MessageResponse editMessage(String userEmail, UUID messageId, String newContent) {
        User user = getUserByEmail(userEmail);
        Message message = getMessageById(messageId);
        
        if (!message.canBeEditedBy(user)) {
            throw new ChatAccessDeniedException("Cannot edit this message");
        }
        if (newContent == null || newContent.trim().isEmpty()) {
            throw new ChatValidationException("Message content is required");
        }
        if (newContent.length() > 4000) {
            throw new ChatValidationException("Message content cannot exceed 4000 characters");
        }
        
        message.edit(newContent.trim());
        message = messageRepository.save(message);
        
        MessageResponse response = resolveMessageResponse(
            MessageResponse.fromEntityWithUserContext(
                message, true, canDeleteMessage(user, message, null)));
        response.setReplyCount((int) messageRepository.countReplies(message));
        
        notifyGroupMessage(message.getChatGroup(), response);
        
        return response;
    }
    
    @Transactional
    public void deleteMessage(String userEmail, UUID messageId) {
        User user = getUserByEmail(userEmail);
        Message message = getMessageById(messageId);
        
        if (!canDeleteMessage(user, message, null)) {
            throw new ChatAccessDeniedException("Cannot delete this message");
        }
        
        message.delete(user.getId());
        message = messageRepository.save(message);

        MessageResponse response = resolveMessageResponse(
            MessageResponse.fromEntityWithUserContext(message, false, false));
        notifyGroupMessage(message.getChatGroup(), response);
        notifyGroupMembers(message.getChatGroup(), "message_deleted", "Message deleted by " + user.getName());
    }

    /**
     * Toggle an emoji reaction. Reacting twice with the same emoji removes it, like every mainstream messenger.
     */
    @Transactional
    public MessageResponse toggleReaction(String userEmail, UUID messageId, String emoji) {
        if (emoji == null || emoji.isBlank() || emoji.length() > 16) {
            throw new ChatValidationException("A valid emoji is required");
        }
        User user = getUserByEmail(userEmail);
        Message message = getMessageById(messageId);
        if (Boolean.TRUE.equals(message.getIsDeleted())) {
            throw new ChatValidationException("You cannot react to a deleted message");
        }
        ChatGroupMember membership = requireActiveMembership(user, message.getChatGroup());

        Map<String, List<UUID>> reactions = MessageResponse.parseReactions(message.getReactions());
        List<UUID> reactors = reactions.computeIfAbsent(emoji.trim(), k -> new ArrayList<>());
        if (reactors.contains(user.getId())) {
            reactors.remove(user.getId());
        } else {
            reactors.add(user.getId());
        }
        if (reactors.isEmpty()) {
            reactions.remove(emoji.trim());
        }
        message.setReactions(reactions.isEmpty() ? null : MessageResponse.serializeReactions(reactions));
        message = messageRepository.save(message);

        MessageResponse response = resolveMessageResponse(
            MessageResponse.fromEntityWithUserContext(
                message, message.canBeEditedBy(user), canDeleteMessage(user, message, membership)));
        response.setReplyCount((int) messageRepository.countReplies(message));
        notifyGroupMessage(message.getChatGroup(), response);
        return response;
    }
    
    @Transactional
    public void markMessagesAsRead(String userEmail, UUID groupId, LocalDateTime timestamp) {
        User user = getUserByEmail(userEmail);
        ChatGroup chatGroup = getChatGroupById(groupId);
        
        chatGroupMemberRepository.updateLastReadAt(user, chatGroup, timestamp != null ? timestamp : LocalDateTime.now());
    }

    /** Per-member notification preference for a group (the "mute this conversation" switch). */
    @Transactional
    public void updateNotificationPreference(String userEmail, UUID groupId, boolean enabled) {
        User user = getUserByEmail(userEmail);
        ChatGroup chatGroup = getChatGroupById(groupId);
        ChatGroupMember membership = requireActiveMembership(user, chatGroup);
        membership.setNotificationsEnabled(enabled);
        chatGroupMemberRepository.save(membership);
    }
    
    // ==================== MEMBER MANAGEMENT ====================
    
    @Transactional(readOnly = true)
    public List<ChatGroupMemberResponse> getGroupMembers(String userEmail, UUID groupId) {
        User user = getUserByEmail(userEmail);
        ChatGroup chatGroup = getChatGroupById(groupId);
        
        requireActiveMembership(user, chatGroup);
        
        List<ChatGroupMember> members = chatGroupMemberRepository.findActiveMembersWithUsers(chatGroup);
        
        return members.stream()
            .map(member -> ChatGroupMemberResponse.fromEntityWithOnlineStatus(
                member, chatPresenceService.isOnline(member.getUser().getEmail())))
            .collect(Collectors.toList());
    }
    
    @Transactional
    public void updateMemberRole(String userEmail, UUID groupId, UUID memberId, String newRole) {
        User user = getUserByEmail(userEmail);
        ChatGroup chatGroup = getChatGroupById(groupId);
        
        ChatGroupMember currentUserMembership = requireActiveMembership(user, chatGroup);
        if (!currentUserMembership.canManageMembers()) {
            throw new ChatAccessDeniedException("Insufficient permissions to manage members");
        }
        
        ChatGroupMember targetMember = getMemberInGroup(memberId, chatGroup);

        ChatGroupMember.MemberRole role;
        try {
            role = ChatGroupMember.MemberRole.valueOf(newRole.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ChatValidationException("Unknown role: " + newRole);
        }
        if (role == ChatGroupMember.MemberRole.OWNER && currentUserMembership.getMemberRole() != ChatGroupMember.MemberRole.OWNER) {
            throw new ChatAccessDeniedException("Only the owner can transfer ownership");
        }
        if (targetMember.getMemberRole() == ChatGroupMember.MemberRole.OWNER
                && currentUserMembership.getMemberRole() != ChatGroupMember.MemberRole.OWNER) {
            throw new ChatAccessDeniedException("Only the owner can change the owner's role");
        }

        if (role == ChatGroupMember.MemberRole.OWNER && !targetMember.getId().equals(currentUserMembership.getId())) {
            currentUserMembership.setMemberRole(ChatGroupMember.MemberRole.ADMIN);
            chatGroupMemberRepository.save(currentUserMembership);
        }
        targetMember.setMemberRole(role);
        chatGroupMemberRepository.save(targetMember);
        
        createSystemMessage(chatGroup, user,
            user.getName() + " changed " + targetMember.getUser().getName() + "'s role to " + role.getDisplayName(),
            null);
        notifyGroupMembers(chatGroup, "member_updated", "Member role updated");
    }

    @Transactional
    public void removeMemberFromGroup(String userEmail, UUID groupId, UUID memberId) {
        User actor = getUserByEmail(userEmail);
        ChatGroup chatGroup = getChatGroupById(groupId);

        ChatGroupMember actorMembership = requireActiveMembership(actor, chatGroup);
        if (!actorMembership.canManageMembers()) {
            throw new ChatAccessDeniedException("Insufficient permissions to remove members");
        }

        ChatGroupMember targetMember = getMemberInGroup(memberId, chatGroup);
        if (targetMember.getMemberRole() == ChatGroupMember.MemberRole.OWNER) {
            throw new ChatAccessDeniedException("Owners cannot be removed by member management");
        }

        targetMember.leave();
        chatGroupMemberRepository.save(targetMember);

        createSystemMessage(chatGroup, actor,
            actor.getName() + " removed " + targetMember.getUser().getName() + " from the group",
            null);
        notifyGroupMembers(chatGroup, "member_removed", targetMember.getUser().getName() + " was removed from the group");
    }

    @Transactional
    public void updateMemberMuteStatus(String userEmail, UUID groupId, UUID memberId, boolean muted) {
        User actor = getUserByEmail(userEmail);
        ChatGroup chatGroup = getChatGroupById(groupId);

        ChatGroupMember actorMembership = requireActiveMembership(actor, chatGroup);
        if (!actorMembership.canManageMembers()) {
            throw new ChatAccessDeniedException("Insufficient permissions to mute members");
        }

        ChatGroupMember targetMember = getMemberInGroup(memberId, chatGroup);
        if (targetMember.getMemberRole() == ChatGroupMember.MemberRole.OWNER) {
            throw new ChatAccessDeniedException("The owner cannot be muted");
        }

        targetMember.setIsMuted(muted);
        chatGroupMemberRepository.save(targetMember);

        createSystemMessage(chatGroup, actor,
            actor.getName() + (muted ? " muted " : " unmuted ") + targetMember.getUser().getName(),
            null);
        notifyGroupMembers(chatGroup, "member_updated", "Member settings updated");
    }

    /**
     * Verify that a user has access to a chat group (is an active member).
     */
    @Transactional(readOnly = true)
    public void verifyGroupAccess(String userEmail, UUID groupId) {
        User user = getUserByEmail(userEmail);
        ChatGroup chatGroup = getChatGroupById(groupId);
        requireActiveMembership(user, chatGroup);
    }

    @Transactional(readOnly = true)
    public void verifyMessageAccess(String userEmail, UUID messageId) {
        User user = getUserByEmail(userEmail);
        Message message = getMessageById(messageId);
        requireActiveMembership(user, message.getChatGroup());
    }

    @Transactional(readOnly = true)
    public Message getMessageMediaForDownload(String userEmail, UUID messageId) {
        User user = getUserByEmail(userEmail);
        Message message = getMessageById(messageId);
        requireActiveMembership(user, message.getChatGroup());

        if (Boolean.TRUE.equals(message.getIsDeleted())
                || message.getMediaUrl() == null
                || message.getMediaUrl().isBlank()) {
            throw new ChatNotFoundException("No downloadable media found for this message");
        }

        return message;
    }

    // ==================== SEARCH OPERATIONS ====================
    
    /**
     * Paginated, filterable search across the groups the user is an active member of.
     */
    @Transactional(readOnly = true)
    public ChatSearchResponse searchMessages(String userEmail, ChatSearchRequest request) {
        User user = getUserByEmail(userEmail);
        long startTime = System.currentTimeMillis();

        int limit = request.getLimit() == null || request.getLimit() <= 0 ? 50 : Math.min(request.getLimit(), MAX_SEARCH_LIMIT);
        int offset = request.getOffset() == null || request.getOffset() < 0 ? 0 : request.getOffset();
        String sortOrder = "asc".equalsIgnoreCase(request.getSortOrder()) ? "asc" : "desc";
        if (request.getDateFrom() != null && request.getDateTo() != null && !request.isValidDateRange()) {
            throw new ChatValidationException("dateFrom must be before dateTo");
        }

        Sort sort = Sort.by("asc".equals(sortOrder) ? Sort.Direction.ASC : Sort.Direction.DESC, "timestamp");
        Pageable pageable = PageRequest.of(offset / limit, limit, sort);
        Page<Message> page = messageRepository.findAll(searchSpecification(user, request), pageable);

        Map<UUID, Long> replyCounts = replyCountsFor(page.getContent());
        List<MessageResponse> messageResponses = page.getContent().stream()
            .map(message -> {
                MessageResponse response = resolveMessageResponse(
                    MessageResponse.fromEntityWithUserContext(
                        message, message.canBeEditedBy(user), canDeleteMessage(user, message, null)));
                response.setReplyCount(replyCounts.getOrDefault(message.getId(), 0L).intValue());
                return response;
            })
            .collect(Collectors.toList());
        
        long searchTime = System.currentTimeMillis() - startTime;
        ChatSearchResponse.SearchMetadata metadata = ChatSearchResponse.SearchMetadata.create(
            request.getQuery(), page.getTotalElements(), limit, offset,
            request.getSortBy() != null ? request.getSortBy() : "timestamp", sortOrder, searchTime);
        
        return ChatSearchResponse.createMessageResults(messageResponses, metadata);
    }

    private Specification<Message> searchSpecification(User user, ChatSearchRequest request) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Only groups where the user is an active member
            Subquery<UUID> memberGroups = query.subquery(UUID.class);
            Root<ChatGroupMember> cgm = memberGroups.from(ChatGroupMember.class);
            memberGroups.select(cgm.<ChatGroup>get("chatGroup").<UUID>get("id"))
                .where(cb.equal(cgm.get("user"), user), cb.isTrue(cgm.<Boolean>get("isActive")));
            predicates.add(root.<ChatGroup>get("chatGroup").<UUID>get("id").in(memberGroups));

            if (!Boolean.TRUE.equals(request.getIncludeDeleted())) {
                predicates.add(cb.isFalse(root.<Boolean>get("isDeleted")));
            }
            predicates.add(cb.notEqual(root.get("messageType"), Message.MessageType.SYSTEM));

            String term = request.getQuery() == null ? "" : request.getQuery().trim().toLowerCase();
            if (!term.isEmpty()) {
                predicates.add(cb.like(cb.lower(root.<String>get("content")), "%" + escapeLike(term) + "%", '\\'));
            }
            if (request.getChatGroupIds() != null && !request.getChatGroupIds().isEmpty()) {
                predicates.add(root.<ChatGroup>get("chatGroup").<UUID>get("id").in(request.getChatGroupIds()));
            }
            if (request.getUserIds() != null && !request.getUserIds().isEmpty()) {
                predicates.add(root.<User>get("user").<UUID>get("id").in(request.getUserIds()));
            }
            if (request.getMessageType() != null && !request.getMessageType().isBlank()) {
                try {
                    predicates.add(cb.equal(root.get("messageType"),
                        Message.MessageType.valueOf(request.getMessageType().toUpperCase())));
                } catch (IllegalArgumentException ignored) {
                    // Unknown type filter: ignore rather than fail the whole search
                }
            }
            if (request.getDateFrom() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.<LocalDateTime>get("timestamp"), request.getDateFrom()));
            }
            if (request.getDateTo() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.<LocalDateTime>get("timestamp"), request.getDateTo()));
            }

            if (query.getResultType() != Long.class && query.getResultType() != long.class) {
                root.fetch("user");
                root.fetch("chatGroup");
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private static String escapeLike(String value) {
        return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
    
    // ==================== UTILITY METHODS ====================
    
    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new ChatNotFoundException("User not found"));
    }
    
    private ChatGroup getChatGroupById(UUID groupId) {
        return chatGroupRepository.findById(groupId)
            .orElseThrow(() -> new ChatNotFoundException("Chat group not found"));
    }

    private Message getMessageById(UUID messageId) {
        return messageRepository.findById(messageId)
            .orElseThrow(() -> new ChatNotFoundException("Message not found"));
    }

    private ChatGroupMember requireActiveMembership(User user, ChatGroup chatGroup) {
        return chatGroupMemberRepository
            .findByUserAndChatGroupAndIsActiveTrue(user, chatGroup)
            .orElseThrow(() -> new ChatAccessDeniedException("You are not a member of this group"));
    }

    private ChatGroupMember getMemberInGroup(UUID memberId, ChatGroup chatGroup) {
        ChatGroupMember targetMember = chatGroupMemberRepository.findById(memberId)
            .orElseThrow(() -> new ChatNotFoundException("Member not found"));
        if (!targetMember.getChatGroup().getId().equals(chatGroup.getId())) {
            throw new ChatValidationException("Member does not belong to this group");
        }
        return targetMember;
    }

    private static Map<UUID, Long> toCountMap(List<Object[]> rows) {
        Map<UUID, Long> counts = new LinkedHashMap<>();
        for (Object[] row : rows) {
            if (row[0] != null) {
                counts.put((UUID) row[0], ((Number) row[1]).longValue());
            }
        }
        return counts;
    }
    
    private boolean canCreateGroup(User user, ChatGroup.GroupType type) {
        if (user.getRole() == User.Role.PLATFORM_ADMIN || user.getRole() == User.Role.MODERATOR) {
            return true;
        }
        return type != ChatGroup.GroupType.MAIN && 
               type != ChatGroup.GroupType.ANNOUNCEMENT &&
               type != ChatGroup.GroupType.LEADERSHIP;
    }
    
    private void createSystemMessage(ChatGroup chatGroup, User user, String content, String metadata) {
        Message systemMessage = Message.createSystemMessage(chatGroup, user, content, metadata);
        systemMessage = messageRepository.save(systemMessage);
        // System messages are part of the transcript, so subscribers should see them live too
        notifyGroupMessage(chatGroup, resolveMessageResponse(
            MessageResponse.fromEntityWithUserContext(systemMessage, false, false)));
    }
    
    private void notifyGroupMembers(ChatGroup chatGroup, String eventType, String message) {
        try {
            messagingTemplate.convertAndSend("/topic/group/" + chatGroup.getId(), 
                new GroupNotification(eventType, message, LocalDateTime.now()));
        } catch (Exception e) {
            log.warn("Failed to publish group notification {} for group {}: {}", eventType, chatGroup.getId(), e.getMessage());
        }
    }
    
    private void notifyGroupMessage(ChatGroup chatGroup, MessageResponse messageResponse) {
        try {
            messagingTemplate.convertAndSend("/topic/group/" + chatGroup.getId() + "/messages", messageResponse);
        } catch (Exception e) {
            log.warn("Failed to publish message to group {}: {}", chatGroup.getId(), e.getMessage());
        }
    }
    
    /**
     * Fan out a new message to every other member: personal WebSocket queue (notification bell),
     * then Firebase push. Members who muted the conversation are skipped; mentioned members always get it.
     */
    private void notifyChatMessageReceived(ChatGroup chatGroup, Message message, User sender,
                                           List<ChatGroupMember> members, List<UUID> mentionedUserIds) {
        try {
            ChatNotificationEvent notificationEvent = ChatNotificationEvent.chatMessageReceived(
                message.getId(),
                chatGroup.getId(),
                chatGroup.getName(),
                sender.getId(),
                sender.getName(),
                sender.getEmail(),
                message.getContent(),
                message.getMessageType() != null ? message.getMessageType().name() : "TEXT"
            );

            List<ChatGroupMember> recipients = new ArrayList<>();
            for (ChatGroupMember member : members) {
                if (member.getUser().getId().equals(sender.getId())) {
                    continue;
                }
                boolean mentioned = mentionedUserIds.contains(member.getUser().getId());
                if (!mentioned && Boolean.FALSE.equals(member.getNotificationsEnabled())) {
                    continue;
                }
                recipients.add(member);
                messagingTemplate.convertAndSendToUser(member.getUser().getEmail(), "/queue/events", notificationEvent);
            }
            
            sendChatPushNotifications(chatGroup, message, sender, recipients, mentionedUserIds);

        } catch (Exception e) {
            log.error("Error sending chat notification for message {}: {}", message.getId(), e.getMessage());
        }
    }

    private void sendChatPushNotifications(ChatGroup chatGroup, Message message, User sender,
                                           List<ChatGroupMember> recipients, List<UUID> mentionedUserIds) {
        try {
            String messagePreview = message.getContent();
            if (messagePreview == null || messagePreview.isBlank()) {
                messagePreview = describeLastMessage(message);
            }
            if (messagePreview.length() > 100) {
                messagePreview = messagePreview.substring(0, 97) + "...";
            }

            boolean isDm = chatGroup.getType() == ChatGroup.GroupType.DIRECT_MESSAGE;
            String title = isDm ? sender.getName() : chatGroup.getName();
            String body = isDm ? messagePreview : sender.getName() + ": " + messagePreview;

            Map<String, String> data = new HashMap<>();
            data.put("type", "chat_message");
            data.put("messageId", message.getId().toString());
            data.put("chatId", chatGroup.getId().toString());
            data.put("groupId", chatGroup.getId().toString());
            data.put("senderId", sender.getId().toString());

            List<String> mentionedTokens = new ArrayList<>();
            List<String> regularTokens = new ArrayList<>();
            for (ChatGroupMember member : recipients) {
                String token = member.getUser().getFcmToken();
                if (token == null || token.trim().isEmpty()) {
                    continue;
                }
                if (mentionedUserIds.contains(member.getUser().getId())) {
                    mentionedTokens.add(token);
                } else {
                    regularTokens.add(token);
                }
            }

            if (!regularTokens.isEmpty()) {
                notificationService.sendBulkNotification(regularTokens, "💬 " + title, body, data);
            }
            if (!mentionedTokens.isEmpty()) {
                Map<String, String> mentionData = new HashMap<>(data);
                mentionData.put("type", "chat_mention");
                notificationService.sendBulkNotification(mentionedTokens,
                    "💬 " + sender.getName() + " mentioned you" + (isDm ? "" : " in " + chatGroup.getName()),
                    messagePreview, mentionData);
            }

            log.debug("Sent chat push notifications for message {}: {} regular, {} mentioned",
                message.getId(), regularTokens.size(), mentionedTokens.size());

        } catch (Exception e) {
            log.error("Failed to send Firebase push notification for message {}: {}", message.getId(), e.getMessage());
        }
    }

    private boolean canDeleteMessage(User user, Message message, ChatGroupMember knownMembership) {
        if (message.canBeDeletedBy(user)) {
            return true;
        }
        if (knownMembership != null) {
            return knownMembership.canModerate();
        }
        return chatGroupMemberRepository
            .findByUserAndChatGroupAndIsActiveTrue(user, message.getChatGroup())
            .map(ChatGroupMember::canModerate)
            .orElse(false);
    }
    
    private String convertUserIdsToJson(List<UUID> userIds) {
        return userIds.stream()
            .map(uuid -> "\"" + uuid.toString() + "\"")
            .collect(Collectors.joining(",", "[", "]"));
    }
    
    /**
     * Resolve optimized media URL for MessageResponse
     */
    private MessageResponse resolveMessageResponse(MessageResponse response) {
        if (response != null && response.getMediaUrl() != null) {
            response.setMediaUrl(mediaUrlService.getBestUrl(response.getMediaUrl()));
        }
        return response;
    }
    
    // Inner class for WebSocket notifications
    public static class GroupNotification {
        public String eventType;
        public String message;
        public LocalDateTime timestamp;
        
        public GroupNotification(String eventType, String message, LocalDateTime timestamp) {
            this.eventType = eventType;
            this.message = message;
            this.timestamp = timestamp;
        }
    }
}
