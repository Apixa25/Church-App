package com.churchapp.service;

import com.churchapp.dto.*;
import com.churchapp.entity.ChatGroup;
import com.churchapp.entity.ChatGroupMember;
import com.churchapp.entity.Message;
import com.churchapp.entity.User;
import com.churchapp.repository.ChatGroupRepository;
import com.churchapp.repository.ChatGroupMemberRepository;
import com.churchapp.repository.MessageRepository;
import com.churchapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ChatService {
    
    private final ChatGroupRepository chatGroupRepository;
    private final ChatGroupMemberRepository chatGroupMemberRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final FileUploadService fileUploadService;
    private final MediaUrlService mediaUrlService;
    private final NotificationService notificationService;
    
    // ==================== CHAT GROUP OPERATIONS ====================
    
    @Transactional
    public ChatGroupResponse createChatGroup(String userEmail, ChatGroupRequest request) {
        User user = getUserByEmail(userEmail);
        
        // Validate user permissions
        if (!canCreateGroup(user, request.getType())) {
            throw new RuntimeException("Insufficient permissions to create this type of group");
        }
        
        // Check for duplicate names in certain group types
        if (request.getType() == ChatGroup.GroupType.MAIN) {
            if (chatGroupRepository.findByNameAndIsActiveTrue(request.getName()).isPresent()) {
                throw new RuntimeException("A main chat group with this name already exists");
            }
        }
        
        ChatGroup chatGroup = new ChatGroup();
        chatGroup.setName(request.getName());
        chatGroup.setType(request.getType());
        chatGroup.setDescription(request.getDescription());
        chatGroup.setImageUrl(request.getImageUrl());
        chatGroup.setCreatedBy(user);
        chatGroup.setIsPrivate(request.getIsPrivate());
        chatGroup.setMaxMembers(request.getMaxMembers());
        
        chatGroup = chatGroupRepository.save(chatGroup);
        
        // Add creator as owner
        ChatGroupMember creatorMember = new ChatGroupMember();
        creatorMember.setUser(user);
        creatorMember.setChatGroup(chatGroup);
        creatorMember.setMemberRole(ChatGroupMember.MemberRole.OWNER);
        chatGroupMemberRepository.save(creatorMember);
        
        // Create system message for group creation
        createSystemMessage(chatGroup, user, user.getName() + " created the group", null);
        
        return ChatGroupResponse.fromEntity(chatGroup);
    }
    
    public List<ChatGroupResponse> getUserChatGroups(String userEmail) {
        User user = getUserByEmail(userEmail);
        List<ChatGroup> groups = chatGroupRepository.findGroupsByMember(user);
        
        return groups.stream()
            .map(group -> {
                ChatGroupMember membership = chatGroupMemberRepository
                    .findByUserAndChatGroupAndIsActiveTrue(user, group).orElse(null);
                
                boolean isMember = membership != null;
                boolean canPost = isMember && membership.canPost();
                boolean canModerate = isMember && membership.canModerate();
                String userRole = isMember ? membership.getMemberRole().name() : null;
                Long unreadCount = isMember ? messageRepository.countUnreadMessagesForUserInGroup(user, group) : 0L;
                
                ChatGroupResponse response = ChatGroupResponse.fromEntityWithUserContext(group, isMember, canPost, canModerate, userRole, unreadCount);
                
                // Populate last message info
                messageRepository.findTopByChatGroupAndIsDeletedFalseOrderByTimestampDesc(group).ifPresent(lastMessage -> {
                    response.setLastMessageTime(lastMessage.getTimestamp());
                    
                    // Set last message content based on message type
                    if (lastMessage.getContent() != null && !lastMessage.getContent().trim().isEmpty()) {
                        response.setLastMessage(lastMessage.getContent());
                    } else {
                        // Handle media messages
                        switch (lastMessage.getMessageType()) {
                            case IMAGE:
                                response.setLastMessage("📷 Image");
                                break;
                            case VIDEO:
                                response.setLastMessage("🎥 Video");
                                break;
                            case AUDIO:
                                response.setLastMessage("🎵 Audio");
                                break;
                            case DOCUMENT:
                                response.setLastMessage("📄 Document");
                                break;
                            default:
                                response.setLastMessage("Message");
                        }
                    }
                    
                    // Set last message author
                    if (lastMessage.getUser() != null) {
                        response.setLastMessageBy(lastMessage.getUser().getName());
                    }
                });
                
                return response;
            })
            .collect(Collectors.toList());
    }
    
    public List<ChatGroupResponse> getJoinableGroups(String userEmail) {
        User user = getUserByEmail(userEmail);
        List<ChatGroup> groups = chatGroupRepository.findJoinableGroups(user);
        
        return groups.stream()
            .map(ChatGroupResponse::fromEntity)
            .collect(Collectors.toList());
    }
    
    @Transactional
    public ChatGroupResponse joinChatGroup(String userEmail, UUID groupId) {
        User user = getUserByEmail(userEmail);
        ChatGroup chatGroup = getChatGroupById(groupId);
        
        if (!chatGroup.canUserJoin(user)) {
            throw new RuntimeException("Cannot join this group");
        }
        
        // Check if user was previously a member
        ChatGroupMember existingMember = chatGroupMemberRepository.findByUserAndChatGroup(user, chatGroup).orElse(null);
        
        if (existingMember != null) {
            if (existingMember.getIsActive()) {
                throw new RuntimeException("User is already a member of this group");
            } else {
                // Reactivate membership
                existingMember.setIsActive(true);
                existingMember.setLeftAt(null);
                chatGroupMemberRepository.save(existingMember);
            }
        } else {
            // Create new membership
            ChatGroupMember member = new ChatGroupMember();
            member.setUser(user);
            member.setChatGroup(chatGroup);
            member.setMemberRole(ChatGroupMember.MemberRole.MEMBER);
            chatGroupMemberRepository.save(member);
        }
        
        // Create system message
        createSystemMessage(chatGroup, user, user.getName() + " joined the group", null);
        
        // Notify other members via WebSocket
        notifyGroupMembers(chatGroup, "user_joined", user.getName() + " joined the group");
        
        return ChatGroupResponse.fromEntity(chatGroup);
    }
    
    @Transactional
    public void leaveChatGroup(String userEmail, UUID groupId) {
        User user = getUserByEmail(userEmail);
        ChatGroup chatGroup = getChatGroupById(groupId);
        
        ChatGroupMember membership = chatGroupMemberRepository
            .findByUserAndChatGroupAndIsActiveTrue(user, chatGroup)
            .orElseThrow(() -> new RuntimeException("User is not a member of this group"));
        
        if (membership.getMemberRole() == ChatGroupMember.MemberRole.OWNER) {
            // Check if there are other admins to transfer ownership to
            List<ChatGroupMember> admins = chatGroupMemberRepository
                .findByChatGroupAndMemberRoleAndIsActiveTrue(chatGroup, ChatGroupMember.MemberRole.ADMIN);
            
            if (!admins.isEmpty()) {
                // Transfer ownership to first admin
                ChatGroupMember newOwner = admins.get(0);
                newOwner.setMemberRole(ChatGroupMember.MemberRole.OWNER);
                chatGroupMemberRepository.save(newOwner);
            } else {
                // Check if there are other members
                long memberCount = chatGroupMemberRepository.countActiveMembersByChatGroup(chatGroup);
                if (memberCount <= 1) {
                    // Last member leaving, deactivate group
                    chatGroup.setIsActive(false);
                    chatGroupRepository.save(chatGroup);
                }
            }
        }
        
        membership.leave();
        chatGroupMemberRepository.save(membership);
        
        // Create system message
        createSystemMessage(chatGroup, user, user.getName() + " left the group", null);
        
        // Notify other members
        notifyGroupMembers(chatGroup, "user_left", user.getName() + " left the group");
    }
    
    @Transactional
    public ChatGroupResponse createOrGetDirectMessage(String userEmail, String targetUserEmail) {
        User user = getUserByEmail(userEmail);
        User targetUser = getUserByEmail(targetUserEmail);
        
        // Check if direct message conversation already exists between these users
        List<ChatGroup> existingDM = chatGroupRepository.findDirectMessageBetweenUsers(user, targetUser);
        
        if (!existingDM.isEmpty()) {
            // Return existing conversation
            ChatGroup dmGroup = existingDM.get(0);
            ChatGroupMember membership = chatGroupMemberRepository
                .findByUserAndChatGroupAndIsActiveTrue(user, dmGroup).orElse(null);
            
            boolean isMember = membership != null;
            boolean canPost = isMember && membership.canPost();
            boolean canModerate = isMember && membership.canModerate();
            String userRole = isMember ? membership.getMemberRole().name() : null;
            Long unreadCount = isMember ? messageRepository.countUnreadMessagesForUserInGroup(user, dmGroup) : 0L;
            
            return ChatGroupResponse.fromEntityWithUserContext(dmGroup, isMember, canPost, canModerate, userRole, unreadCount);
        }
        
        // Create new direct message conversation
        ChatGroup dmGroup = new ChatGroup();
        dmGroup.setName(user.getName() + " & " + targetUser.getName());
        dmGroup.setType(ChatGroup.GroupType.DIRECT_MESSAGE);
        dmGroup.setDescription("Direct message conversation");
        dmGroup.setCreatedBy(user);
        dmGroup.setIsPrivate(true);
        dmGroup.setMaxMembers(2);
        
        dmGroup = chatGroupRepository.save(dmGroup);
        
        // Add both users as members with equal permissions
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
        
        // Create system message for DM creation
        createSystemMessage(dmGroup, user, "Started a conversation", null);
        
        return ChatGroupResponse.fromEntity(dmGroup);
    }
    
    // ==================== MESSAGE OPERATIONS ====================
    
    @Transactional
    public MessageResponse sendMessage(String userEmail, MessageRequest request) {
        User user = getUserByEmail(userEmail);
        ChatGroup chatGroup = getChatGroupById(request.getChatGroupId());
        
        // Check if user can post in this group
        ChatGroupMember membership = chatGroupMemberRepository
            .findByUserAndChatGroupAndIsActiveTrue(user, chatGroup)
            .orElseThrow(() -> new RuntimeException("User is not a member of this group"));
        
        if (!membership.canPost()) {
            throw new RuntimeException("User cannot post in this group");
        }
        
        // Validate message
        if (!request.isValidMessage()) {
            throw new RuntimeException("Invalid message content");
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
        
        // Handle reply
        if (request.isReply()) {
            Message parentMessage = messageRepository.findById(request.getParentMessageId())
                .orElseThrow(() -> new RuntimeException("Parent message not found"));
            message.setParentMessage(parentMessage);
        }
        
        // Handle mentions
        if (request.hasMentions()) {
            // Convert mentioned user IDs to JSON
            String mentionedUsersJson = convertUserIdsToJson(request.getMentionedUserIds());
            message.setMentionedUsers(mentionedUsersJson);
        }
        
        message = messageRepository.save(message);
        
        MessageResponse response = resolveMessageResponse(
            MessageResponse.fromEntityWithUserContext(
                message, message.canBeEditedBy(user), message.canBeDeletedBy(user)));
        response.setTempId(request.getTempId());
        
        // Update last read for sender
        membership.markAsRead();
        chatGroupMemberRepository.save(membership);
        
        // Send real-time notification to group members
        notifyGroupMessage(chatGroup, response);
        
        // Send chat notifications to Event Notification system for all group members except sender
        notifyChatMessageReceived(chatGroup, message, user);
        
        // Send push notifications for mentions
        if (request.hasMentions()) {
            sendMentionNotifications(message, request.getMentionedUserIds());
        }
        
        return response;
    }
    
    public Page<MessageResponse> getGroupMessages(String userEmail, UUID groupId, int page, int size) {
        User user = getUserByEmail(userEmail);
        ChatGroup chatGroup = getChatGroupById(groupId);
        
        // Verify user is a member
        if (!chatGroupMemberRepository.existsByUserAndChatGroupAndIsActiveTrue(user, chatGroup)) {
            throw new RuntimeException("User is not a member of this group");
        }
        
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "timestamp"));
        Page<Message> messages = messageRepository.findByChatGroupAndIsDeletedFalseOrderByTimestampDesc(chatGroup, pageable);
        
        return messages.map(message -> resolveMessageResponse(
            MessageResponse.fromEntityWithUserContext(
                message, message.canBeEditedBy(user), message.canBeDeletedBy(user))));
    }
    
    @Transactional
    public MessageResponse editMessage(String userEmail, UUID messageId, String newContent) {
        User user = getUserByEmail(userEmail);
        Message message = messageRepository.findById(messageId)
            .orElseThrow(() -> new RuntimeException("Message not found"));
        
        if (!message.canBeEditedBy(user)) {
            throw new RuntimeException("Cannot edit this message");
        }
        
        message.edit(newContent);
        message = messageRepository.save(message);
        
        MessageResponse response = resolveMessageResponse(
            MessageResponse.fromEntityWithUserContext(
                message, true, message.canBeDeletedBy(user)));
        
        // Notify group members of edit
        notifyGroupMessage(message.getChatGroup(), response);
        
        return response;
    }
    
    @Transactional
    public void deleteMessage(String userEmail, UUID messageId) {
        User user = getUserByEmail(userEmail);
        Message message = messageRepository.findById(messageId)
            .orElseThrow(() -> new RuntimeException("Message not found"));
        
        if (!message.canBeDeletedBy(user)) {
            throw new RuntimeException("Cannot delete this message");
        }
        
        message.delete(user.getId());
        messageRepository.save(message);
        
        // Notify group members of deletion
        notifyGroupMembers(message.getChatGroup(), "message_deleted", 
            "Message deleted by " + user.getName());
    }
    
    @Transactional
    public void markMessagesAsRead(String userEmail, UUID groupId, LocalDateTime timestamp) {
        User user = getUserByEmail(userEmail);
        ChatGroup chatGroup = getChatGroupById(groupId);
        
        chatGroupMemberRepository.updateLastReadAt(user, chatGroup, timestamp);
    }
    
    // ==================== MEMBER MANAGEMENT ====================
    
    public List<ChatGroupMemberResponse> getGroupMembers(String userEmail, UUID groupId) {
        User user = getUserByEmail(userEmail);
        ChatGroup chatGroup = getChatGroupById(groupId);
        
        // Verify user is a member
        if (!chatGroupMemberRepository.existsByUserAndChatGroupAndIsActiveTrue(user, chatGroup)) {
            throw new RuntimeException("User is not a member of this group");
        }
        
        List<ChatGroupMember> members = chatGroupMemberRepository
            .findByChatGroupAndIsActiveTrueOrderByJoinedAtAsc(chatGroup);
        
        return members.stream()
            .map(member -> ChatGroupMemberResponse.fromEntityWithOnlineStatus(
                member, isUserOnline(member.getUser())))
            .collect(Collectors.toList());
    }
    
    @Transactional
    public void updateMemberRole(String userEmail, UUID groupId, UUID memberId, String newRole) {
        User user = getUserByEmail(userEmail);
        ChatGroup chatGroup = getChatGroupById(groupId);
        
        ChatGroupMember currentUserMembership = chatGroupMemberRepository
            .findByUserAndChatGroupAndIsActiveTrue(user, chatGroup)
            .orElseThrow(() -> new RuntimeException("User is not a member of this group"));
        
        if (!currentUserMembership.canManageMembers()) {
            throw new RuntimeException("Insufficient permissions to manage members");
        }
        
        ChatGroupMember targetMember = chatGroupMemberRepository.findById(memberId)
            .orElseThrow(() -> new RuntimeException("Member not found"));
        
        ChatGroupMember.MemberRole role = ChatGroupMember.MemberRole.valueOf(newRole.toUpperCase());
        targetMember.setMemberRole(role);
        chatGroupMemberRepository.save(targetMember);
        
        // Create system message
        createSystemMessage(chatGroup, user,
            user.getName() + " changed " + targetMember.getUser().getName() + "'s role to " + role.getDisplayName(),
            null);
    }

    /**
     * Verify that a user has access to a chat group (is an active member)
     * Throws RuntimeException if user is not a member
     */
    public void verifyGroupAccess(String userEmail, UUID groupId) {
        User user = getUserByEmail(userEmail);
        ChatGroup chatGroup = getChatGroupById(groupId);

        if (!chatGroupMemberRepository.existsByUserAndChatGroupAndIsActiveTrue(user, chatGroup)) {
            throw new RuntimeException("User is not a member of this group");
        }
    }

    // ==================== SEARCH OPERATIONS ====================
    
    public ChatSearchResponse searchMessages(String userEmail, ChatSearchRequest request) {
        User user = getUserByEmail(userEmail);
        
        long startTime = System.currentTimeMillis();
        List<Message> messages;
        
        if (request.getChatGroupIds() != null && !request.getChatGroupIds().isEmpty()) {
            // Search in specific groups
            messages = searchMessagesInSpecificGroups(user, request);
        } else {
            // Search across all user's accessible groups
            messages = messageRepository.searchUserAccessibleMessages(user, request.getQuery());
        }
        
        // Apply additional filters
        messages = applySearchFilters(messages, request);
        
        // Convert to responses
        List<MessageResponse> messageResponses = messages.stream()
            .map(message -> resolveMessageResponse(
                MessageResponse.fromEntityWithUserContext(
                    message, message.canBeEditedBy(user), message.canBeDeletedBy(user))))
            .collect(Collectors.toList());
        
        long searchTime = System.currentTimeMillis() - startTime;
        
        ChatSearchResponse.SearchMetadata metadata = ChatSearchResponse.SearchMetadata.create(
            request.getQuery(), (long) messageResponses.size(), 
            request.getLimit(), request.getOffset(), 
            request.getSortBy(), request.getSortOrder(), searchTime);
        
        return ChatSearchResponse.createMessageResults(messageResponses, metadata);
    }
    
    // ==================== UTILITY METHODS ====================
    
    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"));
    }
    
    private ChatGroup getChatGroupById(UUID groupId) {
        return chatGroupRepository.findById(groupId)
            .orElseThrow(() -> new RuntimeException("Chat group not found"));
    }
    
    private boolean canCreateGroup(User user, ChatGroup.GroupType type) {
        // Admin/Moderator can create any type
        if (user.getRole() == User.Role.PLATFORM_ADMIN || user.getRole() == User.Role.MODERATOR) {
            return true;
        }
        
        // Regular members can create certain types
        return type != ChatGroup.GroupType.MAIN && 
               type != ChatGroup.GroupType.ANNOUNCEMENT &&
               type != ChatGroup.GroupType.LEADERSHIP;
    }
    
    private void createSystemMessage(ChatGroup chatGroup, User user, String content, String metadata) {
        Message systemMessage = Message.createSystemMessage(chatGroup, user, content, metadata);
        messageRepository.save(systemMessage);
    }
    
    private void notifyGroupMembers(ChatGroup chatGroup, String eventType, String message) {
        messagingTemplate.convertAndSend("/topic/group/" + chatGroup.getId(), 
            new GroupNotification(eventType, message, LocalDateTime.now()));
    }
    
    private void notifyGroupMessage(ChatGroup chatGroup, MessageResponse messageResponse) {
        messagingTemplate.convertAndSend("/topic/group/" + chatGroup.getId() + "/messages", messageResponse);
    }
    
    /**
     * Send chat notification to Event Notification system
     * Notifies all group members except the sender about the new message
     */
    private void notifyChatMessageReceived(ChatGroup chatGroup, Message message, User sender) {
        try {
            // Get all active members of the group
            List<ChatGroupMember> members = chatGroupMemberRepository
                .findByChatGroupAndIsActiveTrueOrderByJoinedAtAsc(chatGroup);
            
            // Create chat notification event
            ChatNotificationEvent notificationEvent = 
                ChatNotificationEvent.chatMessageReceived(
                    message.getId(),
                    chatGroup.getId(),
                    chatGroup.getName(),
                    sender.getId(),
                    sender.getName(),
                    sender.getEmail(),
                    message.getContent(),
                    message.getMessageType() != null ? message.getMessageType().name() : "TEXT"
                );
            
            // Send notification to each group member except the sender
            int notificationCount = 0;
            for (ChatGroupMember member : members) {
                if (!member.getUser().getId().equals(sender.getId())) {
                    // Send to user's personal queue for event notifications
                    // The frontend will subscribe to /user/queue/events to receive these
                    messagingTemplate.convertAndSendToUser(
                        member.getUser().getEmail(),
                        "/queue/events",
                        notificationEvent
                    );
                    notificationCount++;
                }
            }
            
            // Also broadcast to /topic/events for consistency (frontend can filter)
            // This allows the existing subscription in useEventNotifications to work
            System.out.println("📤 Sending chat notification to /topic/events: " + notificationEvent);
            messagingTemplate.convertAndSend("/topic/events", notificationEvent);
            System.out.println("✅ Chat notification sent to /topic/events successfully");

            // Send Firebase push notifications to group members
            sendChatPushNotifications(chatGroup, message, sender, members);

        } catch (Exception e) {
            // Log error but don't fail message sending
            // Using System.err since ChatService doesn't have @Slf4j
            System.err.println("Error sending chat notification for message " + message.getId() + ": " + e.getMessage());
        }
    }

    private void sendChatPushNotifications(ChatGroup chatGroup, Message message, User sender, List<ChatGroupMember> members) {
        try {
            // Collect FCM tokens (exclude sender)
            List<String> tokens = members.stream()
                .filter(member -> !member.getUser().getId().equals(sender.getId()))
                .map(member -> member.getUser().getFcmToken())
                .filter(token -> token != null && !token.trim().isEmpty())
                .collect(java.util.stream.Collectors.toList());

            if (tokens.isEmpty()) {
                return;
            }

            // Prepare notification data
            java.util.Map<String, String> data = new java.util.HashMap<>();
            data.put("type", "chat_message");
            data.put("messageId", message.getId().toString());
            data.put("groupId", chatGroup.getId().toString());
            data.put("senderId", sender.getId().toString());

            // Create notification content
            String notificationTitle = chatGroup.getType() == ChatGroup.GroupType.DIRECT_MESSAGE
                ? sender.getName()
                : chatGroup.getName();

            String messagePreview = message.getContent();
            if (messagePreview != null && messagePreview.length() > 100) {
                messagePreview = messagePreview.substring(0, 97) + "...";
            }

            String notificationBody = chatGroup.getType() == ChatGroup.GroupType.DIRECT_MESSAGE
                ? messagePreview
                : sender.getName() + ": " + messagePreview;

            // Send bulk notification
            notificationService.sendBulkNotification(
                tokens,
                "💬 " + notificationTitle,
                notificationBody,
                data
            );

            System.out.println("Sent Firebase push notifications to " + tokens.size() + " users for message: " + message.getId());

        } catch (Exception e) {
            System.err.println("Failed to send Firebase push notification for message " + message.getId() + ": " + e.getMessage());
            // Don't throw - notification failure shouldn't break message sending
        }
    }
    
    private boolean isUserOnline(User user) {
        // This would typically check against a Redis cache or session store
        // For now, return a simple heuristic based on last login
        return user.getLastLogin() != null && 
               user.getLastLogin().isAfter(LocalDateTime.now().minusMinutes(5));
    }
    
    private String convertUserIdsToJson(List<UUID> userIds) {
        // Simple JSON conversion - in production, use Jackson or Gson
        return userIds.stream()
            .map(uuid -> "\"" + uuid.toString() + "\"")
            .collect(Collectors.joining(",", "[", "]"));
    }
    
    private void sendMentionNotifications(Message message, List<UUID> mentionedUserIds) {
        // Implementation for sending push notifications to mentioned users
        // This would integrate with FCM or similar service
    }
    
    private List<Message> searchMessagesInSpecificGroups(User user, ChatSearchRequest request) {
        // Implementation for searching in specific groups
        return List.of(); // Placeholder
    }
    
    private List<Message> applySearchFilters(List<Message> messages, ChatSearchRequest request) {
        // Apply date filters, message type filters, etc.
        return messages; // Placeholder
    }
    
    /**
     * Resolve optimized media URL for MessageResponse
     * Returns optimized URL if available, otherwise returns original URL
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