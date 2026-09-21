package com.churchapp.controller;

import com.churchapp.dto.MembershipResponse;
import com.churchapp.dto.OrganizationInviteLinkResponse;
import com.churchapp.repository.UserRepository;
import com.churchapp.service.OrganizationInvitationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Invite links for FAMILY organizations. Lives under /organizations alongside
 * OrganizationController; paths are chosen so they never collide with /{orgId} routes
 * ("invite" and "invite-links" are literal segments, and {orgId} routes have distinct suffixes).
 *
 *  POST   /organizations/{orgId}/invite-links            admin  -> mint a new link
 *  GET    /organizations/{orgId}/invite-links            member -> list active links
 *  GET    /organizations/{orgId}/invite-links/current    admin  -> newest active link (creates one if none)
 *  GET    /organizations/invite/{code}                   PUBLIC -> preview (see SecurityConfig)
 *  POST   /organizations/invite/{code}/join              auth   -> join as Family Primary
 *  DELETE /organizations/invite-links/{linkId}           auth   -> deactivate
 */
@RestController
@RequestMapping("/organizations")
@RequiredArgsConstructor
@Slf4j
public class OrganizationInvitationController {

    private final OrganizationInvitationService invitationService;
    private final UserRepository userRepository;

    private UUID getUserId(User securityUser) {
        return userRepository.findByEmail(securityUser.getUsername())
            .map(com.churchapp.entity.User::getId)
            .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @PostMapping("/{orgId}/invite-links")
    public ResponseEntity<OrganizationInviteLinkResponse> createInviteLink(
            @PathVariable UUID orgId,
            @AuthenticationPrincipal User userDetails) {
        UUID userId = getUserId(userDetails);
        log.info("User {} creating family invite link for org {}", userId, orgId);
        OrganizationInviteLinkResponse response = invitationService.createInviteLink(orgId, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{orgId}/invite-links")
    public ResponseEntity<List<OrganizationInviteLinkResponse>> getInviteLinks(
            @PathVariable UUID orgId,
            @AuthenticationPrincipal User userDetails) {
        UUID userId = getUserId(userDetails);
        return ResponseEntity.ok(invitationService.getActiveLinksForOrganization(orgId, userId));
    }

    @GetMapping("/{orgId}/invite-links/current")
    public ResponseEntity<OrganizationInviteLinkResponse> getOrCreateCurrentLink(
            @PathVariable UUID orgId,
            @AuthenticationPrincipal User userDetails) {
        UUID userId = getUserId(userDetails);
        return ResponseEntity.ok(invitationService.getOrCreateActiveLink(orgId, userId));
    }

    /** Public preview so an invitee can see which family they're joining before logging in. */
    @GetMapping("/invite/{inviteCode}")
    public ResponseEntity<OrganizationInviteLinkResponse> getInviteLinkInfo(@PathVariable String inviteCode) {
        return ResponseEntity.ok(invitationService.getInviteLinkInfo(inviteCode));
    }

    @PostMapping("/invite/{inviteCode}/join")
    public ResponseEntity<MembershipResponse> joinViaInviteLink(
            @PathVariable String inviteCode,
            @AuthenticationPrincipal User userDetails) {
        UUID userId = getUserId(userDetails);
        log.info("User {} joining family via invite link {}", userId, inviteCode);
        MembershipResponse response = invitationService.joinViaInviteLink(inviteCode, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @DeleteMapping("/invite-links/{linkId}")
    public ResponseEntity<Void> deactivateInviteLink(
            @PathVariable UUID linkId,
            @AuthenticationPrincipal User userDetails) {
        UUID userId = getUserId(userDetails);
        log.info("User {} deactivating family invite link {}", userId, linkId);
        invitationService.deactivateInviteLink(linkId, userId);
        return ResponseEntity.noContent().build();
    }
}
