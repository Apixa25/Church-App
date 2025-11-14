package com.churchapp.controller;

import com.churchapp.dto.*;
import com.churchapp.entity.Group;
import com.churchapp.entity.UserGroupMembership;
import com.churchapp.repository.UserRepository;
import com.churchapp.service.GroupService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class GroupController {

    private final GroupService groupService;
    private final UserRepository userRepository;

    // Helper method to get user ID from Spring Security User
    private UUID getUserId(User securityUser) {
        return userRepository.findByEmail(securityUser.getUsername())
            .map(com.churchapp.entity.User::getId)
            .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // ========================================================================
    // GROUP CRUD
    // ========================================================================

    @PostMapping
    public ResponseEntity<GroupResponse> createGroup(
            @Valid @RequestBody GroupRequest request,
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        log.info("User {} creating group: {}", userId, request.getName());

        Group group = request.toGroup();
        Group created = groupService.createGroup(userId, group);

        GroupResponse response = GroupResponse.fromGroup(created);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{groupId}")
    public ResponseEntity<GroupResponse> getGroupById(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        Group group = groupService.getGroupById(groupId);

        // Check if user can view this group
        if (!groupService.canViewGroup(userId, group)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        GroupResponse response = GroupResponse.fromGroup(group);

        // Add user's membership info if they're a member
        if (groupService.isMember(userId, groupId)) {
            UserGroupMembership membership = groupService.getUserGroups(userId).stream()
                .filter(m -> m.getGroup().getId().equals(groupId))
                .findFirst()
                .orElse(null);

            if (membership != null) {
                response.setUserRole(membership.getRole().name());
                response.setIsMuted(membership.getIsMuted());
                response.setJoinedAt(membership.getJoinedAt());
            }
        }

        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<Page<GroupResponse>> getAllPublicGroups(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal User userDetails) {

        Pageable pageable = PageRequest.of(page, size);
        Page<Group> groups = groupService.getAllPublicGroups(pageable);

        Page<GroupResponse> response = groups.map(GroupResponse::publicFromGroup);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/search")
    public ResponseEntity<Page<GroupResponse>> searchGroups(
            @RequestParam String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal User userDetails) {

        Pageable pageable = PageRequest.of(page, size);
        Page<Group> groups = groupService.searchGroups(query, pageable);

        Page<GroupResponse> response = groups.map(GroupResponse::publicFromGroup);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/by-tags")
    public ResponseEntity<Page<GroupResponse>> findGroupsByTags(
            @RequestParam List<String> tags,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal User userDetails) {

        Pageable pageable = PageRequest.of(page, size);
        Page<Group> groups = groupService.findGroupsByTags(tags, pageable);

        Page<GroupResponse> response = groups.map(GroupResponse::publicFromGroup);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/org/{orgId}")
    public ResponseEntity<Page<GroupResponse>> getOrgPrivateGroups(
            @PathVariable UUID orgId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal User userDetails) {

        Pageable pageable = PageRequest.of(page, size);
        Page<Group> groups = groupService.getOrgPrivateGroups(orgId, pageable);

        Page<GroupResponse> response = groups.map(GroupResponse::publicFromGroup);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{groupId}")
    public ResponseEntity<GroupResponse> updateGroup(
            @PathVariable UUID groupId,
            @Valid @RequestBody GroupRequest request,
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        Group updates = request.toGroup();
        Group updated = groupService.updateGroup(groupId, userId, updates);

        GroupResponse response = GroupResponse.fromGroup(updated);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{groupId}")
    public ResponseEntity<Void> deleteGroup(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        log.info("User {} deleting group {}", userId, groupId);

        groupService.deleteGroup(groupId, userId);
        return ResponseEntity.noContent().build();
    }

    // ========================================================================
    // MEMBERSHIP MANAGEMENT
    // ========================================================================

    @PostMapping("/{groupId}/join")
    public ResponseEntity<MembershipResponse> joinGroup(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        log.info("User {} joining group {}", userId, groupId);

        UserGroupMembership membership = groupService.joinGroup(userId, groupId);

        MembershipResponse response = MembershipResponse.fromGroupMembership(membership);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @DeleteMapping("/{groupId}/leave")
    public ResponseEntity<Void> leaveGroup(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        log.info("User {} leaving group {}", userId, groupId);

        groupService.leaveGroup(userId, groupId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{groupId}/mute")
    public ResponseEntity<Void> muteGroup(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        log.info("User {} muting group {}", userId, groupId);

        groupService.muteGroup(userId, groupId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{groupId}/unmute")
    public ResponseEntity<Void> unmuteGroup(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        log.info("User {} unmuting group {}", userId, groupId);

        groupService.unmuteGroup(userId, groupId);
        return ResponseEntity.ok().build();
    }

    // ========================================================================
    // USER'S MEMBERSHIPS
    // ========================================================================

    @GetMapping("/my-groups")
    public ResponseEntity<List<MembershipResponse>> getMyGroups(
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        List<UserGroupMembership> memberships = groupService.getUserGroups(userId);

        List<MembershipResponse> response = memberships.stream()
            .map(MembershipResponse::fromGroupMembership)
            .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/my-groups/unmuted")
    public ResponseEntity<List<MembershipResponse>> getMyUnmutedGroups(
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        List<UserGroupMembership> memberships = groupService.getUnmutedUserGroups(userId);

        List<MembershipResponse> response = memberships.stream()
            .map(MembershipResponse::fromGroupMembership)
            .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/my-groups/muted")
    public ResponseEntity<List<MembershipResponse>> getMyMutedGroups(
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        List<UserGroupMembership> memberships = groupService.getMutedUserGroups(userId);

        List<MembershipResponse> response = memberships.stream()
            .map(MembershipResponse::fromGroupMembership)
            .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    // ========================================================================
    // GROUP CHECKS
    // ========================================================================

    @GetMapping("/{groupId}/can-join")
    public ResponseEntity<Boolean> canJoinGroup(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        Group group = groupService.getGroupById(groupId);
        boolean canJoin = groupService.canJoinGroup(userId, group);

        return ResponseEntity.ok(canJoin);
    }

    @GetMapping("/{groupId}/is-member")
    public ResponseEntity<Boolean> isMember(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        boolean member = groupService.isMember(userId, groupId);

        return ResponseEntity.ok(member);
    }

    @GetMapping("/{groupId}/is-creator")
    public ResponseEntity<Boolean> isCreator(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        boolean creator = groupService.isCreator(userId, groupId);

        return ResponseEntity.ok(creator);
    }

    // ========================================================================
    // GROUP STATISTICS
    // ========================================================================

    @GetMapping("/{groupId}/member-count")
    public ResponseEntity<Long> getMemberCount(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal User userDetails) {

        Long count = groupService.getMemberCount(groupId);
        return ResponseEntity.ok(count);
    }
}
