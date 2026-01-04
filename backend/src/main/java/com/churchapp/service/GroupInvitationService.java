package com.churchapp.service;

import com.churchapp.dto.GroupInvitationResponse;
import com.churchapp.dto.GroupInviteLinkResponse;
import com.churchapp.dto.MembershipResponse;
import com.churchapp.entity.*;
import com.churchapp.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class GroupInvitationService {

    private final GroupInvitationRepository invitationRepository;
    private final GroupInviteLinkRepository inviteLinkRepository;
    private final GroupRepository groupRepository;
    private final UserRepository userRepository;
    private final UserGroupMembershipRepository membershipRepository;
    private final NotificationService notificationService;

    @Value("${app.base-url:https://thegathering.app}")
    private String appBaseUrl;

    private static final String INVITE_CODE_CHARACTERS =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    private static final int INVITE_CODE_LENGTH = 12;

    // ========================================================================
    // DIRECT USER INVITATIONS
    // ========================================================================

    /**
     * Create a direct invitation for a user to join a group
     */
    public GroupInvitationResponse createInvitation(
            UUID groupId,
            UUID inviterId,
            UUID invitedUserId,
            String message
    ) {
        // Validate inviter is a member
        if (!membershipRepository.existsByUserIdAndGroupId(inviterId, groupId)) {
            throw new RuntimeException("You must be a member of the group to invite others");
        }

        // Validate group exists and is not deleted
        Group group = groupRepository.findById(groupId)
            .orElseThrow(() -> new RuntimeException("Group not found"));

        if (group.getDeletedAt() != null) {
            throw new RuntimeException("Cannot invite to a deleted group");
        }

        // Validate invited user exists
        User invitedUser = userRepository.findById(invitedUserId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        User inviter = userRepository.findById(inviterId)
            .orElseThrow(() -> new RuntimeException("Inviter not found"));

        // Check if already a member
        if (membershipRepository.existsByUserIdAndGroupId(invitedUserId, groupId)) {
            throw new RuntimeException("User is already a member of this group");
        }

        // Check for existing pending invitation
        if (invitationRepository.existsPendingInvitation(groupId, invitedUserId)) {
            throw new RuntimeException("User already has a pending invitation to this group");
        }

        // Create invitation
        GroupInvitation invitation = new GroupInvitation();
        invitation.setGroup(group);
        invitation.setInviter(inviter);
        invitation.setInvitedUser(invitedUser);
        invitation.setMessage(message);
        invitation.setStatus(GroupInvitation.InvitationStatus.PENDING);

        GroupInvitation saved = invitationRepository.save(invitation);
        log.info("Created group invitation: {} invited {} to group {}",
            inviterId, invitedUserId, groupId);

        // Send notification to invited user
        sendInvitationNotification(saved);

        return GroupInvitationResponse.fromEntity(saved);
    }

    /**
     * Accept a pending invitation
     */
    public GroupInvitationResponse acceptInvitation(UUID invitationId, UUID userId) {
        GroupInvitation invitation = invitationRepository.findById(invitationId)
            .orElseThrow(() -> new RuntimeException("Invitation not found"));

        // Verify this invitation belongs to the user
        if (!invitation.getInvitedUser().getId().equals(userId)) {
            throw new RuntimeException("This invitation was not sent to you");
        }

        if (invitation.getStatus() != GroupInvitation.InvitationStatus.PENDING) {
            throw new RuntimeException("This invitation has already been responded to");
        }

        // Verify group still exists
        if (invitation.getGroup().getDeletedAt() != null) {
            throw new RuntimeException("This group no longer exists");
        }

        // Update invitation status
        invitation.setStatus(GroupInvitation.InvitationStatus.ACCEPTED);
        invitation.setRespondedAt(LocalDateTime.now());
        invitationRepository.save(invitation);

        // Add user to group
        joinGroupViaInvite(userId, invitation.getGroup().getId());

        log.info("User {} accepted invitation to group {}",
            userId, invitation.getGroup().getId());

        return GroupInvitationResponse.fromEntity(invitation);
    }

    /**
     * Decline a pending invitation
     */
    public GroupInvitationResponse declineInvitation(UUID invitationId, UUID userId) {
        GroupInvitation invitation = invitationRepository.findById(invitationId)
            .orElseThrow(() -> new RuntimeException("Invitation not found"));

        if (!invitation.getInvitedUser().getId().equals(userId)) {
            throw new RuntimeException("This invitation was not sent to you");
        }

        if (invitation.getStatus() != GroupInvitation.InvitationStatus.PENDING) {
            throw new RuntimeException("This invitation has already been responded to");
        }

        invitation.setStatus(GroupInvitation.InvitationStatus.DECLINED);
        invitation.setRespondedAt(LocalDateTime.now());
        invitationRepository.save(invitation);

        log.info("User {} declined invitation to group {}",
            userId, invitation.getGroup().getId());

        return GroupInvitationResponse.fromEntity(invitation);
    }

    /**
     * Get all pending invitations for a user
     */
    public List<GroupInvitationResponse> getPendingInvitations(UUID userId) {
        return invitationRepository.findPendingByInvitedUserId(userId)
            .stream()
            .map(GroupInvitationResponse::fromEntity)
            .collect(Collectors.toList());
    }

    /**
     * Get count of pending invitations for badge display
     */
    public Long getPendingInvitationCount(UUID userId) {
        return invitationRepository.countPendingByInvitedUserId(userId);
    }

    // ========================================================================
    // SHAREABLE INVITE LINKS
    // ========================================================================

    /**
     * Create a shareable invite link for a group
     */
    public GroupInviteLinkResponse createInviteLink(UUID groupId, UUID userId) {
        // Validate user is a member
        if (!membershipRepository.existsByUserIdAndGroupId(userId, groupId)) {
            throw new RuntimeException("You must be a member of the group to create invite links");
        }

        Group group = groupRepository.findById(groupId)
            .orElseThrow(() -> new RuntimeException("Group not found"));

        if (group.getDeletedAt() != null) {
            throw new RuntimeException("Cannot create invite link for a deleted group");
        }

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        // Generate unique invite code
        String inviteCode = generateUniqueInviteCode();

        GroupInviteLink link = new GroupInviteLink();
        link.setGroup(group);
        link.setCreatedBy(user);
        link.setInviteCode(inviteCode);
        link.setUseCount(0);
        link.setIsActive(true);

        GroupInviteLink saved = inviteLinkRepository.save(link);
        log.info("Created invite link {} for group {} by user {}",
            inviteCode, groupId, userId);

        return GroupInviteLinkResponse.fromEntity(saved, appBaseUrl);
    }

    /**
     * Get invite link info by code (public endpoint - for previewing before joining)
     */
    public GroupInviteLinkResponse getInviteLinkInfo(String inviteCode) {
        GroupInviteLink link = inviteLinkRepository.findByInviteCodeAndActive(inviteCode)
            .orElseThrow(() -> new RuntimeException("Invalid or expired invite link"));

        return GroupInviteLinkResponse.fromEntity(link, appBaseUrl);
    }

    /**
     * Join a group via invite link
     */
    public MembershipResponse joinViaInviteLink(String inviteCode, UUID userId) {
        GroupInviteLink link = inviteLinkRepository.findByInviteCodeAndActive(inviteCode)
            .orElseThrow(() -> new RuntimeException("Invalid or expired invite link"));

        UUID groupId = link.getGroup().getId();

        // Check if already a member
        if (membershipRepository.existsByUserIdAndGroupId(userId, groupId)) {
            throw new RuntimeException("You are already a member of this group");
        }

        // Join the group (bypasses normal canJoinGroup check)
        UserGroupMembership membership = joinGroupViaInvite(userId, groupId);

        // Increment use count
        inviteLinkRepository.incrementUseCount(link.getId());

        log.info("User {} joined group {} via invite link {}",
            userId, groupId, inviteCode);

        return MembershipResponse.fromGroupMembership(membership);
    }

    /**
     * Get all active invite links for a group
     */
    public List<GroupInviteLinkResponse> getActiveLinksForGroup(UUID groupId, UUID userId) {
        // Verify user is a member
        if (!membershipRepository.existsByUserIdAndGroupId(userId, groupId)) {
            throw new RuntimeException("You must be a member of the group");
        }

        return inviteLinkRepository.findActiveByGroupId(groupId)
            .stream()
            .map(link -> GroupInviteLinkResponse.fromEntity(link, appBaseUrl))
            .collect(Collectors.toList());
    }

    /**
     * Deactivate an invite link
     */
    public void deactivateInviteLink(UUID linkId, UUID userId) {
        GroupInviteLink link = inviteLinkRepository.findById(linkId)
            .orElseThrow(() -> new RuntimeException("Invite link not found"));

        UUID groupId = link.getGroup().getId();

        // Check permissions: link creator, or group moderator/creator can deactivate
        boolean isLinkCreator = link.getCreatedBy().getId().equals(userId);

        UserGroupMembership membership = membershipRepository
            .findByUserIdAndGroupId(userId, groupId)
            .orElse(null);

        boolean isGroupLeader = membership != null && (
            membership.getRole() == UserGroupMembership.GroupRole.CREATOR ||
            membership.getRole() == UserGroupMembership.GroupRole.MODERATOR
        );

        if (!isLinkCreator && !isGroupLeader) {
            throw new RuntimeException("You don't have permission to deactivate this link");
        }

        link.setIsActive(false);
        link.setDeactivatedAt(LocalDateTime.now());
        inviteLinkRepository.save(link);

        log.info("Invite link {} deactivated by user {}", linkId, userId);
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    /**
     * Join group via invitation (bypasses normal canJoinGroup checks)
     */
    private UserGroupMembership joinGroupViaInvite(UUID userId, UUID groupId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Group group = groupRepository.findById(groupId)
            .orElseThrow(() -> new RuntimeException("Group not found"));

        // Double check not already a member
        if (membershipRepository.existsByUserIdAndGroupId(userId, groupId)) {
            throw new RuntimeException("User is already a member of this group");
        }

        UserGroupMembership membership = new UserGroupMembership();
        membership.setUser(user);
        membership.setGroup(group);
        membership.setRole(UserGroupMembership.GroupRole.MEMBER);
        membership.setIsMuted(false);
        membership.setJoinedAt(LocalDateTime.now());
        membership.setCreatedAt(LocalDateTime.now());

        UserGroupMembership saved = membershipRepository.save(membership);

        // Increment member count
        groupRepository.incrementMemberCount(groupId);

        log.info("User {} joined group {} via invitation", userId, groupId);
        return saved;
    }

    /**
     * Generate a unique random invite code
     */
    private String generateUniqueInviteCode() {
        SecureRandom random = new SecureRandom();
        String code;
        int attempts = 0;

        do {
            StringBuilder sb = new StringBuilder(INVITE_CODE_LENGTH);
            for (int i = 0; i < INVITE_CODE_LENGTH; i++) {
                sb.append(INVITE_CODE_CHARACTERS.charAt(
                    random.nextInt(INVITE_CODE_CHARACTERS.length())
                ));
            }
            code = sb.toString();
            attempts++;

            if (attempts > 10) {
                throw new RuntimeException("Failed to generate unique invite code");
            }
        } while (inviteLinkRepository.existsByInviteCode(code));

        return code;
    }

    /**
     * Send push notification for invitation
     */
    private void sendInvitationNotification(GroupInvitation invitation) {
        try {
            User invitedUser = invitation.getInvitedUser();
            User inviter = invitation.getInviter();
            Group group = invitation.getGroup();

            if (invitedUser.getFcmToken() != null && !invitedUser.getFcmToken().isEmpty()) {
                String title = "Group Invitation";
                String body = inviter.getName() + " invited you to join " + group.getName();

                Map<String, String> data = new HashMap<>();
                data.put("type", "group_invitation");
                data.put("invitationId", invitation.getId().toString());
                data.put("groupId", group.getId().toString());
                data.put("actionUrl", "/invitations");

                notificationService.sendNotification(
                    invitedUser.getFcmToken(), title, body, data
                );
            }
        } catch (Exception e) {
            log.error("Failed to send invitation notification", e);
            // Don't fail the invitation creation if notification fails
        }
    }
}
