package com.churchapp.controller;

import com.churchapp.dto.GroupInvitationRequest;
import com.churchapp.dto.GroupInvitationResponse;
import com.churchapp.dto.GroupInviteLinkResponse;
import com.churchapp.dto.MembershipResponse;
import com.churchapp.repository.UserRepository;
import com.churchapp.service.GroupInvitationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/groups")
@RequiredArgsConstructor
@Slf4j
public class GroupInvitationController {

    private final GroupInvitationService invitationService;
    private final UserRepository userRepository;

    // Helper method to get user ID from Spring Security User
    private UUID getUserId(User securityUser) {
        return userRepository.findByEmail(securityUser.getUsername())
            .map(com.churchapp.entity.User::getId)
            .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // ========================================================================
    // DIRECT USER INVITATIONS
    // ========================================================================

    /**
     * Create a direct invitation for a user to join a group
     */
    @PostMapping("/{groupId}/invitations")
    public ResponseEntity<GroupInvitationResponse> createInvitation(
            @PathVariable UUID groupId,
            @Valid @RequestBody GroupInvitationRequest request,
            @AuthenticationPrincipal User userDetails) {

        UUID inviterId = getUserId(userDetails);
        log.info("User {} inviting {} to group {}",
            inviterId, request.getInvitedUserId(), groupId);

        GroupInvitationResponse response = invitationService.createInvitation(
            groupId, inviterId, request.getInvitedUserId(), request.getMessage()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Get all pending invitations for the current user
     */
    @GetMapping("/invitations/pending")
    public ResponseEntity<List<GroupInvitationResponse>> getMyPendingInvitations(
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        List<GroupInvitationResponse> invitations =
            invitationService.getPendingInvitations(userId);

        return ResponseEntity.ok(invitations);
    }

    /**
     * Get count of pending invitations for badge display
     */
    @GetMapping("/invitations/pending/count")
    public ResponseEntity<Long> getPendingInvitationCount(
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        Long count = invitationService.getPendingInvitationCount(userId);

        return ResponseEntity.ok(count);
    }

    /**
     * Accept a pending invitation
     */
    @PostMapping("/invitations/{invitationId}/accept")
    public ResponseEntity<GroupInvitationResponse> acceptInvitation(
            @PathVariable UUID invitationId,
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        log.info("User {} accepting invitation {}", userId, invitationId);

        GroupInvitationResponse response =
            invitationService.acceptInvitation(invitationId, userId);

        return ResponseEntity.ok(response);
    }

    /**
     * Decline a pending invitation
     */
    @PostMapping("/invitations/{invitationId}/decline")
    public ResponseEntity<GroupInvitationResponse> declineInvitation(
            @PathVariable UUID invitationId,
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        log.info("User {} declining invitation {}", userId, invitationId);

        GroupInvitationResponse response =
            invitationService.declineInvitation(invitationId, userId);

        return ResponseEntity.ok(response);
    }

    // ========================================================================
    // SHAREABLE INVITE LINKS
    // ========================================================================

    /**
     * Create a shareable invite link for a group
     */
    @PostMapping("/{groupId}/invite-links")
    public ResponseEntity<GroupInviteLinkResponse> createInviteLink(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        log.info("User {} creating invite link for group {}", userId, groupId);

        GroupInviteLinkResponse response =
            invitationService.createInviteLink(groupId, userId);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Get all active invite links for a group
     */
    @GetMapping("/{groupId}/invite-links")
    public ResponseEntity<List<GroupInviteLinkResponse>> getGroupInviteLinks(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        List<GroupInviteLinkResponse> links =
            invitationService.getActiveLinksForGroup(groupId, userId);

        return ResponseEntity.ok(links);
    }

    /**
     * Get invite link info by code (for previewing before joining)
     * This endpoint is public - no auth required to view link info
     */
    @GetMapping("/invite/{inviteCode}")
    public ResponseEntity<GroupInviteLinkResponse> getInviteLinkInfo(
            @PathVariable String inviteCode) {

        GroupInviteLinkResponse response =
            invitationService.getInviteLinkInfo(inviteCode);

        return ResponseEntity.ok(response);
    }

    /**
     * Join a group via invite link
     */
    @PostMapping("/invite/{inviteCode}/join")
    public ResponseEntity<MembershipResponse> joinViaInviteLink(
            @PathVariable String inviteCode,
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        log.info("User {} joining via invite link {}", userId, inviteCode);

        MembershipResponse response =
            invitationService.joinViaInviteLink(inviteCode, userId);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Deactivate an invite link
     */
    @DeleteMapping("/invite-links/{linkId}")
    public ResponseEntity<Void> deactivateInviteLink(
            @PathVariable UUID linkId,
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        log.info("User {} deactivating invite link {}", userId, linkId);

        invitationService.deactivateInviteLink(linkId, userId);

        return ResponseEntity.noContent().build();
    }
}
