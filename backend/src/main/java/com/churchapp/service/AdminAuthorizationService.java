package com.churchapp.service;

import com.churchapp.entity.User;
import com.churchapp.entity.UserOrganizationMembership;
import com.churchapp.repository.UserOrganizationMembershipRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Authorization service for admin operations in the 2-tier admin system
 * 
 * Tier 1: PLATFORM_ADMIN - System-wide access (Master of Everything)
 * Tier 2: ORG_ADMIN - Organization-scoped access (Full control of their org)
 */
@Service
@RequiredArgsConstructor
public class AdminAuthorizationService {
    
    private final UserOrganizationMembershipRepository membershipRepository;
    
    /**
     * Check if user is Platform Admin (can see/do everything across all organizations)
     * 
     * @param user The user to check
     * @return true if user has PLATFORM_ADMIN role
     */
    public boolean isPlatformAdmin(User user) {
        return user.getRole() == User.Role.PLATFORM_ADMIN;
    }
    
    /**
     * Check if user is an Admin of a specific organization
     * 
     * @param user The user to check
     * @param organizationId The organization ID to check
     * @return true if user has ORG_ADMIN role for this organization
     */
    public boolean isOrgAdmin(User user, UUID organizationId) {
        return membershipRepository
            .findByUserIdAndOrganizationId(user.getId(), organizationId)
            .map(membership -> membership.getRole() == UserOrganizationMembership.OrgRole.ORG_ADMIN)
            .orElse(false);
    }
    
    /**
     * Check if user has admin access to an organization
     * Returns true if user is either:
     *  - A Platform Admin (can access any org), OR
     *  - An Org Admin of the specific organization
     * 
     * @param user The user to check
     * @param organizationId The organization ID to check
     * @return true if user has admin access
     */
    public boolean hasOrgAdminAccess(User user, UUID organizationId) {
        return isPlatformAdmin(user) || isOrgAdmin(user, organizationId);
    }
    
    /**
     * Require admin access to organization - throws exception if not authorized
     * Use this in controllers/services to enforce authorization
     * 
     * @param user The user to check
     * @param organizationId The organization ID to check
     * @throws AccessDeniedException if user doesn't have admin access
     */
    public void requireOrgAdminAccess(User user, UUID organizationId) {
        if (!hasOrgAdminAccess(user, organizationId)) {
            throw new AccessDeniedException(
                "You don't have admin access to this organization"
            );
        }
    }
    
    /**
     * Require Platform Admin access - throws exception if not authorized
     * Use this for platform-wide operations like viewing all organizations
     * 
     * @param user The user to check
     * @throws AccessDeniedException if user is not a Platform Admin
     */
    public void requirePlatformAdmin(User user) {
        if (!isPlatformAdmin(user)) {
            throw new AccessDeniedException(
                "This operation requires Platform Admin access"
            );
        }
    }
    
    /**
     * Get list of organization IDs the user is an admin of
     * Returns null for Platform Admins (indicating access to ALL orgs)
     * Returns list of org IDs for Org Admins
     * 
     * Used for filtering dashboard data to appropriate scope
     * 
     * @param user The user to check
     * @return null (all orgs) for Platform Admin, or List of org IDs for Org Admin
     */
    public List<UUID> getAdminOrganizationIds(User user) {
        if (isPlatformAdmin(user)) {
            return null; // null = access to ALL organizations
        }
        
        return membershipRepository
            .findByUserId(user.getId())
            .stream()
            .filter(membership -> membership.getRole() == UserOrganizationMembership.OrgRole.ORG_ADMIN)
            .map(membership -> membership.getOrganization().getId())
            .collect(Collectors.toList());
    }
    
    /**
     * Check if user is a moderator (organization-level or platform-level)
     * 
     * @param user The user to check
     * @param organizationId Optional organization ID to check org-specific moderator
     * @return true if user is a moderator
     */
    public boolean isModerator(User user, UUID organizationId) {
        if (user.getRole() == User.Role.MODERATOR) {
            return true; // Platform-level moderator
        }
        
        if (organizationId != null) {
            return membershipRepository
                .findByUserIdAndOrganizationId(user.getId(), organizationId)
                .map(membership -> 
                    membership.getRole() == UserOrganizationMembership.OrgRole.MODERATOR ||
                    membership.getRole() == UserOrganizationMembership.OrgRole.ORG_ADMIN
                )
                .orElse(false);
        }
        
        return false;
    }
    
    /**
     * Check if user can moderate content in an organization
     * Returns true if user is:
     *  - Platform Admin (can moderate anywhere)
     *  - Platform Moderator (can moderate anywhere)
     *  - Org Admin of the organization
     *  - Org Moderator of the organization
     * 
     * @param user The user to check
     * @param organizationId The organization ID to check
     * @return true if user can moderate content
     */
    public boolean canModerateOrg(User user, UUID organizationId) {
        if (isPlatformAdmin(user) || user.getRole() == User.Role.MODERATOR) {
            return true; // Platform-level access
        }
        
        return membershipRepository
            .findByUserIdAndOrganizationId(user.getId(), organizationId)
            .map(membership -> 
                membership.getRole() == UserOrganizationMembership.OrgRole.ORG_ADMIN ||
                membership.getRole() == UserOrganizationMembership.OrgRole.MODERATOR
            )
            .orElse(false);
    }
}

