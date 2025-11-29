package com.churchapp.service;

import com.churchapp.entity.Organization;
import com.churchapp.entity.User;
import com.churchapp.entity.UserOrganizationGroup;
import com.churchapp.repository.OrganizationRepository;
import com.churchapp.repository.UserOrganizationGroupRepository;
import com.churchapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class OrganizationGroupService {

    private final UserOrganizationGroupRepository repository;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;

    /**
     * Add an organization as a group (feed-only view)
     * User cannot add their own primary organization (churchPrimary or familyPrimary)
     */
    public UserOrganizationGroup followOrganizationAsGroup(UUID userId, UUID organizationId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Organization organization = organizationRepository.findById(organizationId)
            .orElseThrow(() -> new RuntimeException("Organization not found"));

        // Check if already following
        Optional<UserOrganizationGroup> existing = repository.findByUserIdAndOrganizationId(userId, organizationId);
        if (existing.isPresent()) {
            throw new RuntimeException("You are already following this organization as a group");
        }

        // Prevent user from following their own primary organizations
        // Check churchPrimary
        if (user.getChurchPrimaryOrganization() != null && 
            user.getChurchPrimaryOrganization().getId().equals(organizationId)) {
            throw new RuntimeException("You cannot follow your own church primary organization as a group");
        }

        // Check familyPrimary
        if (user.getFamilyPrimaryOrganization() != null && 
            user.getFamilyPrimaryOrganization().getId().equals(organizationId)) {
            throw new RuntimeException("You cannot follow your own family primary organization as a group");
        }

        UserOrganizationGroup follow = new UserOrganizationGroup();
        follow.setUser(user);
        follow.setOrganization(organization);
        follow.setIsMuted(false);
        follow.setJoinedAt(LocalDateTime.now());

        UserOrganizationGroup saved = repository.save(follow);
        log.info("User {} followed organization {} as group", userId, organizationId);
        return saved;
    }

    /**
     * Unfollow an organization as a group
     */
    public void unfollowOrganizationAsGroup(UUID userId, UUID organizationId) {
        UserOrganizationGroup follow = repository.findByUserIdAndOrganizationId(userId, organizationId)
            .orElseThrow(() -> new RuntimeException("You are not following this organization as a group"));

        repository.delete(follow);
        log.info("User {} unfollowed organization {} as group", userId, organizationId);
    }

    /**
     * Get all organizations user follows as groups
     */
    public List<UserOrganizationGroup> getFollowedOrganizations(UUID userId) {
        return repository.findByUserId(userId);
    }

    /**
     * Get unmuted organization IDs that user follows as groups
     */
    public List<UUID> getUnmutedFollowedOrganizationIds(UUID userId) {
        return repository.findUnmutedOrganizationIdsByUserId(userId);
    }

    /**
     * Mute an organization-as-group
     */
    public void muteOrganizationAsGroup(UUID userId, UUID organizationId) {
        repository.updateMuteStatus(userId, organizationId, true);
        log.info("User {} muted organization {} as group", userId, organizationId);
    }

    /**
     * Unmute an organization-as-group
     */
    public void unmuteOrganizationAsGroup(UUID userId, UUID organizationId) {
        repository.updateMuteStatus(userId, organizationId, false);
        log.info("User {} unmuted organization {} as group", userId, organizationId);
    }

    /**
     * Check if user follows an organization as a group
     */
    public boolean isFollowingAsGroup(UUID userId, UUID organizationId) {
        return repository.existsByUserIdAndOrganizationId(userId, organizationId);
    }

    /**
     * Check if user can follow an organization as a group
     */
    public boolean canFollowAsGroup(UUID userId, UUID organizationId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        // Cannot follow if already following
        if (repository.existsByUserIdAndOrganizationId(userId, organizationId)) {
            return false;
        }

        // Cannot follow own church primary organization
        if (user.getChurchPrimaryOrganization() != null && 
            user.getChurchPrimaryOrganization().getId().equals(organizationId)) {
            return false;
        }

        // Cannot follow own family primary organization
        if (user.getFamilyPrimaryOrganization() != null && 
            user.getFamilyPrimaryOrganization().getId().equals(organizationId)) {
            return false;
        }

        return true;
    }
}

