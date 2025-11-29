package com.churchapp.controller;

import com.churchapp.entity.User;
import com.churchapp.entity.UserOrganizationGroup;
import com.churchapp.service.OrganizationGroupService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/organizations")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8100", "capacitor://localhost"})
public class OrganizationGroupController {

    private final OrganizationGroupService organizationGroupService;

    /**
     * Follow an organization as a group (feed-only view)
     */
    @PostMapping("/{organizationId}/follow-as-group")
    public ResponseEntity<?> followOrganizationAsGroup(
            @PathVariable UUID organizationId,
            @AuthenticationPrincipal User user) {
        try {
            organizationGroupService.followOrganizationAsGroup(user.getId(), organizationId);
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
            @AuthenticationPrincipal User user) {
        try {
            organizationGroupService.unfollowOrganizationAsGroup(user.getId(), organizationId);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Get all organizations user follows as groups
     */
    @GetMapping("/followed-as-groups")
    public ResponseEntity<List<UserOrganizationGroup>> getFollowedOrganizations(
            @AuthenticationPrincipal User user) {
        List<UserOrganizationGroup> followed = organizationGroupService
            .getFollowedOrganizations(user.getId());
        return ResponseEntity.ok(followed);
    }

    /**
     * Check if user can follow an organization as a group
     */
    @GetMapping("/{organizationId}/can-follow-as-group")
    public ResponseEntity<Boolean> canFollowAsGroup(
            @PathVariable UUID organizationId,
            @AuthenticationPrincipal User user) {
        boolean canFollow = organizationGroupService
            .canFollowAsGroup(user.getId(), organizationId);
        return ResponseEntity.ok(canFollow);
    }

    /**
     * Check if user is following an organization as a group
     */
    @GetMapping("/{organizationId}/is-following-as-group")
    public ResponseEntity<Boolean> isFollowingAsGroup(
            @PathVariable UUID organizationId,
            @AuthenticationPrincipal User user) {
        boolean isFollowing = organizationGroupService
            .isFollowingAsGroup(user.getId(), organizationId);
        return ResponseEntity.ok(isFollowing);
    }

    /**
     * Mute an organization-as-group
     */
    @PostMapping("/{organizationId}/mute-as-group")
    public ResponseEntity<?> muteOrganizationAsGroup(
            @PathVariable UUID organizationId,
            @AuthenticationPrincipal User user) {
        try {
            organizationGroupService.muteOrganizationAsGroup(user.getId(), organizationId);
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
            @AuthenticationPrincipal User user) {
        try {
            organizationGroupService.unmuteOrganizationAsGroup(user.getId(), organizationId);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}

