package com.churchapp.controller;

import com.churchapp.dto.UserOrganizationGroupResponse;
import com.churchapp.entity.UserOrganizationGroup;
import com.churchapp.repository.UserRepository;
import com.churchapp.service.OrganizationGroupService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/organizations")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8100", "capacitor://localhost"})
public class OrganizationGroupController {

    private final OrganizationGroupService organizationGroupService;
    private final UserRepository userRepository;

    // Helper method to get user ID from Spring Security User
    private UUID getUserId(User securityUser) {
        return userRepository.findByEmail(securityUser.getUsername())
            .map(com.churchapp.entity.User::getId)
            .orElseThrow(() -> new RuntimeException("User not found"));
    }

    /**
     * Follow an organization as a group (feed-only view)
     */
    @PostMapping("/{organizationId}/follow-as-group")
    public ResponseEntity<?> followOrganizationAsGroup(
            @PathVariable UUID organizationId,
            @AuthenticationPrincipal User securityUser) {
        try {
            UUID userId = getUserId(securityUser);
            organizationGroupService.followOrganizationAsGroup(userId, organizationId);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Unfollow an organization as a group
     */
    @DeleteMapping("/{organizationId}/follow-as-group")
    public ResponseEntity<?> unfollowOrganizationAsGroup(
            @PathVariable UUID organizationId,
            @AuthenticationPrincipal User securityUser) {
        try {
            UUID userId = getUserId(securityUser);
            organizationGroupService.unfollowOrganizationAsGroup(userId, organizationId);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Get all organizations user follows as groups
     */
    @GetMapping("/followed-as-groups")
    public ResponseEntity<List<UserOrganizationGroupResponse>> getFollowedOrganizations(
            @AuthenticationPrincipal User securityUser) {
        UUID userId = getUserId(securityUser);
        List<UserOrganizationGroup> followed = organizationGroupService
            .getFollowedOrganizations(userId);
        List<UserOrganizationGroupResponse> response = followed.stream()
            .map(UserOrganizationGroupResponse::fromEntity)
            .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    /**
     * Check if user can follow an organization as a group
     */
    @GetMapping("/{organizationId}/can-follow-as-group")
    public ResponseEntity<Boolean> canFollowAsGroup(
            @PathVariable UUID organizationId,
            @AuthenticationPrincipal User securityUser) {
        UUID userId = getUserId(securityUser);
        boolean canFollow = organizationGroupService
            .canFollowAsGroup(userId, organizationId);
        return ResponseEntity.ok(canFollow);
    }

    /**
     * Check if user is following an organization as a group
     */
    @GetMapping("/{organizationId}/is-following-as-group")
    public ResponseEntity<Boolean> isFollowingAsGroup(
            @PathVariable UUID organizationId,
            @AuthenticationPrincipal User securityUser) {
        UUID userId = getUserId(securityUser);
        boolean isFollowing = organizationGroupService
            .isFollowingAsGroup(userId, organizationId);
        return ResponseEntity.ok(isFollowing);
    }

    /**
     * Mute an organization-as-group
     */
    @PostMapping("/{organizationId}/mute-as-group")
    public ResponseEntity<?> muteOrganizationAsGroup(
            @PathVariable UUID organizationId,
            @AuthenticationPrincipal User securityUser) {
        try {
            UUID userId = getUserId(securityUser);
            organizationGroupService.muteOrganizationAsGroup(userId, organizationId);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Unmute an organization-as-group
     */
    @PostMapping("/{organizationId}/unmute-as-group")
    public ResponseEntity<?> unmuteOrganizationAsGroup(
            @PathVariable UUID organizationId,
            @AuthenticationPrincipal User securityUser) {
        try {
            UUID userId = getUserId(securityUser);
            organizationGroupService.unmuteOrganizationAsGroup(userId, organizationId);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}

