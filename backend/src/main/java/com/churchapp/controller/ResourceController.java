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
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/resources")
@RequiredArgsConstructor
@Slf4j
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
    
    // Public endpoint to get a user's approved resources (for profile view)
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserPublicResources(
        @PathVariable UUID userId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "12") int size
    ) {
        try {
            Page<Resource> resourcePage = resourceService.getApprovedResourcesByUserId(userId, page, size);

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
            log.error("Error fetching user's public resources: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to fetch user resources");
            return ResponseEntity.internalServerError().body(error);
        }
    }

    @GetMapping("/{resourceId}")
    public ResponseEntity<?> getResource(@PathVariable UUID resourceId, Authentication authentication) {
        try {
            Resource resource = resourceService.getResource(resourceId);
            
            // Check if user can view this resource
            boolean canView = resource.getIsApproved(); // Always show approved resources
            
            if (!canView && authentication != null) {
                // Allow users to view their own resources even if not approved
                String currentUserEmail = authentication.getName();
                UserProfileResponse currentUser = userProfileService.getUserProfileByEmail(currentUserEmail);
                canView = resource.getUploadedBy().getId().toString().equals(currentUser.getUserId()) ||
                         "ADMIN".equals(currentUser.getRole()) ||
                         "MODERATOR".equals(currentUser.getRole());
            }
            
            if (!canView) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Resource not found or not approved");
                return ResponseEntity.badRequest().body(error);
            }
            
            ResourceResponse response = ResourceResponse.publicFromResource(resource);
            log.info("Returning resource response: ID={}, Title={}, FileType={}, YouTubeUrl={}, YouTubeVideoId={}", 
                    response.getId(), response.getTitle(), response.getFileType(), 
                    response.getYoutubeUrl(), response.getYoutubeVideoId());
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

    @PostMapping("/{resourceId}/share")
    public ResponseEntity<?> trackShare(@PathVariable UUID resourceId) {
        try {
            resourceService.incrementShareCount(resourceId);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Share tracked successfully");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    // Authenticated endpoints
    @PostMapping
    public ResponseEntity<?> createResource(Authentication authentication,
                                          @Valid @RequestBody ResourceRequest request) {
        try {
            log.info("Creating resource with title: {}", request.getTitle());
            log.info("YouTube URL in request: {}", request.getYoutubeUrl());
            
            String email = authentication.getName();
            log.info("Authenticated user email: {}", email);
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(email);
            
            Resource resourceEntity = convertToEntity(request);
            Resource createdResource = resourceService.createResource(currentProfile.getUserId(), resourceEntity);
            
            ResourceResponse response = ResourceResponse.fromResource(createdResource);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("Error creating resource: {}", e.getMessage(), e);
            log.error("Stack trace:", e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        } catch (Exception e) {
            log.error("Unexpected error creating resource: {}", e.getMessage(), e);
            log.error("Stack trace:", e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "Unexpected error: " + e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }
    
    @PutMapping("/{resourceId}")
    public ResponseEntity<?> updateResource(@PathVariable UUID resourceId,
                                          Authentication authentication,
                                          @Valid @RequestBody ResourceRequest request) {
        try {
            String email = authentication.getName();
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(email);
            
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
                                          Authentication authentication) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(authentication.getName());
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
    public ResponseEntity<?> getUserResources(Authentication authentication,
                                            @RequestParam(defaultValue = "0") int page,
                                            @RequestParam(defaultValue = "20") int size,
                                            @RequestParam(required = false) Boolean approved) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(authentication.getName());
            
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
    public ResponseEntity<?> getAllResources(Authentication authentication,
                                           @RequestParam(defaultValue = "0") int page,
                                           @RequestParam(defaultValue = "20") int size,
                                           @RequestParam(required = false) String search) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(authentication.getName());
            
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
    public ResponseEntity<?> getPendingResources(Authentication authentication,
                                               @RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "20") int size) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(authentication.getName());
            
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
                                           Authentication authentication) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(authentication.getName());
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
                                          Authentication authentication) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(authentication.getName());
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
    
    // File upload endpoints
    @PostMapping("/upload")
    public ResponseEntity<?> createResourceWithFile(
        Authentication authentication,
        @RequestParam("file") MultipartFile file,
        @RequestParam("title") String title,
        @RequestParam(value = "description", required = false) String description,
        @RequestParam(value = "category", required = false) String categoryStr
    ) {
        try {
            log.info("Creating resource with file - Title: '{}', File: '{}'", title, file.getOriginalFilename());
            
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(authentication.getName());
            
            // Parse category
            Resource.ResourceCategory category = Resource.ResourceCategory.GENERAL;
            if (categoryStr != null && !categoryStr.trim().isEmpty()) {
                try {
                    category = Resource.ResourceCategory.valueOf(categoryStr.toUpperCase());
                } catch (IllegalArgumentException e) {
                    // Auto-suggest category based on file type
                    category = resourceService.suggestCategoryFromFileType(file.getContentType());
                    log.info("Invalid category '{}', auto-suggested '{}' based on file type", categoryStr, category);
                }
            } else {
                // Auto-suggest category based on file type
                category = resourceService.suggestCategoryFromFileType(file.getContentType());
                log.info("No category provided, auto-suggested '{}' based on file type", category);
            }
            
            Resource createdResource = resourceService.createResourceWithFile(
                currentProfile.getUserId(), 
                title, 
                description, 
                category, 
                file
            );
            
            ResourceResponse response = ResourceResponse.fromResource(createdResource);
            return ResponseEntity.ok(response);
            
        } catch (RuntimeException e) {
            log.error("Error creating resource with file: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @PutMapping("/{resourceId}/file")
    public ResponseEntity<?> updateResourceFile(
        @PathVariable UUID resourceId,
        Authentication authentication,
        @RequestParam("file") MultipartFile file
    ) {
        try {
            log.info("Updating resource file for resource: {}", resourceId);
            
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(authentication.getName());
            
            Resource updatedResource = resourceService.updateResourceFile(resourceId, currentProfile.getUserId(), file);
            
            ResourceResponse response = ResourceResponse.fromResource(updatedResource);
            return ResponseEntity.ok(response);
            
        } catch (RuntimeException e) {
            log.error("Error updating resource file: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @DeleteMapping("/{resourceId}/file")
    public ResponseEntity<?> removeResourceFile(
        @PathVariable UUID resourceId,
        Authentication authentication
    ) {
        try {
            log.info("Removing file from resource: {}", resourceId);
            
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(authentication.getName());
            
            // Get the resource
            Resource resource = resourceService.getResource(resourceId);
            
            // Check authorization (similar to update)
            if (!resource.getUploadedBy().getId().equals(currentProfile.getUserId()) && 
                !currentProfile.getRole().equals("admin") && 
                !currentProfile.getRole().equals("moderator")) {
                throw new RuntimeException("Not authorized to remove file from this resource");
            }
            
            // If no file exists, return error
            if (resource.getFileUrl() == null) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Resource has no file to remove");
                return ResponseEntity.badRequest().body(error);
            }
            
            // Create update request to remove file info
            ResourceRequest updateRequest = new ResourceRequest();
            updateRequest.setTitle(resource.getTitle());
            updateRequest.setDescription(resource.getDescription());
            updateRequest.setCategory(resource.getCategory());
            // Leave file fields null to clear them
            
            Resource resourceUpdate = convertToEntity(updateRequest);
            Resource updatedResource = resourceService.updateResource(resourceId, currentProfile.getUserId(), resourceUpdate);
            
            ResourceResponse response = ResourceResponse.fromResource(updatedResource);
            return ResponseEntity.ok(response);
            
        } catch (RuntimeException e) {
            log.error("Error removing resource file: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    // File type validation endpoint
    @PostMapping("/validate-file")
    public ResponseEntity<?> validateFile(
        @RequestParam("file") MultipartFile file
    ) {
        try {
            // Use the FileUploadService validation by attempting a dry run
            // This is a simple check without actually uploading
            
            Map<String, Object> response = new HashMap<>();
            response.put("valid", true);
            response.put("filename", file.getOriginalFilename());
            response.put("size", file.getSize());
            response.put("type", file.getContentType());
            response.put("suggestedCategory", resourceService.suggestCategoryFromFileType(file.getContentType()));
            
            // Basic validation checks
            if (file.isEmpty()) {
                response.put("valid", false);
                response.put("error", "File is empty");
            } else if (file.getSize() > 150 * 1024 * 1024) { // 150MB limit
                response.put("valid", false);
                response.put("error", "File size exceeds maximum limit of 150MB");
            }
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Error validating file: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "File validation failed: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
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
        
        // Set YouTube fields
        resource.setYoutubeUrl(request.getYoutubeUrl());
        resource.setYoutubeVideoId(request.getYoutubeVideoId());
        resource.setYoutubeTitle(request.getYoutubeTitle());
        resource.setYoutubeThumbnailUrl(request.getYoutubeThumbnailUrl());
        resource.setYoutubeDuration(request.getYoutubeDuration());
        resource.setYoutubeChannel(request.getYoutubeChannel());
        
        return resource;
    }
}