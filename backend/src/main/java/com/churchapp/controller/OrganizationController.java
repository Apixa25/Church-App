package com.churchapp.controller;

import com.churchapp.dto.*;
import com.churchapp.entity.Organization;
import com.churchapp.entity.UserOrganizationMembership;
import com.churchapp.repository.UserRepository;
import com.churchapp.service.OrganizationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/organizations")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class OrganizationController {

    private final OrganizationService organizationService;
    private final UserRepository userRepository;

    // Helper method to get user ID from Spring Security User
    private UUID getUserId(User securityUser) {
        return userRepository.findByEmail(securityUser.getUsername())
            .map(com.churchapp.entity.User::getId)
            .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // ========================================================================
    // ORGANIZATION CRUD
    // ========================================================================

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<OrganizationResponse> createOrganization(
            @Valid @RequestBody OrganizationRequest request,
            @AuthenticationPrincipal User userDetails) {

        log.info("Creating organization: {} by system admin: {}", request.getName(), userDetails.getUsername());

        Organization org = request.toOrganization();
        Organization created = organizationService.createOrganization(org);

        OrganizationResponse response = OrganizationResponse.fromOrganization(created);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{orgId}")
    public ResponseEntity<OrganizationResponse> getOrganizationById(
            @PathVariable UUID orgId,
            @AuthenticationPrincipal User userDetails) {

        Organization org = organizationService.getOrganizationById(orgId);

        OrganizationResponse response = OrganizationResponse.fromOrganization(org);

        // Add statistics
        response.setMemberCount(organizationService.getMemberCount(orgId));
        response.setPrimaryMemberCount(organizationService.getPrimaryMemberCount(orgId));

        return ResponseEntity.ok(response);
    }

    @GetMapping("/slug/{slug}")
    public ResponseEntity<OrganizationResponse> getOrganizationBySlug(
            @PathVariable String slug,
            @AuthenticationPrincipal User userDetails) {

        Organization org = organizationService.getOrganizationBySlug(slug);

        OrganizationResponse response = OrganizationResponse.fromOrganization(org);
        response.setMemberCount(organizationService.getMemberCount(org.getId()));
        response.setPrimaryMemberCount(organizationService.getPrimaryMemberCount(org.getId()));

        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<Page<OrganizationResponse>> getAllOrganizations(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal User userDetails) {

        Pageable pageable = PageRequest.of(page, size);
        Page<Organization> orgs = organizationService.getAllActiveOrganizations(pageable);

        Page<OrganizationResponse> response = orgs.map(OrganizationResponse::publicFromOrganization);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/search")
    public ResponseEntity<Page<OrganizationResponse>> searchOrganizations(
            @RequestParam String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal User userDetails) {

        Pageable pageable = PageRequest.of(page, size);
        Page<Organization> orgs = organizationService.searchOrganizations(query, pageable);

        Page<OrganizationResponse> response = orgs.map(OrganizationResponse::publicFromOrganization);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{orgId}")
    public ResponseEntity<OrganizationResponse> updateOrganization(
            @PathVariable UUID orgId,
            @Valid @RequestBody OrganizationRequest request,
            @AuthenticationPrincipal User userDetails) {

        // TODO: Add authorization check - only org admins can update

        Organization updates = request.toOrganization();
        Organization updated = organizationService.updateOrganization(orgId, updates);

        OrganizationResponse response = OrganizationResponse.fromOrganization(updated);
        return ResponseEntity.ok(response);
    }

    // ========================================================================
    // MEMBERSHIP MANAGEMENT
    // ========================================================================

    @PostMapping("/{orgId}/join")
    public ResponseEntity<MembershipResponse> joinOrganization(
            @PathVariable UUID orgId,
            @RequestParam(defaultValue = "false") boolean isPrimary,
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        log.info("User {} joining organization {} as {}", userId, orgId, isPrimary ? "PRIMARY" : "SECONDARY");

        UserOrganizationMembership membership = organizationService.joinOrganization(userId, orgId, isPrimary);

        MembershipResponse response = MembershipResponse.fromOrgMembership(membership);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @DeleteMapping("/{orgId}/leave")
    public ResponseEntity<Void> leaveOrganization(
            @PathVariable UUID orgId,
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        log.info("User {} leaving organization {}", userId, orgId);

        organizationService.leaveOrganization(userId, orgId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{orgId}/switch-primary")
    public ResponseEntity<MembershipResponse> switchPrimaryOrganization(
            @PathVariable UUID orgId,
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        log.info("User {} switching primary organization to {}", userId, orgId);

        UserOrganizationMembership membership = organizationService.switchPrimaryOrganization(userId, orgId);

        MembershipResponse response = MembershipResponse.fromOrgMembership(membership);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/switch-primary/can-switch")
    public ResponseEntity<Boolean> canSwitchPrimaryOrganization(
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        boolean canSwitch = organizationService.canSwitchPrimaryOrganization(userId);

        return ResponseEntity.ok(canSwitch);
    }

    @GetMapping("/switch-primary/days-until")
    public ResponseEntity<Long> getDaysUntilCanSwitch(
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        long days = organizationService.getDaysUntilCanSwitch(userId);

        return ResponseEntity.ok(days);
    }

    // ========================================================================
    // USER'S MEMBERSHIPS
    // ========================================================================

    @GetMapping("/my-memberships")
    public ResponseEntity<List<MembershipResponse>> getMyMemberships(
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        List<UserOrganizationMembership> memberships = organizationService.getAllMemberships(userId);

        List<MembershipResponse> response = memberships.stream()
            .map(MembershipResponse::fromOrgMembership)
            .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/my-memberships/primary")
    public ResponseEntity<MembershipResponse> getMyPrimaryMembership(
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        return organizationService.getPrimaryMembership(userId)
            .map(membership -> ResponseEntity.ok(MembershipResponse.fromOrgMembership(membership)))
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/my-memberships/secondary")
    public ResponseEntity<List<MembershipResponse>> getMySecondaryMemberships(
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        List<UserOrganizationMembership> memberships = organizationService.getSecondaryMemberships(userId);

        List<MembershipResponse> response = memberships.stream()
            .map(MembershipResponse::fromOrgMembership)
            .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    // ========================================================================
    // ORGANIZATION STATISTICS
    // ========================================================================

    @GetMapping("/{orgId}/stats")
    public ResponseEntity<OrganizationStatsResponse> getOrganizationStats(
            @PathVariable UUID orgId,
            @AuthenticationPrincipal User userDetails) {

        // TODO: Add authorization check - only members can view stats

        OrganizationStatsResponse stats = new OrganizationStatsResponse();
        stats.setOrganizationId(orgId);
        stats.setMemberCount(organizationService.getMemberCount(orgId));
        stats.setPrimaryMemberCount(organizationService.getPrimaryMemberCount(orgId));

        return ResponseEntity.ok(stats);
    }

    // Inner class for stats response
    @lombok.Data
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class OrganizationStatsResponse {
        private UUID organizationId;
        private Long memberCount;
        private Long primaryMemberCount;
    }
}
