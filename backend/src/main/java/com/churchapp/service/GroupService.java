package com.churchapp.service;

import com.churchapp.entity.Group;
import com.churchapp.entity.User;
import com.churchapp.entity.UserGroupCreationLog;
import com.churchapp.entity.UserGroupMembership;
import com.churchapp.repository.GroupRepository;
import com.churchapp.repository.UserGroupCreationLogRepository;
import com.churchapp.repository.UserGroupMembershipRepository;
import com.churchapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class GroupService {

    private final GroupRepository groupRepository;
    private final UserGroupMembershipRepository membershipRepository;
    private final UserRepository userRepository;
    private final UserGroupCreationLogRepository groupCreationLogRepository;

    private static final int MAX_GROUPS_PER_MONTH = 3;

    // ========================================================================
    // GROUP CRUD
    // ========================================================================

    public Group createGroup(UUID creatorUserId, Group group) {
        User creator = userRepository.findById(creatorUserId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + creatorUserId));

        // Check group creation limit (3 per month)
        LocalDateTime oneMonthAgo = LocalDateTime.now().minus(1, ChronoUnit.MONTHS);
        long groupsCreatedThisMonth = groupCreationLogRepository.countByUserIdSince(creatorUserId, oneMonthAgo);
        
        if (groupsCreatedThisMonth >= MAX_GROUPS_PER_MONTH) {
            throw new RuntimeException(
                String.format("Group creation limit reached. You can create up to %d groups per month.", 
                    MAX_GROUPS_PER_MONTH)
            );
        }

        // Force PUBLIC type for new groups (as per requirements)
        group.setType(Group.GroupType.PUBLIC);

        group.setCreatedByUser(creator);
        group.setCreatedAt(LocalDateTime.now());
        group.setUpdatedAt(LocalDateTime.now());
        group.setMemberCount(1); // Creator is first member

        // If it's an ORG_PRIVATE group, link it to creator's primary organization
        // Note: This won't happen now since we force PUBLIC, but keeping for backward compatibility
        if (group.getType() == Group.GroupType.ORG_PRIVATE && creator.getPrimaryOrganization() != null) {
            group.setCreatedByOrg(creator.getPrimaryOrganization());
        }

        Group saved = groupRepository.save(group);

        // Log group creation for limit tracking
        UserGroupCreationLog creationLog = new UserGroupCreationLog();
        creationLog.setUser(creator);
        creationLog.setCreatedAt(LocalDateTime.now());
        groupCreationLogRepository.save(creationLog);

        // Auto-add creator as CREATOR
        UserGroupMembership creatorMembership = new UserGroupMembership();
        creatorMembership.setUser(creator);
        creatorMembership.setGroup(saved);
        creatorMembership.setRole(UserGroupMembership.GroupRole.CREATOR);
        creatorMembership.setIsMuted(false);
        creatorMembership.setJoinedAt(LocalDateTime.now());
        creatorMembership.setCreatedAt(LocalDateTime.now());
        membershipRepository.save(creatorMembership);

        log.info("Group created: {} by user {}", saved.getName(), creatorUserId);
        return saved;
    }

    public Group getGroupById(UUID groupId) {
        return groupRepository.findById(groupId)
            .orElseThrow(() -> new RuntimeException("Group not found with id: " + groupId));
    }

    public Page<Group> searchGroups(String searchTerm, Pageable pageable) {
        return groupRepository.searchGroups(searchTerm, pageable);
    }

    public Page<Group> getAllPublicGroups(Pageable pageable) {
        return groupRepository.findAllPublicGroups(pageable);
    }

    public Page<Group> getOrgPrivateGroups(UUID orgId, Pageable pageable) {
        return groupRepository.findOrgPrivateGroupsByOrgId(orgId, pageable);
    }

    public Group updateGroup(UUID groupId, UUID requestingUserId, Group updates) {
        Group group = getGroupById(groupId);

        // Verify user is creator or moderator
        UserGroupMembership membership = membershipRepository
            .findByUserIdAndGroupId(requestingUserId, groupId)
            .orElseThrow(() -> new RuntimeException("User is not a member of this group"));

        if (membership.getRole() != UserGroupMembership.GroupRole.CREATOR &&
            membership.getRole() != UserGroupMembership.GroupRole.MODERATOR) {
            throw new RuntimeException("Only creators and moderators can update group");
        }

        if (updates.getName() != null) {
            group.setName(updates.getName());
        }
        if (updates.getDescription() != null) {
            group.setDescription(updates.getDescription());
        }
        if (updates.getTags() != null) {
            group.setTags(updates.getTags());
        }
        if (updates.getSettings() != null) {
            group.setSettings(updates.getSettings());
        }

        group.setUpdatedAt(LocalDateTime.now());
        return groupRepository.save(group);
    }

    public void deleteGroup(UUID groupId, UUID requestingUserId) {
        Group group = getGroupById(groupId);

        // Verify user is creator
        UserGroupMembership membership = membershipRepository
            .findByUserIdAndGroupId(requestingUserId, groupId)
            .orElseThrow(() -> new RuntimeException("User is not a member of this group"));

        if (membership.getRole() != UserGroupMembership.GroupRole.CREATOR) {
            throw new RuntimeException("Only the creator can delete the group");
        }

        // Soft delete
        group.setDeletedAt(LocalDateTime.now());
        groupRepository.save(group);
        log.info("Group {} deleted by user {}", groupId, requestingUserId);
    }

    // ========================================================================
    // MEMBERSHIP MANAGEMENT
    // ========================================================================

    public UserGroupMembership joinGroup(UUID userId, UUID groupId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        Group group = getGroupById(groupId);

        // Check if already a member
        Optional<UserGroupMembership> existing = membershipRepository.findByUserIdAndGroupId(userId, groupId);
        if (existing.isPresent()) {
            throw new RuntimeException("User is already a member of this group");
        }

        // Validate access based on group type
        if (!canJoinGroup(userId, group)) {
            throw new RuntimeException("User does not have permission to join this group");
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

        log.info("User {} joined group {}", userId, groupId);
        return saved;
    }

    public void leaveGroup(UUID userId, UUID groupId) {
        UserGroupMembership membership = membershipRepository
            .findByUserIdAndGroupId(userId, groupId)
            .orElseThrow(() -> new RuntimeException("User is not a member of this group"));

        // Creator cannot leave their own group
        if (membership.getRole() == UserGroupMembership.GroupRole.CREATOR) {
            throw new RuntimeException("Group creator cannot leave the group. Delete the group instead.");
        }

        membershipRepository.delete(membership);

        // Decrement member count
        groupRepository.decrementMemberCount(groupId);

        log.info("User {} left group {}", userId, groupId);
    }

    public void muteGroup(UUID userId, UUID groupId) {
        membershipRepository.updateMuteStatus(userId, groupId, true);
        log.info("User {} muted group {}", userId, groupId);
    }

    public void unmuteGroup(UUID userId, UUID groupId) {
        membershipRepository.updateMuteStatus(userId, groupId, false);
        log.info("User {} unmuted group {}", userId, groupId);
    }

    // ========================================================================
    // ACCESS VALIDATION
    // ========================================================================

    public boolean canJoinGroup(UUID userId, Group group) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        switch (group.getType()) {
            case PUBLIC:
                return true;

            case ORG_PRIVATE:
                // Must be a member of the same organization
                if (group.getCreatedByOrg() == null) return false;
                if (user.getPrimaryOrganization() == null) return false;
                return user.getPrimaryOrganization().getId().equals(group.getCreatedByOrg().getId());

            case CROSS_ORG:
                // User's primary org must be in allowedOrgIds
                if (user.getPrimaryOrganization() == null) return false;
                return group.getAllowedOrgIds() != null &&
                       group.getAllowedOrgIds().contains(user.getPrimaryOrganization().getId());

            case INVITE_ONLY:
                // Would need invitation system (future feature)
                return false;

            default:
                return false;
        }
    }

    public boolean canViewGroup(UUID userId, Group group) {
        // PUBLIC groups are visible to everyone
        if (group.getType() == Group.GroupType.PUBLIC) {
            return true;
        }

        // For other types, user must be a member
        return membershipRepository.existsByUserIdAndGroupId(userId, group.getId());
    }

    public boolean canPostToGroup(UUID userId, UUID groupId) {
        // Must be a member and not muted (by self or by moderator)
        Optional<UserGroupMembership> membership = membershipRepository.findByUserIdAndGroupId(userId, groupId);
        return membership.isPresent() && !membership.get().getIsMuted();
    }

    // ========================================================================
    // MEMBERSHIP QUERIES
    // ========================================================================

    public List<UserGroupMembership> getUserGroups(UUID userId) {
        return membershipRepository.findByUserId(userId);
    }

    public List<UserGroupMembership> getUnmutedUserGroups(UUID userId) {
        return membershipRepository.findUnmutedByUserId(userId);
    }

    public List<UUID> getUnmutedGroupIds(UUID userId) {
        return membershipRepository.findUnmutedGroupIdsByUserId(userId);
    }

    public List<UserGroupMembership> getMutedUserGroups(UUID userId) {
        return membershipRepository.findMutedByUserId(userId);
    }

    public boolean isMember(UUID userId, UUID groupId) {
        return membershipRepository.existsByUserIdAndGroupId(userId, groupId);
    }

    public boolean isCreator(UUID userId, UUID groupId) {
        Optional<UserGroupMembership> membership = membershipRepository.findByUserIdAndGroupId(userId, groupId);
        return membership.isPresent() && membership.get().getRole() == UserGroupMembership.GroupRole.CREATOR;
    }

    // ========================================================================
    // GROUP STATISTICS
    // ========================================================================

    public Long getMemberCount(UUID groupId) {
        return membershipRepository.countByGroupId(groupId);
    }

    // ========================================================================
    // TAG-BASED DISCOVERY
    // ========================================================================

    public Page<Group> findGroupsByTags(List<String> tags, Pageable pageable) {
        return groupRepository.findByTagsIn(tags, pageable);
    }

    // ========================================================================
    // ADMIN OPERATIONS
    // ========================================================================

    /**
     * Get all groups for admin view
     */
    public Page<Group> getAllGroupsForAdmin(Pageable pageable) {
        return groupRepository.findAllActiveGroups(pageable);
    }

    /**
     * Search groups for admin
     */
    public Page<Group> searchGroupsForAdmin(String searchTerm, Pageable pageable) {
        return groupRepository.searchGroupsForAdmin(searchTerm, pageable);
    }

    /**
     * Admin delete group - PLATFORM_ADMIN can delete any group
     * Also allows group creator to delete their own group
     */
    public void adminDeleteGroup(UUID groupId, UUID requestingUserId) {
        Group group = getGroupById(groupId);
        User requestingUser = userRepository.findById(requestingUserId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        // Check authorization: must be PLATFORM_ADMIN or the group creator
        boolean isPlatformAdmin = requestingUser.getRole() == com.churchapp.entity.User.Role.PLATFORM_ADMIN;
        boolean isCreator = group.getCreatedByUser() != null && 
                           group.getCreatedByUser().getId().equals(requestingUserId);

        if (!isPlatformAdmin && !isCreator) {
            throw new RuntimeException("Only Platform Admins or the group creator can delete a group");
        }

        // Soft delete
        group.setDeletedAt(LocalDateTime.now());
        groupRepository.save(group);
        
        log.info("Group {} deleted by {} (isPlatformAdmin: {}, isCreator: {})", 
            groupId, requestingUserId, isPlatformAdmin, isCreator);
    }

    /**
     * Hard delete group - PLATFORM_ADMIN only, permanently removes the group
     */
    public void hardDeleteGroup(UUID groupId, UUID requestingUserId) {
        Group group = getGroupById(groupId);
        User requestingUser = userRepository.findById(requestingUserId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        // Only PLATFORM_ADMIN can hard delete
        if (requestingUser.getRole() != com.churchapp.entity.User.Role.PLATFORM_ADMIN) {
            throw new RuntimeException("Only Platform Admins can permanently delete a group");
        }

        // Delete all memberships first
        membershipRepository.deleteByGroupId(groupId);
        
        // Then delete the group
        groupRepository.delete(group);
        
        log.info("Group {} permanently deleted by PLATFORM_ADMIN {}", groupId, requestingUserId);
    }

    /**
     * Count total active groups
     */
    public Long countActiveGroups() {
        return groupRepository.countActiveGroups();
    }
}
