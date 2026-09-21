package com.churchapp.service;

import com.churchapp.dto.MembershipResponse;
import com.churchapp.dto.OrganizationInviteLinkResponse;
import com.churchapp.entity.Organization;
import com.churchapp.entity.OrganizationInviteLink;
import com.churchapp.entity.User;
import com.churchapp.entity.UserOrganizationMembership;
import com.churchapp.repository.OrganizationInviteLinkRepository;
import com.churchapp.repository.OrganizationRepository;
import com.churchapp.repository.UserOrganizationMembershipRepository;
import com.churchapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Shareable invite links for FAMILY organizations.
 *
 * Why a separate service from GroupInvitationService: chat groups and organizations have
 * different membership models (UserGroupMembership vs UserOrganizationMembership with the
 * dual-primary slot system), and families need stricter authorisation - only a family
 * ORG_ADMIN may mint links, whereas any chat-group member can.
 *
 * Error contract (mapped by the global exception handler):
 *  - IllegalArgumentException  -> 400 with the message in developerMessage
 *  - AccessDeniedException     -> 403
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class OrganizationInvitationService {

    private final OrganizationInviteLinkRepository inviteLinkRepository;
    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final UserOrganizationMembershipRepository membershipRepository;
    private final OrganizationService organizationService;
    private final AdminAuthorizationService adminAuthorizationService;

    /** Same property AuthController uses for post-OAuth redirects, so links point at the real frontend. */
    @Value("${frontend.url:http://localhost:3000}")
    private String frontendUrl;

    private static final String INVITE_CODE_CHARACTERS =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    private static final int INVITE_CODE_LENGTH = 12;

    // ------------------------------------------------------------------------
    // Create / list / deactivate (family admins)
    // ------------------------------------------------------------------------

    /**
     * Create a new invite link. Only ORG_ADMINs of the family (or platform admins) may do this.
     * Multiple active links per family are allowed so an admin can revoke one without
     * invalidating the others.
     */
    public OrganizationInviteLinkResponse createInviteLink(UUID orgId, UUID creatorId) {
        User creator = requireUser(creatorId);
        Organization org = requireFamilyOrganization(orgId);
        adminAuthorizationService.requireOrgAdminAccess(creator, orgId);

        OrganizationInviteLink link = new OrganizationInviteLink();
        link.setOrganization(org);
        link.setCreatedBy(creator);
        link.setInviteCode(generateUniqueInviteCode());
        link.setUseCount(0);
        link.setIsActive(true);

        OrganizationInviteLink saved = inviteLinkRepository.save(link);
        log.info("Family invite link {} created for org {} by user {}", saved.getId(), orgId, creatorId);

        return toResponse(saved);
    }

    /**
     * Return the active links for a family. Members can see them (so anyone in the family can
     * share), but creating and revoking stay admin-only.
     */
    @Transactional(readOnly = true)
    public List<OrganizationInviteLinkResponse> getActiveLinksForOrganization(UUID orgId, UUID userId) {
        User user = requireUser(userId);
        requireFamilyOrganization(orgId);

        boolean canView = adminAuthorizationService.hasOrgAdminAccess(user, orgId)
            || organizationService.isMember(userId, orgId);
        if (!canView) {
            throw new AccessDeniedException("You must be a member of this family to view its invite links");
        }

        Long memberCount = membershipRepository.countByOrganizationId(orgId);
        return inviteLinkRepository.findActiveByOrganizationId(orgId)
            .stream()
            .map(link -> OrganizationInviteLinkResponse.fromEntity(link, frontendUrl, memberCount))
            .collect(Collectors.toList());
    }

    /**
     * Convenience for the share panel: reuse the newest active link, or mint one if none exist.
     * Requires admin access because it may create.
     */
    public OrganizationInviteLinkResponse getOrCreateActiveLink(UUID orgId, UUID userId) {
        User user = requireUser(userId);
        requireFamilyOrganization(orgId);
        adminAuthorizationService.requireOrgAdminAccess(user, orgId);

        List<OrganizationInviteLink> active = inviteLinkRepository.findActiveByOrganizationId(orgId);
        if (!active.isEmpty()) {
            return toResponse(active.get(0));
        }
        return createInviteLink(orgId, userId);
    }

    public void deactivateInviteLink(UUID linkId, UUID userId) {
        User user = requireUser(userId);
        OrganizationInviteLink link = inviteLinkRepository.findById(linkId)
            .orElseThrow(() -> new IllegalArgumentException("Invite link not found"));

        UUID orgId = link.getOrganization().getId();
        boolean isLinkCreator = link.getCreatedBy().getId().equals(userId);
        if (!isLinkCreator && !adminAuthorizationService.hasOrgAdminAccess(user, orgId)) {
            throw new AccessDeniedException("You don't have permission to deactivate this link");
        }

        link.setIsActive(false);
        link.setDeactivatedAt(LocalDateTime.now());
        inviteLinkRepository.save(link);
        log.info("Family invite link {} deactivated by user {}", linkId, userId);
    }

    // ------------------------------------------------------------------------
    // Preview / join (invitees)
    // ------------------------------------------------------------------------

    /** Public preview - no auth. Returns only the public-safe fields in the DTO. */
    @Transactional(readOnly = true)
    public OrganizationInviteLinkResponse getInviteLinkInfo(String inviteCode) {
        OrganizationInviteLink link = requireActiveLink(inviteCode);
        return toResponse(link);
    }

    /**
     * Join the family behind an invite link. Reuses OrganizationService.setFamilyPrimary so the
     * dual-primary rules (demote any previous family primary to a GROUP slot, update the user's
     * familyPrimaryOrganization) stay in one place.
     */
    public MembershipResponse joinViaInviteLink(String inviteCode, UUID userId) {
        requireUser(userId);
        OrganizationInviteLink link = requireActiveLink(inviteCode);
        Organization org = link.getOrganization();

        if (org.getType() != Organization.OrganizationType.FAMILY) {
            throw new IllegalArgumentException("This invite link is not for a family group");
        }

        UUID orgId = org.getId();
        if (organizationService.isMember(userId, orgId)) {
            throw new IllegalArgumentException("You are already a member of this family");
        }

        UserOrganizationMembership membership = organizationService.setFamilyPrimary(userId, orgId);
        inviteLinkRepository.incrementUseCount(link.getId());

        log.info("User {} joined family {} via invite link {}", userId, orgId, inviteCode);
        return MembershipResponse.fromOrgMembership(membership);
    }

    // ------------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------------

    private OrganizationInviteLinkResponse toResponse(OrganizationInviteLink link) {
        Long memberCount = link.getOrganization() != null
            ? membershipRepository.countByOrganizationId(link.getOrganization().getId())
            : 0L;
        return OrganizationInviteLinkResponse.fromEntity(link, frontendUrl, memberCount);
    }

    private User requireUser(UUID userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private Organization requireFamilyOrganization(UUID orgId) {
        Organization org = organizationRepository.findActiveById(orgId)
            .orElseThrow(() -> new IllegalArgumentException("Organization not found"));
        if (org.getType() != Organization.OrganizationType.FAMILY) {
            throw new IllegalArgumentException("Invite links are currently available for family groups only");
        }
        return org;
    }

    private OrganizationInviteLink requireActiveLink(String inviteCode) {
        if (inviteCode == null || inviteCode.isBlank()) {
            throw new IllegalArgumentException("Invalid invite link");
        }
        return inviteLinkRepository.findByInviteCodeAndActive(inviteCode.trim())
            .orElseThrow(() -> new IllegalArgumentException("This invite link is invalid or has been turned off"));
    }

    private String generateUniqueInviteCode() {
        SecureRandom random = new SecureRandom();
        String code;
        int attempts = 0;
        do {
            StringBuilder sb = new StringBuilder(INVITE_CODE_LENGTH);
            for (int i = 0; i < INVITE_CODE_LENGTH; i++) {
                sb.append(INVITE_CODE_CHARACTERS.charAt(random.nextInt(INVITE_CODE_CHARACTERS.length())));
            }
            code = sb.toString();
            if (++attempts > 10) {
                throw new IllegalStateException("Failed to generate a unique invite code");
            }
        } while (inviteLinkRepository.existsByInviteCode(code));
        return code;
    }
}
