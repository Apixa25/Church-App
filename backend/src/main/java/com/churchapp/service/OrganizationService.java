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

    /**
     * Create a new organization
     * The creator automatically becomes an ORG_ADMIN with full control
     * 
     * @param organization The organization to create
     * @param creator The user creating the organization (becomes ORG_ADMIN)
     * @return The created organization
     */
    public Organization createOrganization(Organization organization, User creator) {
        log.info("Creating new organization: {} by user {}", organization.getName(), creator.getId());

        // Validate slug uniqueness
        if (organizationRepository.existsBySlug(organization.getSlug())) {
            throw new RuntimeException("Organization slug already exists: " + organization.getSlug());
        }

        organization.setCreatedAt(LocalDateTime.now());
        organization.setUpdatedAt(LocalDateTime.now());

        Organization saved = organizationRepository.save(organization);
        log.info("Organization created successfully: {} (ID: {})", saved.getName(), saved.getId());

        // Automatically make creator an ORG_ADMIN with full powers
        UserOrganizationMembership membership = new UserOrganizationMembership();
        membership.setUser(creator);
        membership.setOrganization(saved);
        membership.setRole(UserOrganizationMembership.OrgRole.ORG_ADMIN); // 👑 Full admin access!
        membership.setIsPrimary(true); // Set as their primary org
        membership.setJoinedAt(LocalDateTime.now());
        membership.setCreatedAt(LocalDateTime.now());
        membershipRepository.save(membership);

        // Update user's primary org
        creator.setPrimaryOrganization(saved);
        userRepository.save(creator);

        log.info("User {} automatically set as ORG_ADMIN of organization {}", creator.getId(), saved.getId());

        return saved;
    }
    
    /**
     * Legacy method for backward compatibility (without creator)
     * @deprecated Use createOrganization(Organization, User) instead
     */
    @Deprecated
    public Organization createOrganization(Organization organization) {
        log.warn("Using deprecated createOrganization without creator - organization will have no admin!");
        
        organization.setCreatedAt(LocalDateTime.now());
        organization.setUpdatedAt(LocalDateTime.now());
        return organizationRepository.save(organization);
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
    // ORG ADMIN MANAGEMENT
    // ========================================================================
    
    /**
     * Promote a member to ORG_ADMIN role
     * Can have multiple ORG_ADMINs per organization
     * 
     * @param userId The user to promote
     * @param orgId The organization ID
     */
    public void promoteToOrgAdmin(UUID userId, UUID orgId) {
        UserOrganizationMembership membership = membershipRepository
            .findByUserIdAndOrganizationId(userId, orgId)
            .orElseThrow(() -> new RuntimeException("User is not a member of this organization"));
            
        if (membership.getRole() == UserOrganizationMembership.OrgRole.ORG_ADMIN) {
            throw new RuntimeException("User is already an ORG_ADMIN");
        }
        
        membership.setRole(UserOrganizationMembership.OrgRole.ORG_ADMIN);
        membership.setUpdatedAt(LocalDateTime.now());
        membershipRepository.save(membership);
        
        log.info("User {} promoted to ORG_ADMIN of organization {}", userId, orgId);
    }
    
    /**
     * Demote an ORG_ADMIN to regular MEMBER role
     * Must always have at least 1 ORG_ADMIN per organization
     * 
     * @param userId The user to demote
     * @param orgId The organization ID
     */
    public void demoteOrgAdmin(UUID userId, UUID orgId) {
        UserOrganizationMembership membership = membershipRepository
            .findByUserIdAndOrganizationId(userId, orgId)
            .orElseThrow(() -> new RuntimeException("User is not a member of this organization"));
        
        if (membership.getRole() != UserOrganizationMembership.OrgRole.ORG_ADMIN) {
            throw new RuntimeException("User is not an ORG_ADMIN");
        }
        
        // Count remaining admins
        long adminCount = membershipRepository.countByOrganizationIdAndRole(
            orgId, UserOrganizationMembership.OrgRole.ORG_ADMIN
        );
        
        if (adminCount <= 1) {
            throw new RuntimeException(
                "Cannot remove the last admin. Promote another member to ORG_ADMIN first."
            );
        }
        
        membership.setRole(UserOrganizationMembership.OrgRole.MEMBER);
        membership.setUpdatedAt(LocalDateTime.now());
        membershipRepository.save(membership);
        
        log.info("User {} demoted from ORG_ADMIN to MEMBER of organization {}", userId, orgId);
    }
    
    /**
     * Get all members of an organization
     * 
     * @param orgId The organization ID
     * @return List of all memberships for this organization
     */
    public List<UserOrganizationMembership> getOrganizationMembers(UUID orgId) {
        return membershipRepository.findByOrganizationId(orgId);
    }
    
    /**
     * Get a specific user's membership in an organization
     * 
     * @param userId The user ID
     * @param orgId The organization ID
     * @return The membership
     */
    public UserOrganizationMembership getMembership(UUID userId, UUID orgId) {
        return membershipRepository
            .findByUserIdAndOrganizationId(userId, orgId)
            .orElseThrow(() -> new RuntimeException("User is not a member of this organization"));
    }
    
    /**
     * Update a member's role within the organization
     * 
     * @param userId The user whose role to update
     * @param orgId The organization ID
     * @param newRole The new role to assign
     */
    public void updateMemberRole(UUID userId, UUID orgId, UserOrganizationMembership.OrgRole newRole) {
        UserOrganizationMembership membership = membershipRepository
            .findByUserIdAndOrganizationId(userId, orgId)
            .orElseThrow(() -> new RuntimeException("User is not a member of this organization"));
        
        UserOrganizationMembership.OrgRole oldRole = membership.getRole();
        
        // If demoting from ORG_ADMIN, check we're not removing the last admin
        if (oldRole == UserOrganizationMembership.OrgRole.ORG_ADMIN && 
            newRole != UserOrganizationMembership.OrgRole.ORG_ADMIN) {
            
            long adminCount = membershipRepository.countByOrganizationIdAndRole(
                orgId, UserOrganizationMembership.OrgRole.ORG_ADMIN
            );
            
            if (adminCount <= 1) {
                throw new RuntimeException(
                    "Cannot remove the last admin. Promote another member to ORG_ADMIN first."
                );
            }
        }
        
        membership.setRole(newRole);
        membership.setUpdatedAt(LocalDateTime.now());
        membershipRepository.save(membership);
        
        log.info("User {} role updated from {} to {} in organization {}", 
            userId, oldRole, newRole, orgId);
    }
    
    /**
     * Get list of all ORG_ADMINs for an organization
     */
    public List<UserOrganizationMembership> getOrgAdmins(UUID orgId) {
        return membershipRepository.findByOrganizationIdAndRole(
            orgId, UserOrganizationMembership.OrgRole.ORG_ADMIN
        );
    }
    
    /**
     * Check if user is an ORG_ADMIN of the organization
     */
    public boolean isOrgAdmin(UUID userId, UUID orgId) {
        return membershipRepository
            .findByUserIdAndOrganizationId(userId, orgId)
            .map(membership -> membership.getRole() == UserOrganizationMembership.OrgRole.ORG_ADMIN)
            .orElse(false);
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
