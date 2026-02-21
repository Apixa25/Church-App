package com.churchapp.controller;

import com.churchapp.dto.*;
import com.churchapp.entity.Organization;
import com.churchapp.entity.UserOrganizationMembership;
import com.churchapp.repository.UserRepository;
import com.churchapp.service.AuditLogService;
import com.churchapp.service.MetricsSnapshotService;
import com.churchapp.service.OrganizationService;
import com.churchapp.service.StorageLimitService;
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
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import com.churchapp.service.FileUploadService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.UUID;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/organizations")
@RequiredArgsConstructor
@Slf4j
public class OrganizationController {

    private final OrganizationService organizationService;
    private final UserRepository userRepository;
    private final FileUploadService fileUploadService;
    private final com.churchapp.service.OrganizationMetricsService metricsService;
    private final MetricsSnapshotService metricsSnapshotService;
    private final StorageLimitService storageLimitService;
    private final AuditLogService auditLogService;
    private static final Set<Organization.OrganizationType> USER_CREATABLE_ORG_TYPES = Set.of(
        Organization.OrganizationType.CHURCH,
        Organization.OrganizationType.MINISTRY,
        Organization.OrganizationType.NONPROFIT,
        Organization.OrganizationType.FAMILY,
        Organization.OrganizationType.GENERAL
    );
    private static final Pattern SIMPLE_EMAIL_PATTERN =
        Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    // Helper method to get user ID from Spring Security User
    private UUID getUserId(User securityUser) {
        return userRepository.findByEmail(securityUser.getUsername())
            .map(com.churchapp.entity.User::getId)
            .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // Helper method to get User entity from Spring Security User
    private com.churchapp.entity.User getCurrentUserEntity(User securityUser) {
        return userRepository.findByEmail(securityUser.getUsername())
            .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // ========================================================================
    // ORGANIZATION CRUD
    // ========================================================================

    private void validateAdminContactFields(
            String adminContactName,
            String adminContactPhone,
            String adminContactEmail,
            String adminContactAddress) {
        if (adminContactName == null || adminContactName.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Administrator name is required");
        }
        if (adminContactPhone == null || adminContactPhone.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Administrator phone is required");
        }
        if (adminContactEmail == null || adminContactEmail.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Administrator email is required");
        }
        if (!SIMPLE_EMAIL_PATTERN.matcher(adminContactEmail.trim()).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Administrator email must be valid");
        }
        if (adminContactAddress == null || adminContactAddress.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Administrator address is required");
        }
    }

    private Map<String, Object> buildMetadataWithAdminContact(
            String description,
            String adminContactName,
            String adminContactPhone,
            String adminContactEmail,
            String adminContactAddress) {
        Map<String, Object> metadata = new HashMap<>();
        if (description != null && !description.trim().isEmpty()) {
            metadata.put("description", description.trim());
        }
        metadata.put("adminContactName", adminContactName.trim());
        metadata.put("adminContactPhone", adminContactPhone.trim());
        metadata.put("adminContactEmail", adminContactEmail.trim());
        metadata.put("adminContactAddress", adminContactAddress.trim());
        return metadata;
    }

    private void logCreateOrganizationPendingBankingReview(
            com.churchapp.entity.User creator,
            Organization createdOrg,
            String adminContactName,
            String adminContactEmail,
            HttpServletRequest servletRequest) {
        Map<String, String> details = new HashMap<>();
        details.put("organizationId", String.valueOf(createdOrg.getId()));
        details.put("organizationName", createdOrg.getName());
        details.put("organizationType", createdOrg.getType() != null ? createdOrg.getType().name() : "UNKNOWN");
        details.put("bankingReviewStatus", "PENDING_CONTACT");
        details.put("creatorUserId", String.valueOf(creator.getId()));
        details.put("creatorEmail", creator.getEmail());
        details.put("adminContactName", adminContactName != null ? adminContactName : "");
        details.put("adminContactEmail", adminContactEmail != null ? adminContactEmail : "");

        auditLogService.logAction(
            creator.getId(),
            "CREATE_ORGANIZATION_PENDING_BANKING_REVIEW",
            details,
            "ORGANIZATION",
            createdOrg.getId(),
            servletRequest
        );
    }

    @PostMapping(consumes = {"multipart/form-data"})
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    public ResponseEntity<OrganizationResponse> createOrganization(
            @RequestParam("name") String name,
            @RequestParam("slug") String slug,
            @RequestParam("type") String type,
            @RequestParam("adminContactName") String adminContactName,
            @RequestParam("adminContactPhone") String adminContactPhone,
            @RequestParam("adminContactEmail") String adminContactEmail,
            @RequestParam("adminContactAddress") String adminContactAddress,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "logo", required = false) MultipartFile logoFile,
            @AuthenticationPrincipal User userDetails,
            HttpServletRequest servletRequest) {

        log.info("Creating organization: {} by system admin: {}", name, userDetails.getUsername());

        try {
            validateAdminContactFields(
                adminContactName,
                adminContactPhone,
                adminContactEmail,
                adminContactAddress
            );

            // Upload logo if provided
            String logoUrl = null;
            if (logoFile != null && !logoFile.isEmpty()) {
                log.info("Uploading logo for organization: {}", name);
                logoUrl = fileUploadService.uploadFile(logoFile, "organizations/logos");
                log.info("Logo uploaded successfully: {}", logoUrl);
            }

            // Build request object
            OrganizationRequest request = new OrganizationRequest();
            request.setName(name);
            request.setSlug(slug);
            request.setType(type);
            request.setLogoUrl(logoUrl);
            
            request.setMetadata(buildMetadataWithAdminContact(
                description,
                adminContactName,
                adminContactPhone,
                adminContactEmail,
                adminContactAddress
            ));

            Organization org = request.toOrganization();
            com.churchapp.entity.User creator = getCurrentUserEntity(userDetails);
            Organization created = organizationService.createOrganization(org, creator);
            logCreateOrganizationPendingBankingReview(
                creator,
                created,
                adminContactName,
                adminContactEmail,
                servletRequest
            );

            OrganizationResponse response = OrganizationResponse.fromOrganization(created);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (Exception e) {
            log.error("Error creating organization: {}", name, e);
            throw new RuntimeException("Failed to create organization: " + e.getMessage(), e);
        }
    }

    // Keep the existing JSON endpoint for backward compatibility
    @PostMapping(consumes = {"application/json"})
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    public ResponseEntity<OrganizationResponse> createOrganizationJson(
            @Valid @RequestBody OrganizationRequest request,
            @AuthenticationPrincipal User userDetails,
            HttpServletRequest servletRequest) {

        log.info("Creating organization (JSON): {} by system admin: {}", request.getName(), userDetails.getUsername());
        validateAdminContactFields(
            request.getAdminContactName(),
            request.getAdminContactPhone(),
            request.getAdminContactEmail(),
            request.getAdminContactAddress()
        );

        Organization org = request.toOrganization();
        com.churchapp.entity.User creator = getCurrentUserEntity(userDetails);
        Organization created = organizationService.createOrganization(org, creator);
        logCreateOrganizationPendingBankingReview(
            creator,
            created,
            request.getAdminContactName(),
            request.getAdminContactEmail(),
            servletRequest
        );

        OrganizationResponse response = OrganizationResponse.fromOrganization(created);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping(value = "/user-create", consumes = {"multipart/form-data"})
    public ResponseEntity<OrganizationResponse> createOrganizationForUser(
            @RequestParam("name") String name,
            @RequestParam("slug") String slug,
            @RequestParam("type") String type,
            @RequestParam("adminContactName") String adminContactName,
            @RequestParam("adminContactPhone") String adminContactPhone,
            @RequestParam("adminContactEmail") String adminContactEmail,
            @RequestParam("adminContactAddress") String adminContactAddress,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "logo", required = false) MultipartFile logoFile,
            @AuthenticationPrincipal User userDetails,
            HttpServletRequest servletRequest) {

        log.info("User {} creating organization: {}", userDetails.getUsername(), name);

        try {
            validateAdminContactFields(
                adminContactName,
                adminContactPhone,
                adminContactEmail,
                adminContactAddress
            );

            Organization.OrganizationType requestedType;
            try {
                requestedType = Organization.OrganizationType.valueOf(type.toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid organization type: " + type);
            }

            if (!USER_CREATABLE_ORG_TYPES.contains(requestedType)) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "This organization type is not available for user-created organizations"
                );
            }

            String logoUrl = null;
            if (logoFile != null && !logoFile.isEmpty()) {
                log.info("Uploading logo for user-created organization: {}", name);
                logoUrl = fileUploadService.uploadFile(logoFile, "organizations/logos");
                log.info("Logo uploaded successfully: {}", logoUrl);
            }

            OrganizationRequest request = new OrganizationRequest();
            request.setName(name);
            request.setSlug(slug);
            request.setType(requestedType.name());
            request.setLogoUrl(logoUrl);

            request.setMetadata(buildMetadataWithAdminContact(
                description,
                adminContactName,
                adminContactPhone,
                adminContactEmail,
                adminContactAddress
            ));

            Organization org = request.toOrganization();
            com.churchapp.entity.User creator = getCurrentUserEntity(userDetails);
            Organization created = organizationService.createOrganization(org, creator);
            logCreateOrganizationPendingBankingReview(
                creator,
                created,
                adminContactName,
                adminContactEmail,
                servletRequest
            );

            OrganizationResponse response = OrganizationResponse.fromOrganization(created);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            log.error("Error creating user organization: {}", name, e);
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error creating user organization: {}", name, e);
            throw new RuntimeException("Failed to create organization: " + e.getMessage(), e);
        }
    }

    // ========================================================================
    // FAMILY GROUP CREATION - Available to all authenticated users
    // ========================================================================
    
    /**
     * Create a family group - available to all authenticated users
     * This endpoint allows regular users to create FAMILY type organizations
     */
    @PostMapping(value = "/family-group", consumes = {"multipart/form-data"})
    public ResponseEntity<OrganizationResponse> createFamilyGroup(
            @RequestParam("name") String name,
            @RequestParam("slug") String slug,
            @RequestParam("adminContactName") String adminContactName,
            @RequestParam("adminContactPhone") String adminContactPhone,
            @RequestParam("adminContactEmail") String adminContactEmail,
            @RequestParam("adminContactAddress") String adminContactAddress,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "logo", required = false) MultipartFile logoFile,
            @AuthenticationPrincipal User userDetails,
            HttpServletRequest servletRequest) {

        log.info("Creating family group: {} by user: {}", name, userDetails.getUsername());

        try {
            validateAdminContactFields(
                adminContactName,
                adminContactPhone,
                adminContactEmail,
                adminContactAddress
            );

            // Upload logo if provided
            String logoUrl = null;
            if (logoFile != null && !logoFile.isEmpty()) {
                log.info("Uploading logo for family group: {}", name);
                logoUrl = fileUploadService.uploadFile(logoFile, "organizations/logos");
                log.info("Logo uploaded successfully: {}", logoUrl);
            }

            // Get the current user entity
            com.churchapp.entity.User creator = getCurrentUserEntity(userDetails);

            // Build organization request - force type to FAMILY
            OrganizationRequest request = new OrganizationRequest();
            request.setName(name);
            request.setSlug(slug);
            request.setType("FAMILY"); // Force FAMILY type
            request.setLogoUrl(logoUrl);
            
            request.setMetadata(buildMetadataWithAdminContact(
                description,
                adminContactName,
                adminContactPhone,
                adminContactEmail,
                adminContactAddress
            ));

            Organization org = request.toOrganization();
            
            // Validate that it's actually a FAMILY type
            if (org.getType() != Organization.OrganizationType.FAMILY) {
                throw new RuntimeException("This endpoint can only create FAMILY type organizations");
            }

            // Create the organization with the creator
            Organization created = organizationService.createOrganization(org, creator);
            logCreateOrganizationPendingBankingReview(
                creator,
                created,
                adminContactName,
                adminContactEmail,
                servletRequest
            );

            OrganizationResponse response = OrganizationResponse.fromOrganization(created);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (RuntimeException e) {
            log.error("Error creating family group: {}", name, e);
            throw e; // Re-throw RuntimeException as-is
        } catch (Exception e) {
            log.error("Unexpected error creating family group: {}", name, e);
            throw new RuntimeException("Failed to create family group: " + e.getMessage(), e);
        }
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

    @GetMapping("/all")
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    public ResponseEntity<List<OrganizationResponse>> getAllOrganizationsUnpaginated(
            @AuthenticationPrincipal User userDetails) {

        // Get all non-deleted organizations (admin only - no pagination)
        // This includes ACTIVE, TRIAL, SUSPENDED, and CANCELLED statuses
        Pageable pageable = PageRequest.of(0, 1000); // Large page to get all
        Page<Organization> orgs = organizationService.getAllNonDeletedOrganizations(pageable);

        List<OrganizationResponse> response = orgs.getContent().stream()
            .map(org -> {
                OrganizationResponse resp = OrganizationResponse.fromOrganization(org);
                resp.setMemberCount(organizationService.getMemberCount(org.getId()));
                resp.setPrimaryMemberCount(organizationService.getPrimaryMemberCount(org.getId()));
                return resp;
            })
            .collect(Collectors.toList());

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

    @PutMapping(value = "/{orgId}", consumes = {"application/json"})
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

    // Update organization with logo upload (multipart/form-data)
    @PutMapping(value = "/{orgId}", consumes = {"multipart/form-data"})
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    public ResponseEntity<OrganizationResponse> updateOrganizationWithLogo(
            @PathVariable UUID orgId,
            @RequestParam(value = "name", required = false) String name,
            @RequestParam(value = "logo", required = false) MultipartFile logoFile,
            @AuthenticationPrincipal User userDetails) {

        log.info("Updating organization {} logo by admin: {}", orgId, userDetails.getUsername());

        try {
            Organization org = organizationService.getOrganizationById(orgId);
            
            // Upload new logo if provided
            String logoUrl = null;
            if (logoFile != null && !logoFile.isEmpty()) {
                // Delete old logo if exists
                if (org.getLogoUrl() != null && !org.getLogoUrl().isEmpty()) {
                    try {
                        fileUploadService.deleteFile(org.getLogoUrl());
                        log.info("Deleted old logo for organization: {}", orgId);
                    } catch (Exception e) {
                        log.warn("Could not delete old logo for organization: {}", orgId, e);
                        // Continue with upload even if deletion fails
                    }
                }
                
                log.info("Uploading new logo for organization: {}", orgId);
                logoUrl = fileUploadService.uploadFile(logoFile, "organizations/logos");
                log.info("Logo uploaded successfully: {}", logoUrl);
            }

            // Update organization
            Organization updates = new Organization();
            if (name != null && !name.trim().isEmpty()) {
                updates.setName(name.trim());
            }
            if (logoUrl != null) {
                updates.setLogoUrl(logoUrl);
            }

            Organization updated = organizationService.updateOrganization(orgId, updates);

            OrganizationResponse response = OrganizationResponse.fromOrganization(updated);
            response.setMemberCount(organizationService.getMemberCount(orgId));
            response.setPrimaryMemberCount(organizationService.getPrimaryMemberCount(orgId));

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error updating organization {}: {}", orgId, e.getMessage(), e);
            throw new RuntimeException("Failed to update organization: " + e.getMessage(), e);
        }
    }

    // Update organization status (admin only)
    @PatchMapping("/{orgId}/status")
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    public ResponseEntity<OrganizationResponse> updateOrganizationStatus(
            @PathVariable UUID orgId,
            @RequestParam("status") String statusStr,
            @AuthenticationPrincipal User userDetails) {

        log.info("Updating organization {} status to {} by admin: {}", orgId, statusStr, userDetails.getUsername());

        try {
            Organization.OrganizationStatus newStatus = Organization.OrganizationStatus.valueOf(statusStr.toUpperCase());
            Organization updated = organizationService.updateOrganizationStatus(orgId, newStatus);

            OrganizationResponse response = OrganizationResponse.fromOrganization(updated);
            response.setMemberCount(organizationService.getMemberCount(orgId));
            response.setPrimaryMemberCount(organizationService.getPrimaryMemberCount(orgId));

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.error("Invalid status value: {}", statusStr);
            return ResponseEntity.badRequest().build();
        }
    }

    // Delete organization (admin only) - deletes all related data
    @DeleteMapping("/{orgId}")
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    public ResponseEntity<Void> deleteOrganization(
            @PathVariable UUID orgId,
            @AuthenticationPrincipal User userDetails) {

        log.warn("Admin {} deleting organization {}", userDetails.getUsername(), orgId);

        try {
            organizationService.deleteOrganization(orgId);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            log.error("Error deleting organization {}: {}", orgId, e.getMessage());
            throw e;
        }
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

    // Get all members of an organization (PLATFORM_ADMIN only)
    @GetMapping("/{orgId}/members")
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    public ResponseEntity<List<MembershipResponse>> getOrganizationMembers(
            @PathVariable UUID orgId,
            @AuthenticationPrincipal User userDetails) {

        log.info("Admin {} requesting members of organization {}", userDetails.getUsername(), orgId);

        List<UserOrganizationMembership> memberships = organizationService.getOrganizationMembers(orgId);

        List<MembershipResponse> response = memberships.stream()
            .map(MembershipResponse::fromOrgMembership)
            .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    // Promote user to ORG_ADMIN (PLATFORM_ADMIN only)
    @PostMapping("/{orgId}/members/{userId}/promote")
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    public ResponseEntity<MembershipResponse> promoteToOrgAdmin(
            @PathVariable UUID orgId,
            @PathVariable UUID userId,
            @AuthenticationPrincipal User userDetails) {

        log.info("Admin {} promoting user {} to ORG_ADMIN in organization {}", 
                userDetails.getUsername(), userId, orgId);

        organizationService.promoteToOrgAdmin(userId, orgId);

        // Fetch updated membership
        UserOrganizationMembership membership = organizationService.getMembership(userId, orgId);
        MembershipResponse response = MembershipResponse.fromOrgMembership(membership);

        return ResponseEntity.ok(response);
    }

    // Demote ORG_ADMIN to MEMBER (PLATFORM_ADMIN only)
    @PostMapping("/{orgId}/members/{userId}/demote")
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    public ResponseEntity<MembershipResponse> demoteOrgAdmin(
            @PathVariable UUID orgId,
            @PathVariable UUID userId,
            @AuthenticationPrincipal User userDetails) {

        log.info("Admin {} demoting user {} from ORG_ADMIN in organization {}", 
                userDetails.getUsername(), userId, orgId);

        organizationService.demoteOrgAdmin(userId, orgId);

        // Fetch updated membership
        UserOrganizationMembership membership = organizationService.getMembership(userId, orgId);
        MembershipResponse response = MembershipResponse.fromOrgMembership(membership);

        return ResponseEntity.ok(response);
    }

    // ========================================================================
    // DUAL PRIMARY ORGANIZATION SYSTEM
    // ========================================================================

    /**
     * Set organization as Church Primary
     * Church Primary slot accepts: CHURCH, MINISTRY, NONPROFIT, GENERAL
     */
    @PostMapping("/{orgId}/set-church-primary")
    public ResponseEntity<MembershipResponse> setChurchPrimary(
            @PathVariable UUID orgId,
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        log.info("User {} setting Church Primary to organization {}", userId, orgId);

        UserOrganizationMembership membership = organizationService.setChurchPrimary(userId, orgId);

        MembershipResponse response = MembershipResponse.fromOrgMembership(membership);
        return ResponseEntity.ok(response);
    }

    /**
     * Set organization as Family Primary
     * Family Primary slot accepts: FAMILY only
     */
    @PostMapping("/{orgId}/set-family-primary")
    public ResponseEntity<MembershipResponse> setFamilyPrimary(
            @PathVariable UUID orgId,
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        log.info("User {} setting Family Primary to organization {}", userId, orgId);

        UserOrganizationMembership membership = organizationService.setFamilyPrimary(userId, orgId);

        MembershipResponse response = MembershipResponse.fromOrgMembership(membership);
        return ResponseEntity.ok(response);
    }

    /**
     * Join organization as Group (social feed only access)
     */
    @PostMapping("/{orgId}/join-as-group")
    public ResponseEntity<MembershipResponse> joinAsGroup(
            @PathVariable UUID orgId,
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        log.info("User {} joining organization {} as Group (social feed only)", userId, orgId);

        UserOrganizationMembership membership = organizationService.joinAsGroup(userId, orgId);

        MembershipResponse response = MembershipResponse.fromOrgMembership(membership);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Clear Church Primary (demote to Group)
     */
    @DeleteMapping("/my-church-primary")
    public ResponseEntity<Void> clearChurchPrimary(
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        log.info("User {} clearing Church Primary", userId);

        organizationService.clearChurchPrimary(userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Clear Family Primary (demote to Group)
     */
    @DeleteMapping("/my-family-primary")
    public ResponseEntity<Void> clearFamilyPrimary(
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        log.info("User {} clearing Family Primary", userId);

        organizationService.clearFamilyPrimary(userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Get user's Church Primary membership
     */
    @GetMapping("/my-memberships/church-primary")
    public ResponseEntity<MembershipResponse> getMyChurchPrimaryMembership(
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        return organizationService.getChurchPrimaryMembership(userId)
            .map(membership -> ResponseEntity.ok(MembershipResponse.fromOrgMembership(membership)))
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get user's Family Primary membership
     */
    @GetMapping("/my-memberships/family-primary")
    public ResponseEntity<MembershipResponse> getMyFamilyPrimaryMembership(
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        return organizationService.getFamilyPrimaryMembership(userId)
            .map(membership -> ResponseEntity.ok(MembershipResponse.fromOrgMembership(membership)))
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get user's Group memberships (non-primary organizations)
     */
    @GetMapping("/my-memberships/groups")
    public ResponseEntity<List<MembershipResponse>> getMyGroupMemberships(
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        List<UserOrganizationMembership> memberships = organizationService.getGroupMemberships(userId);

        List<MembershipResponse> response = memberships.stream()
            .map(MembershipResponse::fromOrgMembership)
            .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    // ========================================================================
    // LEGACY ENDPOINTS (Backward compatibility - deprecated)
    // ========================================================================

    /**
     * @deprecated Use setChurchPrimary() instead. This now delegates to setChurchPrimary.
     */
    @Deprecated
    @PostMapping("/{orgId}/switch-primary")
    public ResponseEntity<MembershipResponse> switchPrimaryOrganization(
            @PathVariable UUID orgId,
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        log.info("User {} using legacy switch-primary (now maps to set-church-primary) for {}", userId, orgId);

        UserOrganizationMembership membership = organizationService.switchPrimaryOrganization(userId, orgId);

        MembershipResponse response = MembershipResponse.fromOrgMembership(membership);
        return ResponseEntity.ok(response);
    }

    /**
     * @deprecated No more cooldown - always returns true
     */
    @Deprecated
    @GetMapping("/switch-primary/can-switch")
    public ResponseEntity<Boolean> canSwitchPrimaryOrganization(
            @AuthenticationPrincipal User userDetails) {

        return ResponseEntity.ok(true); // No more cooldown!
    }

    /**
     * @deprecated No more cooldown - always returns 0
     */
    @Deprecated
    @GetMapping("/switch-primary/days-until")
    public ResponseEntity<Long> getDaysUntilCanSwitch(
            @AuthenticationPrincipal User userDetails) {

        return ResponseEntity.ok(0L); // No more cooldown!
    }

    // ========================================================================
    // USER'S MEMBERSHIPS
    // ========================================================================

    @GetMapping("/my-memberships")
    public ResponseEntity<List<MembershipResponse>> getMyMemberships(
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        log.info("🔍 DEBUG: User {} requesting ALL memberships", userDetails.getUsername());
        List<UserOrganizationMembership> memberships = organizationService.getAllMemberships(userId);
        log.info("🔍 DEBUG: Found {} memberships for user {}", memberships.size(), userDetails.getUsername());

        List<MembershipResponse> response = memberships.stream()
            .map(MembershipResponse::fromOrgMembership)
            .collect(Collectors.toList());
        
        // Log each membership role for debugging
        response.forEach(m -> log.info("🔍 DEBUG: - Org: {}, Role: {}, IsPrimary: {}", 
            m.getOrganizationName(), m.getRole(), m.getIsPrimary()));

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

    /**
     * Get organization memberships for a specific user
     * This endpoint allows viewing another user's public organization memberships
     * GET /api/organizations/users/{userId}/memberships
     */
    @GetMapping("/users/{userId}/memberships")
    public ResponseEntity<List<MembershipResponse>> getUserMemberships(
            @PathVariable UUID userId) {

        log.info("Requesting memberships for user {}", userId);
        List<UserOrganizationMembership> memberships = organizationService.getAllMemberships(userId);

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

    // ========================================================================
    // ORGANIZATION METRICS
    // ========================================================================

    @GetMapping("/{orgId}/metrics")
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    public ResponseEntity<OrganizationMetricsResponse> getOrganizationMetrics(
            @PathVariable UUID orgId,
            @AuthenticationPrincipal User userDetails) {

        log.info("Admin {} requesting metrics for organization {}", userDetails.getUsername(), orgId);

        try {
            var metrics = metricsService.getMetrics(orgId);
            OrganizationMetricsResponse response = OrganizationMetricsResponse.fromMetrics(metrics, orgId);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error getting metrics for organization {}: {}", orgId, e.getMessage(), e);
            throw new RuntimeException("Failed to get organization metrics: " + e.getMessage(), e);
        }
    }

    @PostMapping("/{orgId}/metrics/calculate")
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    public ResponseEntity<OrganizationMetricsResponse> calculateOrganizationMetrics(
            @PathVariable UUID orgId,
            @AuthenticationPrincipal User userDetails) {

        log.info("Admin {} triggering metrics calculation for organization {}", userDetails.getUsername(), orgId);

        try {
            var metrics = metricsService.calculateMetrics(orgId);
            OrganizationMetricsResponse response = OrganizationMetricsResponse.fromMetrics(metrics, orgId);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error calculating metrics for organization {}: {}", orgId, e.getMessage(), e);
            throw new RuntimeException("Failed to calculate organization metrics: " + e.getMessage(), e);
        }
    }

    // ========================================================================
    // HISTORICAL METRICS ENDPOINTS
    // ========================================================================

    @GetMapping("/{orgId}/metrics/history")
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    public ResponseEntity<List<MetricsHistoryResponse>> getOrganizationMetricsHistory(
            @PathVariable UUID orgId,
            @RequestParam(required = false) Integer days,
            @AuthenticationPrincipal User userDetails) {

        log.info("Admin {} requesting metrics history for organization {}", userDetails.getUsername(), orgId);

        try {
            List<com.churchapp.entity.OrganizationMetricsHistory> history;
            
            if (days != null && days > 0) {
                history = metricsSnapshotService.getHistoryForLastDays(orgId, days);
            } else {
                history = metricsSnapshotService.getHistory(orgId);
            }

            List<MetricsHistoryResponse> response = history.stream()
                    .map(MetricsHistoryResponse::fromHistory)
                    .toList();

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error getting metrics history for organization {}: {}", orgId, e.getMessage(), e);
            throw new RuntimeException("Failed to get metrics history: " + e.getMessage(), e);
        }
    }

    @GetMapping("/{orgId}/metrics/history/latest")
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    public ResponseEntity<MetricsHistoryResponse> getLatestMetricsSnapshot(
            @PathVariable UUID orgId,
            @AuthenticationPrincipal User userDetails) {

        log.info("Admin {} requesting latest metrics snapshot for organization {}", userDetails.getUsername(), orgId);

        try {
            var latest = metricsSnapshotService.getLatestSnapshot(orgId);
            
            if (latest == null) {
                return ResponseEntity.notFound().build();
            }

            MetricsHistoryResponse response = MetricsHistoryResponse.fromHistory(latest);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error getting latest metrics snapshot for organization {}: {}", orgId, e.getMessage(), e);
            throw new RuntimeException("Failed to get latest metrics snapshot: " + e.getMessage(), e);
        }
    }

    @PostMapping("/{orgId}/metrics/snapshot")
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    public ResponseEntity<MetricsHistoryResponse> createMetricsSnapshot(
            @PathVariable UUID orgId,
            @AuthenticationPrincipal User userDetails) {

        log.info("Admin {} triggering metrics snapshot creation for organization {}", userDetails.getUsername(), orgId);

        try {
            var snapshot = metricsSnapshotService.createSnapshot(orgId);
            MetricsHistoryResponse response = MetricsHistoryResponse.fromHistory(snapshot);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error creating metrics snapshot for organization {}: {}", orgId, e.getMessage(), e);
            throw new RuntimeException("Failed to create metrics snapshot: " + e.getMessage(), e);
        }
    }

    // ========================================================================
    // STORAGE LIMITS
    // ========================================================================

    @GetMapping("/{orgId}/storage-limit")
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    public ResponseEntity<StorageLimitResponse> getStorageLimit(
            @PathVariable UUID orgId,
            @AuthenticationPrincipal User userDetails) {

        log.info("Admin {} requesting storage limit for organization {}", userDetails.getUsername(), orgId);
        var info = storageLimitService.getStorageLimit(orgId);
        return ResponseEntity.ok(StorageLimitResponse.fromInfo(info));
    }

    @PutMapping("/{orgId}/storage-limit")
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    public ResponseEntity<StorageLimitResponse> updateStorageLimit(
            @PathVariable UUID orgId,
            @RequestBody StorageLimitUpdateRequest request,
            @AuthenticationPrincipal User userDetails) {

        log.info("Admin {} updating storage limit for organization {}", userDetails.getUsername(), orgId);
        var info = storageLimitService.updateStorageLimit(
                orgId,
                request.getStorageLimitBytes(),
                request.getStorageAlertThreshold()
        );
        return ResponseEntity.ok(StorageLimitResponse.fromInfo(info));
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

    // Inner class for metrics response
    @lombok.Data
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class OrganizationMetricsResponse {
        private UUID organizationId;
        private Long storageUsed;
        private Long storageMediaFiles;
        private Long storageDocuments;
        private Long storageProfilePics;
        private Integer apiRequestsCount;
        private Long dataTransferBytes;
        private Integer activeUsersCount;
        private Integer postsCount;
        private Integer prayerRequestsCount;
        private Integer eventsCount;
        private Integer announcementsCount;
        private LocalDateTime calculatedAt;
        private Long storageLimitBytes;
        private Integer storageAlertThreshold;
        private Integer storageLimitPercent;
        private String storageLimitStatus;

        public static OrganizationMetricsResponse fromMetrics(com.churchapp.entity.OrganizationMetrics metrics, UUID orgId) {
            OrganizationMetricsResponse response = new OrganizationMetricsResponse();
            response.setOrganizationId(orgId); // Use provided orgId to avoid lazy loading issue
            response.setStorageUsed(metrics.getStorageUsed());
            response.setStorageMediaFiles(metrics.getStorageMediaFiles());
            response.setStorageDocuments(metrics.getStorageDocuments());
            response.setStorageProfilePics(metrics.getStorageProfilePics());
            response.setApiRequestsCount(metrics.getApiRequestsCount());
            response.setDataTransferBytes(metrics.getDataTransferBytes());
            response.setActiveUsersCount(metrics.getActiveUsersCount());
            response.setPostsCount(metrics.getPostsCount());
            response.setPrayerRequestsCount(metrics.getPrayerRequestsCount());
            response.setEventsCount(metrics.getEventsCount());
            response.setAnnouncementsCount(metrics.getAnnouncementsCount());
            response.setCalculatedAt(metrics.getCalculatedAt() != null ? metrics.getCalculatedAt() : LocalDateTime.now());
            Organization org = metrics.getOrganization();
            Long limitBytes = org != null ? org.getStorageLimitBytes() : null;
            Integer alertThreshold = org != null ? org.getStorageAlertThreshold() : null;
            Integer percent = null;
            if (limitBytes != null && limitBytes > 0 && metrics.getStorageUsed() != null) {
                percent = (int) Math.min(100, Math.round((metrics.getStorageUsed() * 100.0) / limitBytes));
            }

            response.setStorageLimitBytes(limitBytes);
            response.setStorageAlertThreshold(alertThreshold);
            response.setStorageLimitPercent(percent);
            response.setStorageLimitStatus(org != null && org.getStorageLimitStatus() != null
                    ? org.getStorageLimitStatus().name()
                    : Organization.StorageLimitStatus.OK.name());

            return response;
        }
    }

    // Inner class for metrics history response
    @lombok.Data
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class MetricsHistoryResponse {
        private UUID id;
        private UUID organizationId;
        private Map<String, Object> metricsSnapshot;
        private LocalDateTime recordedAt;
        private LocalDateTime createdAt;

        public static MetricsHistoryResponse fromHistory(com.churchapp.entity.OrganizationMetricsHistory history) {
            MetricsHistoryResponse response = new MetricsHistoryResponse();
            response.setId(history.getId());
            response.setOrganizationId(history.getOrganization() != null ? history.getOrganization().getId() : null);
            response.setMetricsSnapshot(history.getMetricsSnapshot());
            response.setRecordedAt(history.getRecordedAt());
            response.setCreatedAt(history.getCreatedAt());
            return response;
        }
    }

    @lombok.Data
    public static class StorageLimitUpdateRequest {
        private Long storageLimitBytes;
        private Integer storageAlertThreshold;
    }

    @lombok.Data
    @lombok.Builder
    public static class StorageLimitResponse {
        private UUID organizationId;
        private Long storageLimitBytes;
        private Integer storageAlertThreshold;
        private Long storageUsed;
        private Integer storageLimitPercent;
        private String storageLimitStatus;
        private Boolean alertTriggered;

        public static StorageLimitResponse fromInfo(StorageLimitService.StorageLimitInfo info) {
            return StorageLimitResponse.builder()
                    .organizationId(info.getOrganizationId())
                    .storageLimitBytes(info.getStorageLimitBytes())
                    .storageAlertThreshold(info.getStorageAlertThreshold())
                    .storageUsed(info.getStorageUsed())
                    .storageLimitPercent(info.getUsagePercent())
                    .storageLimitStatus(info.getStatus() != null ? info.getStatus().name() : null)
                    .alertTriggered(info.getAlertTriggered())
                    .build();
        }
    }
}
