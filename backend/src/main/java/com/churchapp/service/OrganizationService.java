package com.churchapp.service;

import com.churchapp.entity.Organization;
import com.churchapp.entity.User;
import com.churchapp.entity.UserOrganizationHistory;
import com.churchapp.entity.UserOrganizationMembership;
import com.churchapp.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
public class OrganizationService {

    private final OrganizationRepository organizationRepository;
    private final UserOrganizationMembershipRepository membershipRepository;
    private final UserOrganizationHistoryRepository historyRepository;
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final PrayerRequestRepository prayerRequestRepository;
    private final EventRepository eventRepository;
    private final AnnouncementRepository announcementRepository;
    private final DonationRepository donationRepository;
    private final DonationSubscriptionRepository donationSubscriptionRepository;
    private final GroupRepository groupRepository;

    private static final int ORG_SWITCH_COOLDOWN_DAYS = 30;
    private static final UUID GLOBAL_ORG_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    // ========================================================================
    // ORGANIZATION CRUD
    // ========================================================================

    public Organization createOrganization(Organization organization) {
        log.info("Creating new organization: {}", organization.getName());

        // Validate slug uniqueness
        if (organizationRepository.existsBySlug(organization.getSlug())) {
            throw new RuntimeException("Organization slug already exists: " + organization.getSlug());
        }

        organization.setCreatedAt(LocalDateTime.now());
        organization.setUpdatedAt(LocalDateTime.now());

        Organization saved = organizationRepository.save(organization);
        log.info("Organization created successfully: {} (ID: {})", saved.getName(), saved.getId());

        return saved;
    }

    public Organization getOrganizationById(UUID orgId) {
        return organizationRepository.findById(orgId)
            .orElseThrow(() -> new RuntimeException("Organization not found with id: " + orgId));
    }

    public Organization getOrganizationBySlug(String slug) {
        return organizationRepository.findBySlug(slug)
            .orElseThrow(() -> new RuntimeException("Organization not found with slug: " + slug));
    }

    public Page<Organization> searchOrganizations(String searchTerm, Pageable pageable) {
        return organizationRepository.searchOrganizations(searchTerm, pageable);
    }

    public Page<Organization> getAllActiveOrganizations(Pageable pageable) {
        return organizationRepository.findAllActiveOrganizations(pageable);
    }

    // Get all non-deleted organizations regardless of status (for admin)
    public Page<Organization> getAllNonDeletedOrganizations(Pageable pageable) {
        return organizationRepository.findAllNonDeletedOrganizations(pageable);
    }

    public Organization updateOrganization(UUID orgId, Organization updates) {
        Organization org = getOrganizationById(orgId);

        if (updates.getName() != null) {
            org.setName(updates.getName());
        }
        if (updates.getSettings() != null) {
            org.setSettings(updates.getSettings());
        }
        if (updates.getMetadata() != null) {
            org.setMetadata(updates.getMetadata());
        }
        if (updates.getStatus() != null) {
            org.setStatus(updates.getStatus());
            log.info("Organization {} status updated to {}", orgId, updates.getStatus());
        }
        if (updates.getTier() != null) {
            org.setTier(updates.getTier());
        }
        if (updates.getLogoUrl() != null) {
            org.setLogoUrl(updates.getLogoUrl());
        }

        org.setUpdatedAt(LocalDateTime.now());
        return organizationRepository.save(org);
    }

    // Update organization status specifically
    public Organization updateOrganizationStatus(UUID orgId, Organization.OrganizationStatus newStatus) {
        Organization org = getOrganizationById(orgId);
        Organization.OrganizationStatus oldStatus = org.getStatus();
        org.setStatus(newStatus);
        org.setUpdatedAt(LocalDateTime.now());
        
        Organization updated = organizationRepository.save(org);
        log.info("Organization {} status changed from {} to {}", orgId, oldStatus, newStatus);
        
        return updated;
    }

    // Delete organization and all related data
    public void deleteOrganization(UUID orgId) {
        Organization org = getOrganizationById(orgId);
        
        // Prevent deleting Global Organization
        if (orgId.equals(GLOBAL_ORG_ID)) {
            throw new RuntimeException("Cannot delete the Global Organization");
        }
        
        log.warn("Starting deletion of organization: {} (ID: {})", org.getName(), orgId);
        
        // 1. Delete all posts
        log.info("Deleting posts for organization: {}", orgId);
        postRepository.deleteByOrganizationId(orgId);
        
        // 2. Delete all prayer requests
        log.info("Deleting prayer requests for organization: {}", orgId);
        prayerRequestRepository.deleteByOrganizationId(orgId);
        
        // 3. Delete all events
        log.info("Deleting events for organization: {}", orgId);
        eventRepository.deleteByOrganizationId(orgId);
        
        // 4. Delete all announcements
        log.info("Deleting announcements for organization: {}", orgId);
        announcementRepository.deleteByOrganizationId(orgId);
        
        // 5. Delete all donations
        log.info("Deleting donations for organization: {}", orgId);
        donationRepository.deleteByOrganizationId(orgId);
        
        // 6. Delete all donation subscriptions
        log.info("Deleting donation subscriptions for organization: {}", orgId);
        donationSubscriptionRepository.deleteByOrganizationId(orgId);
        
        // 7. Delete all groups created by organization
        log.info("Deleting groups for organization: {}", orgId);
        groupRepository.deleteByOrganizationId(orgId);
        
        // 8. Delete all user organization memberships
        log.info("Deleting user organization memberships for organization: {}", orgId);
        membershipRepository.deleteByOrganizationId(orgId);
        
        // 9. Delete user organization history (both from and to)
        log.info("Deleting user organization history for organization: {}", orgId);
        historyRepository.deleteByOrganizationId(orgId);
        
        // 10. Update users with this as primary org (set to Global)
        log.info("Updating users' primary organization to Global for organization: {}", orgId);
        userRepository.updatePrimaryOrganizationToGlobal(orgId, GLOBAL_ORG_ID);
        
        // 11. Soft delete the organization
        org.setDeletedAt(LocalDateTime.now());
        org.setStatus(Organization.OrganizationStatus.CANCELLED);
        organizationRepository.save(org);
        
        log.warn("Organization {} deleted successfully", orgId);
    }

    // ========================================================================
    // MEMBERSHIP MANAGEMENT
    // ========================================================================

    public UserOrganizationMembership joinOrganization(UUID userId, UUID orgId, boolean isPrimary) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        Organization org = getOrganizationById(orgId);

        // Check if already a member
        Optional<UserOrganizationMembership> existing =
            membershipRepository.findByUserIdAndOrganizationId(userId, orgId);

        if (existing.isPresent()) {
            throw new RuntimeException("User is already a member of this organization");
        }

        UserOrganizationMembership membership = new UserOrganizationMembership();
        membership.setUser(user);
        membership.setOrganization(org);
        membership.setIsPrimary(isPrimary);
        membership.setRole(UserOrganizationMembership.OrgRole.MEMBER);
        membership.setJoinedAt(LocalDateTime.now());
        membership.setCreatedAt(LocalDateTime.now());

        if (isPrimary) {
            // Clear any existing primary
            membershipRepository.clearPrimaryForUser(userId);
            user.setPrimaryOrganization(org);
            userRepository.save(user);
        }

        UserOrganizationMembership saved = membershipRepository.save(membership);
        log.info("User {} joined organization {} as {}", userId, orgId, isPrimary ? "PRIMARY" : "SECONDARY");

        return saved;
    }

    public void leaveOrganization(UUID userId, UUID orgId) {
        UserOrganizationMembership membership = membershipRepository
            .findByUserIdAndOrganizationId(userId, orgId)
            .orElseThrow(() -> new RuntimeException("User is not a member of this organization"));

        if (membership.getIsPrimary()) {
            throw new RuntimeException("Cannot leave primary organization. Please switch to a different primary organization first.");
        }

        membershipRepository.delete(membership);
        log.info("User {} left organization {}", userId, orgId);
    }

    // ========================================================================
    // PRIMARY ORGANIZATION SWITCHING (with 30-day cooldown)
    // ========================================================================

    public UserOrganizationMembership switchPrimaryOrganization(UUID userId, UUID newOrgId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        // Check cooldown period
        if (user.getLastOrgSwitchAt() != null) {
            LocalDateTime cooldownEnd = user.getLastOrgSwitchAt().plusDays(ORG_SWITCH_COOLDOWN_DAYS);
            if (LocalDateTime.now().isBefore(cooldownEnd)) {
                long daysRemaining = java.time.Duration.between(LocalDateTime.now(), cooldownEnd).toDays();
                throw new RuntimeException("Cannot switch primary organization yet. " + daysRemaining + " days remaining in cooldown period.");
            }
        }

        Organization newOrg = getOrganizationById(newOrgId);
        UUID oldOrgId = user.getPrimaryOrganization() != null ? user.getPrimaryOrganization().getId() : null;

        // Record history
        UserOrganizationHistory history = new UserOrganizationHistory();
        history.setUser(user);
        if (oldOrgId != null) {
            history.setFromOrganization(user.getPrimaryOrganization());
        }
        history.setToOrganization(newOrg);
        history.setSwitchedAt(LocalDateTime.now());
        historyRepository.save(history);

        // Clear old primary
        membershipRepository.clearPrimaryForUser(userId);

        // Check if user is already a member
        Optional<UserOrganizationMembership> existingMembership =
            membershipRepository.findByUserIdAndOrganizationId(userId, newOrgId);

        UserOrganizationMembership membership;
        if (existingMembership.isPresent()) {
            // Upgrade existing secondary membership to primary
            membership = existingMembership.get();
            membership.setIsPrimary(true);
            membership.setUpdatedAt(LocalDateTime.now());
        } else {
            // Create new primary membership
            membership = new UserOrganizationMembership();
            membership.setUser(user);
            membership.setOrganization(newOrg);
            membership.setIsPrimary(true);
            membership.setRole(UserOrganizationMembership.OrgRole.MEMBER);
            membership.setJoinedAt(LocalDateTime.now());
            membership.setCreatedAt(LocalDateTime.now());
        }

        membership = membershipRepository.save(membership);

        // Update user's primary org reference
        user.setPrimaryOrganization(newOrg);
        user.setLastOrgSwitchAt(LocalDateTime.now());
        userRepository.save(user);

        log.info("User {} switched primary organization from {} to {}", userId, oldOrgId, newOrgId);

        // TODO: Send notification to old org admins about member leaving

        return membership;
    }

    public boolean canSwitchPrimaryOrganization(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        if (user.getLastOrgSwitchAt() == null) {
            return true;
        }

        LocalDateTime cooldownEnd = user.getLastOrgSwitchAt().plusDays(ORG_SWITCH_COOLDOWN_DAYS);
        return LocalDateTime.now().isAfter(cooldownEnd);
    }

    public long getDaysUntilCanSwitch(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        if (user.getLastOrgSwitchAt() == null) {
            return 0;
        }

        LocalDateTime cooldownEnd = user.getLastOrgSwitchAt().plusDays(ORG_SWITCH_COOLDOWN_DAYS);
        if (LocalDateTime.now().isAfter(cooldownEnd)) {
            return 0;
        }

        return java.time.Duration.between(LocalDateTime.now(), cooldownEnd).toDays();
    }

    // ========================================================================
    // MEMBERSHIP QUERIES
    // ========================================================================

    public Optional<UserOrganizationMembership> getPrimaryMembership(UUID userId) {
        return membershipRepository.findPrimaryByUserId(userId);
    }

    public List<UserOrganizationMembership> getSecondaryMemberships(UUID userId) {
        return membershipRepository.findSecondaryMembershipsByUserId(userId);
    }

    public List<UserOrganizationMembership> getAllMemberships(UUID userId) {
        return membershipRepository.findByUserId(userId);
    }

    public boolean isMember(UUID userId, UUID orgId) {
        return membershipRepository.existsByUserIdAndOrganizationId(userId, orgId);
    }

    public boolean isPrimaryMember(UUID userId, UUID orgId) {
        Optional<UserOrganizationMembership> membership =
            membershipRepository.findByUserIdAndOrganizationId(userId, orgId);
        return membership.isPresent() && membership.get().getIsPrimary();
    }

    // ========================================================================
    // ORGANIZATION STATISTICS
    // ========================================================================

    public Long getMemberCount(UUID orgId) {
        return membershipRepository.countByOrganizationId(orgId);
    }

    public Long getPrimaryMemberCount(UUID orgId) {
        return membershipRepository.countPrimaryMembersByOrganizationId(orgId);
    }

    public List<UserOrganizationHistory> getOrganizationSwitchHistory(UUID userId) {
        return historyRepository.findByUserIdOrderBySwitchedAtDesc(userId);
    }

    // ========================================================================
    // GLOBAL ORG HELPERS
    // ========================================================================

    public UUID getGlobalOrgId() {
        return GLOBAL_ORG_ID;
    }

    public Organization getGlobalOrg() {
        return organizationRepository.findById(GLOBAL_ORG_ID)
            .orElseThrow(() -> new RuntimeException("Global organization not found"));
    }
}
