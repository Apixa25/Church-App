package com.churchapp.controller;

import com.churchapp.dto.ResourceRequest;
import com.churchapp.dto.ResourceResponse;
import com.churchapp.dto.UserProfileResponse;
import com.churchapp.entity.Resource;
import com.churchapp.service.ResourceService;
import com.churchapp.service.UserProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/resources")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8100", "capacitor://localhost"})
public class ResourceController {
    
    private final ResourceService resourceService;
    private final UserProfileService userProfileService;
    
    // Public endpoints (approved resources only)
    @GetMapping
    public ResponseEntity<?> getApprovedResources(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(required = false) String category,
        @RequestParam(required = false) String search,
        @RequestParam(required = false) String fileType
    ) {
        try {
            Page<Resource> resourcePage;
            
            if (search != null && !search.trim().isEmpty()) {
                resourcePage = resourceService.searchApprovedResources(search.trim(), page, size);
            } else if (category != null && !category.trim().isEmpty()) {
                try {
                    Resource.ResourceCategory categoryEnum = Resource.ResourceCategory.valueOf(category.toUpperCase());
                    resourcePage = resourceService.getResourcesByCategory(categoryEnum, page, size);
                } catch (IllegalArgumentException e) {
                    Map<String, String> error = new HashMap<>();
                    error.put("error", "Invalid category: " + category);
                    return ResponseEntity.badRequest().body(error);
                }
            } else if (fileType != null && !fileType.trim().isEmpty()) {
                resourcePage = resourceService.getResourcesByFileType(fileType.trim(), page, size);
            } else {
                resourcePage = resourceService.getApprovedResources(page, size);
            }
            
            List<ResourceResponse> resources = resourcePage.getContent()
                .stream()
                .map(ResourceResponse::publicFromResource)
                .collect(Collectors.toList());
            
            Map<String, Object> response = new HashMap<>();
            response.put("resources", resources);
            response.put("currentPage", resourcePage.getNumber());
            response.put("totalPages", resourcePage.getTotalPages());
            response.put("totalElements", resourcePage.getTotalElements());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error fetching resources: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to fetch resources");
            return ResponseEntity.internalServerError().body(error);
        }
    }
    
    @GetMapping("/{resourceId}")
    public ResponseEntity<?> getResource(@PathVariable UUID resourceId) {
        try {
            Resource resource = resourceService.getApprovedResource(resourceId);
            ResourceResponse response = ResourceResponse.publicFromResource(resource);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @PostMapping("/{resourceId}/download")
    public ResponseEntity<?> trackDownload(@PathVariable UUID resourceId) {
        try {
            resourceService.incrementDownloadCount(resourceId);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Download tracked successfully");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    // Authenticated endpoints
    @PostMapping
    public ResponseEntity<?> createResource(@AuthenticationPrincipal User user,
                                          @Valid @RequestBody ResourceRequest request) {
        try {
            log.info("Creating resource with title: {}", request.getTitle());
            
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            
            Resource resourceEntity = convertToEntity(request);
            Resource createdResource = resourceService.createResource(currentProfile.getUserId(), resourceEntity);
            
            ResourceResponse response = ResourceResponse.fromResource(createdResource);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("Error creating resource: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @PutMapping("/{resourceId}")
    public ResponseEntity<?> updateResource(@PathVariable UUID resourceId,
                                          @AuthenticationPrincipal User user,
                                          @Valid @RequestBody ResourceRequest request) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            
            Resource resourceUpdate = convertToEntity(request);
            Resource updatedResource = resourceService.updateResource(resourceId, currentProfile.getUserId(), resourceUpdate);
            
            ResourceResponse response = ResourceResponse.fromResource(updatedResource);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("Error updating resource: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @DeleteMapping("/{resourceId}")
    public ResponseEntity<?> deleteResource(@PathVariable UUID resourceId,
                                          @AuthenticationPrincipal User user) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            resourceService.deleteResource(resourceId, currentProfile.getUserId());
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "Resource deleted successfully");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("Error deleting resource: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    // User's own resources
    @GetMapping("/my-resources")
    public ResponseEntity<?> getUserResources(@AuthenticationPrincipal User user,
                                            @RequestParam(defaultValue = "0") int page,
                                            @RequestParam(defaultValue = "20") int size,
                                            @RequestParam(required = false) Boolean approved) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            
            Page<Resource> resourcePage;
            if (approved != null) {
                resourcePage = resourceService.getUserResourcesByStatus(currentProfile.getUserId(), approved, page, size);
            } else {
                resourcePage = resourceService.getUserResources(currentProfile.getUserId(), page, size);
            }
            
            List<ResourceResponse> resources = resourcePage.getContent()
                .stream()
                .map(ResourceResponse::fromResource)  // Show full details for own resources
                .collect(Collectors.toList());
            
            Map<String, Object> response = new HashMap<>();
            response.put("resources", resources);
            response.put("currentPage", resourcePage.getNumber());
            response.put("totalPages", resourcePage.getTotalPages());
            response.put("totalElements", resourcePage.getTotalElements());
            
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("Error fetching user resources: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    // Admin endpoints
    @GetMapping("/admin/all")
    public ResponseEntity<?> getAllResources(@AuthenticationPrincipal User user,
                                           @RequestParam(defaultValue = "0") int page,
                                           @RequestParam(defaultValue = "20") int size,
                                           @RequestParam(required = false) String search) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            
            Page<Resource> resourcePage;
            if (search != null && !search.trim().isEmpty()) {
                resourcePage = resourceService.searchAllResources(currentProfile.getUserId(), search.trim(), page, size);
            } else {
                resourcePage = resourceService.getAllResources(currentProfile.getUserId(), page, size);
            }
            
            List<ResourceResponse> resources = resourcePage.getContent()
                .stream()
                .map(ResourceResponse::fromResource)
                .collect(Collectors.toList());
            
            Map<String, Object> response = new HashMap<>();
            response.put("resources", resources);
            response.put("currentPage", resourcePage.getNumber());
            response.put("totalPages", resourcePage.getTotalPages());
            response.put("totalElements", resourcePage.getTotalElements());
            
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("Error fetching all resources: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @GetMapping("/admin/pending")
    public ResponseEntity<?> getPendingResources(@AuthenticationPrincipal User user,
                                               @RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "20") int size) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            
            Page<Resource> resourcePage = resourceService.getResourcesPendingApproval(currentProfile.getUserId(), page, size);
            
            List<ResourceResponse> resources = resourcePage.getContent()
                .stream()
                .map(ResourceResponse::fromResource)
                .collect(Collectors.toList());
            
            Map<String, Object> response = new HashMap<>();
            response.put("resources", resources);
            response.put("currentPage", resourcePage.getNumber());
            response.put("totalPages", resourcePage.getTotalPages());
            response.put("totalElements", resourcePage.getTotalElements());
            
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("Error fetching pending resources: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @PostMapping("/admin/{resourceId}/approve")
    public ResponseEntity<?> approveResource(@PathVariable UUID resourceId,
                                           @AuthenticationPrincipal User user) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            Resource approvedResource = resourceService.approveResource(resourceId, currentProfile.getUserId());
            
            ResourceResponse response = ResourceResponse.fromResource(approvedResource);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("Error approving resource: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @PostMapping("/admin/{resourceId}/reject")
    public ResponseEntity<?> rejectResource(@PathVariable UUID resourceId,
                                          @AuthenticationPrincipal User user) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            Resource rejectedResource = resourceService.rejectResource(resourceId, currentProfile.getUserId());
            
            ResourceResponse response = ResourceResponse.fromResource(rejectedResource);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("Error rejecting resource: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    // Statistics endpoints
    @GetMapping("/stats")
    public ResponseEntity<?> getResourceStats() {
        try {
            Map<String, Object> stats = new HashMap<>();
            stats.put("totalApproved", resourceService.countApprovedResources());
            stats.put("totalPending", resourceService.countPendingResources());
            stats.put("recentCount", resourceService.countRecentResources(7)); // Last 7 days
            
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            log.error("Error fetching resource stats: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to fetch statistics");
            return ResponseEntity.internalServerError().body(error);
        }
    }
    
    // Feed endpoints
    @GetMapping("/feed/recent")
    public ResponseEntity<?> getRecentResourcesForFeed(
        @RequestParam(defaultValue = "10") int limit
    ) {
        try {
            List<Resource> recentResources = resourceService.getRecentApprovedResourcesForFeed(limit);
            
            List<ResourceResponse> resources = recentResources.stream()
                .map(ResourceResponse::publicFromResource)
                .collect(Collectors.toList());
            
            return ResponseEntity.ok(resources);
        } catch (Exception e) {
            log.error("Error fetching recent resources for feed: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to fetch recent resources");
            return ResponseEntity.internalServerError().body(error);
        }
    }
    
    @GetMapping("/feed/popular")
    public ResponseEntity<?> getPopularResources(
        @RequestParam(defaultValue = "10") int limit
    ) {
        try {
            List<Resource> popularResources = resourceService.getMostDownloadedResources(limit);
            
            List<ResourceResponse> resources = popularResources.stream()
                .map(ResourceResponse::publicFromResource)
                .collect(Collectors.toList());
            
            return ResponseEntity.ok(resources);
        } catch (Exception e) {
            log.error("Error fetching popular resources: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to fetch popular resources");
            return ResponseEntity.internalServerError().body(error);
        }
    }
    
    // Helper method to convert DTO to entity
    private Resource convertToEntity(ResourceRequest request) {
        Resource resource = new Resource();
        resource.setTitle(request.getTitle());
        resource.setDescription(request.getDescription());
        resource.setCategory(request.getCategory());
        resource.setFileName(request.getFileName());
        resource.setFileUrl(request.getFileUrl());
        resource.setFileSize(request.getFileSize());
        resource.setFileType(request.getFileType());
        return resource;
    }
}