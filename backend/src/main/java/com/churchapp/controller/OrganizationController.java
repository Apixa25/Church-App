package com.churchapp.controller;

import com.churchapp.dto.*;
import com.churchapp.entity.Organization;
import com.churchapp.entity.UserOrganizationMembership;
import com.churchapp.repository.UserRepository;
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
import com.churchapp.service.FileUploadService;

import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/organizations")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class OrganizationController {

    private final OrganizationService organizationService;
    private final UserRepository userRepository;
    private final FileUploadService fileUploadService;
    private final com.churchapp.service.OrganizationMetricsService metricsService;
    private final MetricsSnapshotService metricsSnapshotService;
    private final StorageLimitService storageLimitService;

    // Helper method to get user ID from Spring Security User
    private UUID getUserId(User securityUser) {
        return userRepository.findByEmail(securityUser.getUsername())
            .map(com.churchapp.entity.User::getId)
            .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // ========================================================================
    // ORGANIZATION CRUD
    // ========================================================================

    @PostMapping(consumes = {"multipart/form-data"})
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    public ResponseEntity<OrganizationResponse> createOrganization(
            @RequestParam("name") String name,
            @RequestParam("slug") String slug,
            @RequestParam("type") String type,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "logo", required = false) MultipartFile logoFile,
            @AuthenticationPrincipal User userDetails) {

        log.info("Creating organization: {} by system admin: {}", name, userDetails.getUsername());

        try {
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
            
            // Add description to metadata if provided
            if (description != null && !description.trim().isEmpty()) {
                Map<String, Object> metadata = new HashMap<>();
                metadata.put("description", description.trim());
                request.setMetadata(metadata);
            }

            Organization org = request.toOrganization();
            Organization created = organizationService.createOrganization(org);

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
            @AuthenticationPrincipal User userDetails) {

        log.info("Creating organization (JSON): {} by system admin: {}", request.getName(), userDetails.getUsername());

        Organization org = request.toOrganization();
        Organization created = organizationService.createOrganization(org);

        OrganizationResponse response = OrganizationResponse.fromOrganization(created);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
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

    @PostMapping("/{orgId}/switch-primary")
    public ResponseEntity<MembershipResponse> switchPrimaryOrganization(
            @PathVariable UUID orgId,
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        log.info("User {} switching primary organization to {}", userId, orgId);

        UserOrganizationMembership membership = organizationService.switchPrimaryOrganization(userId, orgId);

        MembershipResponse response = MembershipResponse.fromOrgMembership(membership);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/switch-primary/can-switch")
    public ResponseEntity<Boolean> canSwitchPrimaryOrganization(
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        boolean canSwitch = organizationService.canSwitchPrimaryOrganization(userId);

        return ResponseEntity.ok(canSwitch);
    }

    @GetMapping("/switch-primary/days-until")
    public ResponseEntity<Long> getDaysUntilCanSwitch(
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        long days = organizationService.getDaysUntilCanSwitch(userId);

        return ResponseEntity.ok(days);
    }

    // ========================================================================
    // USER'S MEMBERSHIPS
    // ========================================================================

    @GetMapping("/my-memberships")
    public ResponseEntity<List<MembershipResponse>> getMyMemberships(
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        List<UserOrganizationMembership> memberships = organizationService.getAllMemberships(userId);

        List<MembershipResponse> response = memberships.stream()
            .map(MembershipResponse::fromOrgMembership)
            .collect(Collectors.toList());

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
