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
    private final PrayerInteractionRepository prayerInteractionRepository;
    private final EventRepository eventRepository;
    private final EventRsvpRepository eventRsvpRepository;
    private final EventBringItemRepository eventBringItemRepository;
    private final EventBringClaimRepository eventBringClaimRepository;
    private final AnnouncementRepository announcementRepository;
    private final DonationRepository donationRepository;
    private final DonationSubscriptionRepository donationSubscriptionRepository;
    private final GroupRepository groupRepository;
    private final EmailService emailService;

    // Cooldown removed! Users can now switch organizations freely like real life!
    // private static final int ORG_SWITCH_COOLDOWN_DAYS = 30;  // DEPRECATED - no more cooldown
    private static final UUID GLOBAL_ORG_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    
    // Organization types that can be Church Primary
    private static final java.util.Set<Organization.OrganizationType> CHURCH_SLOT_TYPES = java.util.Set.of(
        Organization.OrganizationType.CHURCH,
        Organization.OrganizationType.MINISTRY,
        Organization.OrganizationType.NONPROFIT,
        Organization.OrganizationType.GENERAL
    );
    
    // Organization types that can be Family Primary
    private static final java.util.Set<Organization.OrganizationType> FAMILY_SLOT_TYPES = java.util.Set.of(
        Organization.OrganizationType.FAMILY
    );

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

        // Handle slug uniqueness - with retry for UUID-based slugs (for emoji family groups)
        String originalSlug = organization.getSlug();
        String finalSlug = originalSlug;
        
        // If slug starts with "family-" it's likely a UUID-based slug for emoji names
        // Retry with new UUID if conflict occurs (extremely rare, but handle gracefully)
        if (finalSlug != null && finalSlug.startsWith("family-")) {
            int maxRetries = 5;
            int attempts = 0;
            while (organizationRepository.existsBySlug(finalSlug) && attempts < maxRetries) {
                log.warn("Slug conflict detected for UUID-based family slug: {}. Generating new one...", finalSlug);
                finalSlug = "family-" + UUID.randomUUID().toString().substring(0, 8);
                attempts++;
            }
            
            if (attempts >= maxRetries && organizationRepository.existsBySlug(finalSlug)) {
                throw new RuntimeException("Unable to generate unique slug after multiple attempts. Please try again.");
            }
            
            if (!finalSlug.equals(originalSlug)) {
                log.info("Regenerated slug from {} to {}", originalSlug, finalSlug);
            }
        } else {
            // Normal slug validation for non-UUID slugs
            if (organizationRepository.existsBySlug(finalSlug)) {
                throw new RuntimeException("Organization slug already exists: " + finalSlug);
            }
        }
        
        organization.setSlug(finalSlug);
        organization.setCreatedAt(LocalDateTime.now());
        organization.setUpdatedAt(LocalDateTime.now());

        // Ensure required banking-review metadata exists on every newly created organization.
        java.util.Map<String, Object> metadata = organization.getMetadata() != null
            ? new java.util.HashMap<>(organization.getMetadata())
            : new java.util.HashMap<>();
        metadata.putIfAbsent("bankingReviewStatus", "PENDING_CONTACT");
        metadata.putIfAbsent("bankingReviewCreatedAt", LocalDateTime.now().toString());
        metadata.putIfAbsent("bankingQueueEnteredAt", LocalDateTime.now().toString());
        metadata.putIfAbsent("familyDonationsApproved", false);
        metadata.putIfAbsent("creatorUserId", creator.getId().toString());
        metadata.putIfAbsent("creatorName", creator.getName());
        metadata.putIfAbsent("creatorEmail", creator.getEmail());
        organization.setMetadata(metadata);

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
        
        // Set slot type based on organization type
        if (FAMILY_SLOT_TYPES.contains(saved.getType())) {
            membership.setSlotType("FAMILY");
        } else {
            membership.setSlotType("CHURCH");
        }
        
        membershipRepository.save(membership);

        // Update user's primary org based on type (dual primary system)
        if (FAMILY_SLOT_TYPES.contains(saved.getType())) {
            creator.setFamilyPrimaryOrganization(saved);
            log.info("User {} set as Family Primary ORG_ADMIN of organization {}", creator.getId(), saved.getId());
        } else {
            creator.setChurchPrimaryOrganization(saved);
            log.info("User {} set as Church Primary ORG_ADMIN of organization {}", creator.getId(), saved.getId());
        }
        userRepository.save(creator);

        // Notify platform owner/support so banking outreach can start immediately.
        try {
            emailService.sendNewOrganizationBankingReviewNotification(saved, creator);
        } catch (Exception e) {
            // Do not fail organization creation if email delivery fails.
            log.warn("Failed to send new organization banking notification for org {}: {}", saved.getId(), e.getMessage());
        }

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

    /**
     * Get organization by ID - only returns non-deleted organizations.
     * Use this for all user-facing operations.
     */
    public Organization getOrganizationById(UUID orgId) {
        return organizationRepository.findActiveById(orgId)
            .orElseThrow(() -> new RuntimeException("Organization not found with id: " + orgId));
    }
    
    /**
     * Get organization by ID including deleted - for admin operations only.
     */
    public Organization getOrganizationByIdIncludingDeleted(UUID orgId) {
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
        if (updates.getMetadata() != null && !updates.getMetadata().isEmpty()) {
            java.util.Map<String, Object> mergedMetadata = org.getMetadata() != null
                ? new java.util.HashMap<>(org.getMetadata())
                : new java.util.HashMap<>();
            mergedMetadata.putAll(updates.getMetadata());
            org.setMetadata(mergedMetadata);
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

    public Organization markBankingReviewClicked(UUID orgId) {
        Organization org = getOrganizationById(orgId);
        java.util.Map<String, Object> metadata = org.getMetadata() != null
            ? new java.util.HashMap<>(org.getMetadata())
            : new java.util.HashMap<>();

        metadata.put("bankingReviewStatus", "CONTACT_INITIATED");
        metadata.put("bankingQueueDismissedAt", LocalDateTime.now().toString());
        metadata.putIfAbsent("bankingQueueEnteredAt", org.getCreatedAt() != null
            ? org.getCreatedAt().toString()
            : LocalDateTime.now().toString());

        org.setMetadata(metadata);
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
    @Transactional
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
        
        // 2. Delete all prayer interactions (must be deleted BEFORE prayer requests due to FK constraint)
        log.info("Deleting prayer interactions for organization: {}", orgId);
        prayerInteractionRepository.deleteRepliesByOrganizationId(orgId);  // Delete replies first
        prayerInteractionRepository.deleteTopLevelInteractionsByOrganizationId(orgId);  // Then top-level
        
        // 3. Delete all prayer requests
        log.info("Deleting prayer requests for organization: {}", orgId);
        prayerRequestRepository.deleteByOrganizationId(orgId);
        
        // 4. Delete all events and their related data
        log.info("Deleting events for organization: {}", orgId);
        // Get all event IDs for this organization first
        List<UUID> eventIds = eventRepository.findEventIdsByOrganizationId(orgId);
        if (!eventIds.isEmpty()) {
            log.info("Found {} events to delete for organization: {}", eventIds.size(), orgId);
            
            // 4a. Delete all event RSVPs first
            log.info("Deleting event RSVPs for organization: {}", orgId);
            for (UUID eventId : eventIds) {
                eventRsvpRepository.deleteByEventId(eventId);
            }
            
            // 4b. Delete all event bring claims first (before items due to FK constraint)
            log.info("Deleting event bring claims for organization: {}", orgId);
            for (UUID eventId : eventIds) {
                eventBringClaimRepository.deleteByEventId(eventId);
            }
            
            // 4c. Delete all event bring items
            log.info("Deleting event bring items for organization: {}", orgId);
            for (UUID eventId : eventIds) {
                eventBringItemRepository.deleteByEventId(eventId);
            }
        }
        
        // 4d. Now delete all events
        eventRepository.deleteByOrganizationId(orgId);
        
        // 5. Delete all announcements
        log.info("Deleting announcements for organization: {}", orgId);
        announcementRepository.deleteByOrganizationId(orgId);
        
        // 6. Delete all donations
        log.info("Deleting donations for organization: {}", orgId);
        donationRepository.deleteByOrganizationId(orgId);
        
        // 7. Delete all donation subscriptions
        log.info("Deleting donation subscriptions for organization: {}", orgId);
        donationSubscriptionRepository.deleteByOrganizationId(orgId);
        
        // 8. Delete all groups created by organization
        log.info("Deleting groups for organization: {}", orgId);
        groupRepository.deleteByOrganizationId(orgId);
        
        // 9. Update users with this as primary org FIRST (before deleting memberships)
        // This prevents foreign key constraint issues
        log.info("Updating users' primary organization references for organization: {}", orgId);
        try {
            userRepository.updateChurchPrimaryOrganizationToGlobal(orgId, GLOBAL_ORG_ID);
            log.info("Updated church primary organizations to Global");
        } catch (Exception e) {
            log.warn("Error updating church primary organizations (may be none): {}", e.getMessage());
        }
        
        try {
            userRepository.clearFamilyPrimaryOrganization(orgId);
            log.info("Cleared family primary organizations");
        } catch (Exception e) {
            log.warn("Error clearing family primary organizations (may be none): {}", e.getMessage());
        }
        
        // 10. Delete all user organization memberships
        log.info("Deleting user organization memberships for organization: {}", orgId);
        try {
            membershipRepository.deleteByOrganizationId(orgId);
            log.info("Deleted all user organization memberships");
        } catch (Exception e) {
            log.error("Error deleting user organization memberships: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to delete user organization memberships: " + e.getMessage(), e);
        }
        
        // 11. Delete user organization history (both from and to)
        log.info("Deleting user organization history for organization: {}", orgId);
        try {
            historyRepository.deleteByOrganizationId(orgId);
            log.info("Deleted user organization history");
        } catch (Exception e) {
            log.warn("Error deleting user organization history (may be none): {}", e.getMessage());
        }
        
        // 12. Soft delete the organization
        // Modify slug to free it up for reuse (ensure it doesn't exceed 100 chars)
        String originalSlug = org.getSlug();
        String timestamp = String.valueOf(System.currentTimeMillis());
        String deletedSlug = originalSlug + "-del-" + timestamp;
        
        // Ensure slug doesn't exceed 100 characters (max length constraint)
        if (deletedSlug.length() > 100) {
            // Truncate original slug if needed to make room for "-del-" + timestamp
            int maxOriginalLength = 100 - 5 - timestamp.length(); // 5 for "-del-"
            if (maxOriginalLength > 0) {
                deletedSlug = originalSlug.substring(0, Math.min(originalSlug.length(), maxOriginalLength)) 
                            + "-del-" + timestamp;
            } else {
                // If timestamp itself is too long, use just a short suffix
                deletedSlug = originalSlug.substring(0, Math.min(originalSlug.length(), 90)) + "-deleted";
            }
        }
        
        org.setSlug(deletedSlug);
        org.setDeletedAt(LocalDateTime.now());
        org.setStatus(Organization.OrganizationStatus.CANCELLED);
        
        try {
            organizationRepository.save(org);
            log.info("Organization slug changed from '{}' to '{}' to free up for reuse", originalSlug, deletedSlug);
        } catch (Exception e) {
            log.error("Error updating organization slug during deletion: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to update organization during deletion: " + e.getMessage(), e);
        }
        
        log.warn("Organization {} deleted successfully", orgId);
    }

    // ========================================================================
    // MEMBERSHIP MANAGEMENT
    // ========================================================================

    /**
     * Legacy join method - routes to appropriate dual-primary system methods
     * @deprecated Use setChurchPrimary(), setFamilyPrimary(), or joinAsGroup() instead
     */
    public UserOrganizationMembership joinOrganization(UUID userId, UUID orgId, boolean isPrimary) {
        Organization org = getOrganizationById(orgId);

        // Check if already a member
        Optional<UserOrganizationMembership> existing =
            membershipRepository.findByUserIdAndOrganizationId(userId, orgId);

        if (existing.isPresent()) {
            throw new RuntimeException("User is already a member of this organization");
        }

        // If joining as primary, route to the appropriate dual-primary method based on org type
        if (isPrimary) {
            if (FAMILY_SLOT_TYPES.contains(org.getType())) {
                // FAMILY type organizations must go to Family Primary slot
                log.info("Legacy joinOrganization routing FAMILY type {} to setFamilyPrimary", orgId);
                return setFamilyPrimary(userId, orgId);
            } else if (CHURCH_SLOT_TYPES.contains(org.getType())) {
                // CHURCH, MINISTRY, NONPROFIT, GENERAL types go to Church Primary slot
                log.info("Legacy joinOrganization routing {} type {} to setChurchPrimary", org.getType(), orgId);
                return setChurchPrimary(userId, orgId);
            } else {
                throw new RuntimeException("Organization type " + org.getType() + 
                    " cannot be set as primary. Allowed types: CHURCH, MINISTRY, NONPROFIT, GENERAL, FAMILY");
            }
        } else {
            // Joining as secondary/group - use joinAsGroup method
            return joinAsGroup(userId, orgId);
        }
    }

    public void leaveOrganization(UUID userId, UUID orgId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        UserOrganizationMembership membership = membershipRepository
            .findByUserIdAndOrganizationId(userId, orgId)
            .orElseThrow(() -> new RuntimeException("User is not a member of this organization"));

        // If this is a primary organization, clear the appropriate primary slot first
        if (membership.getIsPrimary()) {
            String slotType = membership.getSlotType();
            boolean isChurchPrimary = user.getChurchPrimaryOrganization() != null && 
                user.getChurchPrimaryOrganization().getId().equals(orgId);
            boolean isFamilyPrimary = user.getFamilyPrimaryOrganization() != null && 
                user.getFamilyPrimaryOrganization().getId().equals(orgId);
            
            // Clear the appropriate primary slot
            if ("FAMILY".equals(slotType) || isFamilyPrimary) {
                // This is the Family Primary - clear it
                log.info("User {} leaving Family Primary organization {} - clearing Family Primary slot", userId, orgId);
                if (isFamilyPrimary) {
                    user.setFamilyPrimaryOrganization(null);
                    userRepository.save(user);
                }
            } else if ("CHURCH".equals(slotType) || isChurchPrimary) {
                // This is the Church Primary - clear it
                log.info("User {} leaving Church Primary organization {} - clearing Church Primary slot", userId, orgId);
                if (isChurchPrimary) {
                    user.setChurchPrimaryOrganization(null);
                    userRepository.save(user);
                }
            }
            
            // Demote membership to group status before deletion (in case any code depends on this)
            membership.setIsPrimary(false);
            membership.setSlotType("GROUP");
            membership.setUpdatedAt(LocalDateTime.now());
            membershipRepository.save(membership);
        }
        
        // Delete the membership (user is leaving the organization completely)
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
    // DUAL PRIMARY ORGANIZATION SYSTEM (No cooldown - free switching!)
    // ========================================================================

    /**
     * Set an organization as the user's Church Primary
     * Church Primary slot accepts: CHURCH, MINISTRY, NONPROFIT, GENERAL
     * 
     * @param userId The user ID
     * @param orgId The organization ID to set as Church Primary
     * @return The created/updated membership
     */
    public UserOrganizationMembership setChurchPrimary(UUID userId, UUID orgId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        Organization newOrg = getOrganizationById(orgId);
        
        // Validate organization type for Church slot
        if (!CHURCH_SLOT_TYPES.contains(newOrg.getType())) {
            throw new RuntimeException("Organization type " + newOrg.getType() + 
                " cannot be set as Church Primary. Allowed types: CHURCH, MINISTRY, NONPROFIT, GENERAL");
        }

        UUID oldOrgId = user.getChurchPrimaryOrganization() != null ? 
            user.getChurchPrimaryOrganization().getId() : null;

        // Record history
        UserOrganizationHistory history = new UserOrganizationHistory();
        history.setUser(user);
        if (oldOrgId != null) {
            history.setFromOrganization(user.getChurchPrimaryOrganization());
        }
        history.setToOrganization(newOrg);
        history.setSwitchedAt(LocalDateTime.now());
        history.setReason("Set as Church Primary");
        historyRepository.save(history);

        // Clear old Church primary membership's isPrimary flag
        if (oldOrgId != null) {
            membershipRepository.findByUserIdAndOrganizationId(userId, oldOrgId)
                .ifPresent(oldMembership -> {
                    oldMembership.setIsPrimary(false);
                    oldMembership.setSlotType("GROUP"); // Demote to group
                    oldMembership.setUpdatedAt(LocalDateTime.now());
                    membershipRepository.save(oldMembership);
                });
        }

        // Create or update membership
        Optional<UserOrganizationMembership> existingMembership =
            membershipRepository.findByUserIdAndOrganizationId(userId, orgId);

        UserOrganizationMembership membership;
        if (existingMembership.isPresent()) {
            membership = existingMembership.get();
            membership.setIsPrimary(true);
            membership.setSlotType("CHURCH");
            membership.setUpdatedAt(LocalDateTime.now());
        } else {
            membership = new UserOrganizationMembership();
            membership.setUser(user);
            membership.setOrganization(newOrg);
            membership.setIsPrimary(true);
            membership.setSlotType("CHURCH");
            membership.setRole(UserOrganizationMembership.OrgRole.MEMBER);
            membership.setJoinedAt(LocalDateTime.now());
            membership.setCreatedAt(LocalDateTime.now());
        }

        membership = membershipRepository.save(membership);

        // Update user's church primary
        user.setChurchPrimaryOrganization(newOrg);
        userRepository.save(user);

        log.info("User {} set Church Primary from {} to {}", userId, oldOrgId, orgId);

        return membership;
    }

    /**
     * Set an organization as the user's Family Primary
     * Family Primary slot accepts: FAMILY only
     * 
     * @param userId The user ID
     * @param orgId The organization ID to set as Family Primary
     * @return The created/updated membership
     */
    public UserOrganizationMembership setFamilyPrimary(UUID userId, UUID orgId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        Organization newOrg = getOrganizationById(orgId);
        
        // Validate organization type for Family slot
        if (!FAMILY_SLOT_TYPES.contains(newOrg.getType())) {
            throw new RuntimeException("Organization type " + newOrg.getType() + 
                " cannot be set as Family Primary. Only FAMILY type allowed.");
        }

        UUID oldOrgId = user.getFamilyPrimaryOrganization() != null ? 
            user.getFamilyPrimaryOrganization().getId() : null;

        // Record history
        UserOrganizationHistory history = new UserOrganizationHistory();
        history.setUser(user);
        if (oldOrgId != null) {
            history.setFromOrganization(user.getFamilyPrimaryOrganization());
        }
        history.setToOrganization(newOrg);
        history.setSwitchedAt(LocalDateTime.now());
        history.setReason("Set as Family Primary");
        historyRepository.save(history);

        // Clear old Family primary membership's isPrimary flag
        if (oldOrgId != null) {
            membershipRepository.findByUserIdAndOrganizationId(userId, oldOrgId)
                .ifPresent(oldMembership -> {
                    oldMembership.setIsPrimary(false);
                    oldMembership.setSlotType("GROUP"); // Demote to group
                    oldMembership.setUpdatedAt(LocalDateTime.now());
                    membershipRepository.save(oldMembership);
                });
        }

        // Create or update membership
        Optional<UserOrganizationMembership> existingMembership =
            membershipRepository.findByUserIdAndOrganizationId(userId, orgId);

        UserOrganizationMembership membership;
        if (existingMembership.isPresent()) {
            membership = existingMembership.get();
            membership.setIsPrimary(true);
            membership.setSlotType("FAMILY");
            membership.setUpdatedAt(LocalDateTime.now());
        } else {
            membership = new UserOrganizationMembership();
            membership.setUser(user);
            membership.setOrganization(newOrg);
            membership.setIsPrimary(true);
            membership.setSlotType("FAMILY");
            membership.setRole(UserOrganizationMembership.OrgRole.MEMBER);
            membership.setJoinedAt(LocalDateTime.now());
            membership.setCreatedAt(LocalDateTime.now());
        }

        membership = membershipRepository.save(membership);

        // Update user's family primary
        user.setFamilyPrimaryOrganization(newOrg);
        userRepository.save(user);

        log.info("User {} set Family Primary from {} to {}", userId, oldOrgId, orgId);

        return membership;
    }

    /**
     * Join an organization as a Group (social feed only access)
     * Groups provide access to social feed but not Quick Actions
     * 
     * @param userId The user ID
     * @param orgId The organization ID to join as Group
     * @return The created membership
     */
    public UserOrganizationMembership joinAsGroup(UUID userId, UUID orgId) {
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
        membership.setIsPrimary(false);
        membership.setSlotType("GROUP");
        membership.setRole(UserOrganizationMembership.OrgRole.MEMBER);
        membership.setJoinedAt(LocalDateTime.now());
        membership.setCreatedAt(LocalDateTime.now());

        UserOrganizationMembership saved = membershipRepository.save(membership);
        log.info("User {} joined organization {} as GROUP (social feed only)", userId, orgId);

        return saved;
    }

    /**
     * Clear the user's Church Primary (keep membership as Group)
     */
    public void clearChurchPrimary(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        if (user.getChurchPrimaryOrganization() != null) {
            UUID oldOrgId = user.getChurchPrimaryOrganization().getId();
            
            // Demote membership to group
            membershipRepository.findByUserIdAndOrganizationId(userId, oldOrgId)
                .ifPresent(membership -> {
                    membership.setIsPrimary(false);
                    membership.setSlotType("GROUP");
                    membership.setUpdatedAt(LocalDateTime.now());
                    membershipRepository.save(membership);
                });
            
            user.setChurchPrimaryOrganization(null);
            userRepository.save(user);
            
            log.info("User {} cleared Church Primary (was {})", userId, oldOrgId);
        }
    }

    /**
     * Clear the user's Family Primary (keep membership as Group)
     */
    public void clearFamilyPrimary(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        if (user.getFamilyPrimaryOrganization() != null) {
            UUID oldOrgId = user.getFamilyPrimaryOrganization().getId();
            
            // Demote membership to group
            membershipRepository.findByUserIdAndOrganizationId(userId, oldOrgId)
                .ifPresent(membership -> {
                    membership.setIsPrimary(false);
                    membership.setSlotType("GROUP");
                    membership.setUpdatedAt(LocalDateTime.now());
                    membershipRepository.save(membership);
                });
            
            user.setFamilyPrimaryOrganization(null);
            userRepository.save(user);
            
            log.info("User {} cleared Family Primary (was {})", userId, oldOrgId);
        }
    }

    // ========================================================================
    // BACKWARD COMPATIBILITY - Legacy switch method (now without cooldown)
    // ========================================================================

    /**
     * Legacy method - switches Church Primary (kept for backward compatibility)
     * @deprecated Use setChurchPrimary() instead
     */
    @Deprecated
    public UserOrganizationMembership switchPrimaryOrganization(UUID userId, UUID newOrgId) {
        return setChurchPrimary(userId, newOrgId);
    }

    /**
     * @deprecated No more cooldown - always returns true
     */
    @Deprecated
    public boolean canSwitchPrimaryOrganization(UUID userId) {
        return true; // No more cooldown!
    }

    /**
     * @deprecated No more cooldown - always returns 0
     */
    @Deprecated
    public long getDaysUntilCanSwitch(UUID userId) {
        return 0; // No more cooldown!
    }

    // ========================================================================
    // MEMBERSHIP QUERIES - DUAL PRIMARY SYSTEM
    // ========================================================================

    /**
     * Get the user's Church Primary membership
     */
    public Optional<UserOrganizationMembership> getChurchPrimaryMembership(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        if (user.getChurchPrimaryOrganization() == null) {
            return Optional.empty();
        }
        
        return membershipRepository.findByUserIdAndOrganizationId(
            userId, user.getChurchPrimaryOrganization().getId()
        );
    }

    /**
     * Get the user's Family Primary membership
     */
    public Optional<UserOrganizationMembership> getFamilyPrimaryMembership(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        if (user.getFamilyPrimaryOrganization() == null) {
            return Optional.empty();
        }
        
        return membershipRepository.findByUserIdAndOrganizationId(
            userId, user.getFamilyPrimaryOrganization().getId()
        );
    }

    /**
     * Get all Group memberships (non-primary organizations)
     */
    public List<UserOrganizationMembership> getGroupMemberships(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        List<UserOrganizationMembership> allMemberships = membershipRepository.findByUserId(userId);
        
        UUID churchPrimaryId = user.getChurchPrimaryOrganization() != null ? 
            user.getChurchPrimaryOrganization().getId() : null;
        UUID familyPrimaryId = user.getFamilyPrimaryOrganization() != null ? 
            user.getFamilyPrimaryOrganization().getId() : null;
        
        // Filter out primary organizations
        return allMemberships.stream()
            .filter(m -> !m.getOrganization().getId().equals(churchPrimaryId))
            .filter(m -> !m.getOrganization().getId().equals(familyPrimaryId))
            .collect(java.util.stream.Collectors.toList());
    }

    /**
     * @deprecated Use getChurchPrimaryMembership() instead
     */
    @Deprecated
    public Optional<UserOrganizationMembership> getPrimaryMembership(UUID userId) {
        return getChurchPrimaryMembership(userId);
    }

    /**
     * @deprecated Use getGroupMemberships() instead
     */
    @Deprecated
    public List<UserOrganizationMembership> getSecondaryMemberships(UUID userId) {
        return getGroupMemberships(userId);
    }

    public List<UserOrganizationMembership> getAllMemberships(UUID userId) {
        return membershipRepository.findByUserId(userId);
    }

    public boolean isMember(UUID userId, UUID orgId) {
        return membershipRepository.existsByUserIdAndOrganizationId(userId, orgId);
    }

    /**
     * Check if an organization is one of the user's primary organizations (Church or Family)
     */
    public boolean isPrimaryMember(UUID userId, UUID orgId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        boolean isChurchPrimary = user.getChurchPrimaryOrganization() != null && 
            user.getChurchPrimaryOrganization().getId().equals(orgId);
        boolean isFamilyPrimary = user.getFamilyPrimaryOrganization() != null && 
            user.getFamilyPrimaryOrganization().getId().equals(orgId);
        
        return isChurchPrimary || isFamilyPrimary;
    }

    /**
     * Check if organization is user's Church Primary
     */
    public boolean isChurchPrimary(UUID userId, UUID orgId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        return user.getChurchPrimaryOrganization() != null && 
            user.getChurchPrimaryOrganization().getId().equals(orgId);
    }

    /**
     * Check if organization is user's Family Primary
     */
    public boolean isFamilyPrimary(UUID userId, UUID orgId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        return user.getFamilyPrimaryOrganization() != null && 
            user.getFamilyPrimaryOrganization().getId().equals(orgId);
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
