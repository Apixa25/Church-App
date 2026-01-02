package com.churchapp.service;

import com.churchapp.entity.Resource;
import com.churchapp.entity.User;
import com.churchapp.entity.UserOrganizationMembership;
import com.churchapp.repository.ResourceRepository;
import com.churchapp.repository.UserRepository;
import com.churchapp.repository.UserOrganizationMembershipRepository;
import com.churchapp.service.AdminAuthorizationService;
import com.churchapp.util.YouTubeUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class ResourceService {
    
    private final ResourceRepository resourceRepository;
    private final UserRepository userRepository;
    private final FileUploadService fileUploadService;
    private final AdminAuthorizationService adminAuthorizationService;
    private final UserOrganizationMembershipRepository membershipRepository;
    
    public Resource createResource(UUID uploaderId, Resource resourceRequest) {
        User uploader = userRepository.findById(uploaderId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + uploaderId));
        
        log.info("Creating resource - Title: '{}', Category: '{}', File: '{}', YouTube: '{}'", 
                resourceRequest.getTitle(), resourceRequest.getCategory(), 
                resourceRequest.getFileName(), resourceRequest.getYoutubeUrl());
        
        // Validate YouTube URL if provided
        if (resourceRequest.getYoutubeUrl() != null && !resourceRequest.getYoutubeUrl().trim().isEmpty()) {
            if (!YouTubeUtil.isValidYouTubeUrl(resourceRequest.getYoutubeUrl())) {
                throw new RuntimeException("Invalid YouTube URL provided");
            }
        }
        
        Resource resource = new Resource();
        resource.setTitle(resourceRequest.getTitle().trim());
        resource.setDescription(resourceRequest.getDescription() != null ? resourceRequest.getDescription().trim() : null);
        resource.setCategory(resourceRequest.getCategory() != null ? resourceRequest.getCategory() : Resource.ResourceCategory.GENERAL);
        resource.setUploadedBy(uploader);
        resource.setFileName(resourceRequest.getFileName());
        resource.setFileUrl(resourceRequest.getFileUrl());
        resource.setFileSize(resourceRequest.getFileSize());
        resource.setFileType(resourceRequest.getFileType());
        resource.setDownloadCount(0);
        
        // Handle YouTube video fields
        if (resourceRequest.getYoutubeUrl() != null && !resourceRequest.getYoutubeUrl().trim().isEmpty()) {
            log.info("Processing YouTube URL: {}", resourceRequest.getYoutubeUrl());
            String videoId = YouTubeUtil.extractVideoId(resourceRequest.getYoutubeUrl());
            log.info("Extracted video ID: {}", videoId);
            if (videoId != null) {
                resource.setYoutubeUrl(YouTubeUtil.generateWatchUrl(videoId));
                resource.setYoutubeVideoId(videoId);
                resource.setYoutubeThumbnailUrl(YouTubeUtil.generateThumbnailUrl(videoId));
                
                // Set YouTube metadata if provided
                resource.setYoutubeTitle(resourceRequest.getYoutubeTitle());
                resource.setYoutubeDuration(resourceRequest.getYoutubeDuration());
                resource.setYoutubeChannel(resourceRequest.getYoutubeChannel());
                
                // Set file type to indicate this is a YouTube video
                resource.setFileType("video/youtube");
                log.info("Set YouTube fields - URL: {}, VideoId: {}, Title: {}", 
                        resource.getYoutubeUrl(), resource.getYoutubeVideoId(), resource.getYoutubeTitle());
            }
        } else {
            log.info("No YouTube URL provided in request");
        }
        
        // Auto-approve all resources (approval process disabled but code kept for future use)
        resource.setIsApproved(true);
        
        Resource savedResource = resourceRepository.save(resource);
        log.info("Resource created with id: {} by user: {} (auto-approved: true, YouTube: {})", 
                savedResource.getId(), uploaderId, 
                savedResource.getYoutubeVideoId() != null ? "Yes" : "No");
        
        return savedResource;
    }
    
    public Resource getResource(UUID resourceId) {
        return resourceRepository.findById(resourceId)
            .orElseThrow(() -> new RuntimeException("Resource not found with id: " + resourceId));
    }
    
    public Resource getApprovedResource(UUID resourceId) {
        Resource resource = resourceRepository.findById(resourceId)
            .orElseThrow(() -> new RuntimeException("Resource not found with id: " + resourceId));
        
        if (!resource.getIsApproved()) {
            throw new RuntimeException("Resource is not approved for viewing");
        }
        
        return resource;
    }
    
    public Resource updateResource(UUID resourceId, UUID userId, Resource resourceUpdate) {
        Resource existingResource = resourceRepository.findById(resourceId)
            .orElseThrow(() -> new RuntimeException("Resource not found with id: " + resourceId));
        
        // Check if user is the uploader or has admin/moderator role
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        if (!existingResource.getUploadedBy().getId().equals(userId) && 
            user.getRole() != User.Role.PLATFORM_ADMIN && 
            user.getRole() != User.Role.MODERATOR) {
            throw new RuntimeException("Not authorized to update this resource");
        }
        
        // Update fields
        if (resourceUpdate.getTitle() != null) {
            existingResource.setTitle(resourceUpdate.getTitle().trim());
        }
        if (resourceUpdate.getDescription() != null) {
            existingResource.setDescription(resourceUpdate.getDescription().trim());
        }
        if (resourceUpdate.getCategory() != null) {
            existingResource.setCategory(resourceUpdate.getCategory());
        }
        
        // If content is updated, require re-approval unless done by admin/moderator
        if (resourceUpdate.getTitle() != null || resourceUpdate.getDescription() != null) {
            boolean isAdminOrMod = (user.getRole() == User.Role.PLATFORM_ADMIN || 
                                   user.getRole() == User.Role.MODERATOR);
            if (!isAdminOrMod) {
                existingResource.setIsApproved(false);
                log.info("Resource {} requires re-approval after update by non-admin user", resourceId);
            }
        }
        
        Resource updatedResource = resourceRepository.save(existingResource);
        log.info("Resource updated with id: {} by user: {}", resourceId, userId);
        
        return updatedResource;
    }
    
    public void deleteResource(UUID resourceId, UUID userId) {
        Resource resource = resourceRepository.findById(resourceId)
            .orElseThrow(() -> new RuntimeException("Resource not found with id: " + resourceId));
        
        // Check if user is the uploader or has admin role
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        User uploader = resource.getUploadedBy();
        
        log.info("Delete authorization check - Resource: {} | Uploader: {} | Current User: {} | User Role: {}", 
                resourceId, uploader.getId(), userId, user.getRole());
        
        boolean isUploader = uploader.getId().equals(userId);
        boolean isPlatformAdmin = adminAuthorizationService.isPlatformAdmin(user);
        
        // Check if user is an organization admin of any organization that the uploader belongs to
        boolean isOrgAdmin = false;
        if (!isPlatformAdmin) {
            List<UserOrganizationMembership> uploaderMemberships = membershipRepository.findByUserId(uploader.getId());
            List<UserOrganizationMembership> userMemberships = membershipRepository.findByUserId(userId);
            
            // Check if user is ORG_ADMIN of any organization that the uploader is a member of
            for (UserOrganizationMembership userMembership : userMemberships) {
                if (userMembership.getRole() == UserOrganizationMembership.OrgRole.ORG_ADMIN) {
                    UUID userOrgId = userMembership.getOrganization().getId();
                    // Check if uploader is also a member of this organization
                    boolean uploaderInSameOrg = uploaderMemberships.stream()
                        .anyMatch(m -> m.getOrganization().getId().equals(userOrgId));
                    if (uploaderInSameOrg) {
                        isOrgAdmin = true;
                        log.info("User {} is ORG_ADMIN of organization {} where uploader {} is a member", 
                                userId, userOrgId, uploader.getId());
                        break;
                    }
                }
            }
        }
        
        log.info("Authorization result - Is Uploader: {} | Is Platform Admin: {} | Is Org Admin: {} | Can Delete: {}", 
                isUploader, isPlatformAdmin, isOrgAdmin, (isUploader || isPlatformAdmin || isOrgAdmin));
        
        if (!isUploader && !isPlatformAdmin && !isOrgAdmin) {
            throw new RuntimeException("Not authorized to delete this resource. Only the uploader, platform administrators, or organization administrators can delete resources.");
        }
        
        // Delete file from S3 if it exists
        if (resource.getFileUrl() != null) {
            try {
                fileUploadService.deleteFile(resource.getFileUrl());
                log.info("Deleted file from S3: {}", resource.getFileUrl());
            } catch (Exception e) {
                log.warn("Failed to delete file from S3, continuing with resource deletion: {}", e.getMessage());
            }
        }
        
        resourceRepository.delete(resource);
        log.info("Resource deleted with id: {} by user: {}", resourceId, userId);
    }
    
    // Admin moderation methods
    public Resource approveResource(UUID resourceId, UUID adminId) {
        return moderateResource(resourceId, adminId, true);
    }
    
    public Resource rejectResource(UUID resourceId, UUID adminId) {
        return moderateResource(resourceId, adminId, false);
    }
    
    private Resource moderateResource(UUID resourceId, UUID adminId, boolean approved) {
        User admin = userRepository.findById(adminId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + adminId));
        
        if (admin.getRole() != User.Role.PLATFORM_ADMIN && admin.getRole() != User.Role.MODERATOR) {
            throw new RuntimeException("Not authorized to moderate resources. Admin or moderator role required.");
        }
        
        Resource resource = resourceRepository.findById(resourceId)
            .orElseThrow(() -> new RuntimeException("Resource not found with id: " + resourceId));
        
        resource.setIsApproved(approved);
        Resource moderatedResource = resourceRepository.save(resource);
        
        log.info("Resource {} {} by admin: {}", resourceId, approved ? "approved" : "rejected", adminId);
        return moderatedResource;
    }
    
    // Download tracking
    public void incrementDownloadCount(UUID resourceId) {
        Resource resource = resourceRepository.findById(resourceId)
            .orElseThrow(() -> new RuntimeException("Resource not found with id: " + resourceId));
        
        if (!resource.getIsApproved()) {
            throw new RuntimeException("Cannot download unapproved resource");
        }
        
        resource.setDownloadCount(resource.getDownloadCount() + 1);
        resourceRepository.save(resource);
        
        log.info("Download count incremented for resource: {} (new count: {})", resourceId, resource.getDownloadCount());
    }

    // Share tracking
    public void incrementShareCount(UUID resourceId) {
        Resource resource = resourceRepository.findById(resourceId)
            .orElseThrow(() -> new RuntimeException("Resource not found with id: " + resourceId));

        if (!resource.getIsApproved()) {
            throw new RuntimeException("Cannot share unapproved resource");
        }

        resource.setShareCount(resource.getShareCount() + 1);
        resourceRepository.save(resource);

        log.info("Share count incremented for resource: {} (new count: {})", resourceId, resource.getShareCount());
    }

    // Query methods for public access (approved resources only)
    public Page<Resource> getApprovedResources(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return resourceRepository.findApprovedResources(pageable);
    }
    
    public Page<Resource> getResourcesByCategory(Resource.ResourceCategory category, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return resourceRepository.findByCategoryAndIsApprovedOrderByCreatedAtDesc(category, true, pageable);
    }
    
    public Page<Resource> searchApprovedResources(String searchTerm, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return resourceRepository.searchApprovedResources(searchTerm, pageable);
    }
    
    public Page<Resource> getResourcesByFileType(String fileType, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return resourceRepository.findByFileTypeApproved(fileType, pageable);
    }
    
    public Page<Resource> getResourcesWithFiles(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return resourceRepository.findResourcesWithFiles(pageable);
    }
    
    public Page<Resource> getTextOnlyResources(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return resourceRepository.findTextOnlyResources(pageable);
    }
    
    // User-specific methods
    public Page<Resource> getUserResources(UUID userId, int page, int size) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        Pageable pageable = PageRequest.of(page, size);
        return resourceRepository.findByUploadedBy(user, pageable);
    }
    
    public Page<Resource> getUserResourcesByStatus(UUID userId, boolean approved, int page, int size) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        Pageable pageable = PageRequest.of(page, size);
        return resourceRepository.findByUploadedByAndIsApprovedOrderByCreatedAtDesc(user, approved, pageable);
    }
    
    // Admin query methods (can see all resources)
    public Page<Resource> getAllResources(UUID adminId, int page, int size) {
        User admin = userRepository.findById(adminId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + adminId));
        
        if (admin.getRole() != User.Role.PLATFORM_ADMIN && admin.getRole() != User.Role.MODERATOR) {
            throw new RuntimeException("Not authorized to view all resources. Admin or moderator role required.");
        }
        
        Pageable pageable = PageRequest.of(page, size);
        return resourceRepository.findAll(pageable);
    }
    
    public Page<Resource> searchAllResources(UUID adminId, String searchTerm, int page, int size) {
        User admin = userRepository.findById(adminId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + adminId));
        
        if (admin.getRole() != User.Role.PLATFORM_ADMIN && admin.getRole() != User.Role.MODERATOR) {
            throw new RuntimeException("Not authorized to search all resources. Admin or moderator role required.");
        }
        
        Pageable pageable = PageRequest.of(page, size);
        return resourceRepository.searchAllResources(searchTerm, pageable);
    }
    
    public Page<Resource> getResourcesPendingApproval(UUID adminId, int page, int size) {
        User admin = userRepository.findById(adminId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + adminId));
        
        if (admin.getRole() != User.Role.PLATFORM_ADMIN && admin.getRole() != User.Role.MODERATOR) {
            throw new RuntimeException("Not authorized to view pending resources. Admin or moderator role required.");
        }
        
        Pageable pageable = PageRequest.of(page, size);
        return resourceRepository.findResourcesPendingApproval(pageable);
    }
    
    // Dashboard/Feed methods
    public List<Resource> getRecentApprovedResourcesForFeed(int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        return resourceRepository.findRecentApprovedResourcesForFeed(pageable);
    }
    
    public List<Resource> getMostDownloadedResources(int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        return resourceRepository.findMostDownloadedResources(pageable);
    }
    
    // Statistics
    public long countResourcesByCategory(Resource.ResourceCategory category) {
        return resourceRepository.countByCategoryAndIsApproved(category, true);
    }
    
    public long countApprovedResources() {
        return resourceRepository.countByIsApproved(true);
    }
    
    public long countPendingResources() {
        return resourceRepository.countByIsApproved(false);
    }
    
    public long countRecentResources(int daysBack) {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(daysBack);
        return resourceRepository.countByCreatedAtAfter(cutoff);
    }
    
    public long countUserResources(UUID userId) {
        return resourceRepository.findByUploadedByIdOrderByCreatedAtDesc(userId).size();
    }
    
    // File upload methods
    public Resource createResourceWithFile(UUID uploaderId, String title, String description, 
                                         Resource.ResourceCategory category, MultipartFile file) {
        User uploader = userRepository.findById(uploaderId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + uploaderId));
        
        log.info("Creating resource with file - Title: '{}', Category: '{}', File: '{}'", 
                title, category, file.getOriginalFilename());
        
        try {
            // Upload file to S3
            String fileUrl = fileUploadService.uploadFile(file, "resources");
            
            // Create resource entity
            Resource resource = new Resource();
            resource.setTitle(title.trim());
            resource.setDescription(description != null ? description.trim() : null);
            resource.setCategory(category != null ? category : Resource.ResourceCategory.GENERAL);
            resource.setUploadedBy(uploader);
            resource.setFileName(file.getOriginalFilename());
            resource.setFileUrl(fileUrl);
            resource.setFileSize(file.getSize());
            resource.setFileType(file.getContentType());
            resource.setDownloadCount(0);
            
            // Auto-approve all resources (approval process disabled but code kept for future use)
            resource.setIsApproved(true);
            
            Resource savedResource = resourceRepository.save(resource);
            log.info("Resource with file created with id: {} by user: {} (auto-approved: true)", 
                    savedResource.getId(), uploaderId);
            
            return savedResource;
            
        } catch (Exception e) {
            log.error("Error creating resource with file: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create resource with file: " + e.getMessage(), e);
        }
    }
    
    public Resource updateResourceFile(UUID resourceId, UUID userId, MultipartFile file) {
        Resource existingResource = resourceRepository.findById(resourceId)
            .orElseThrow(() -> new RuntimeException("Resource not found with id: " + resourceId));
        
        // Check if user is the uploader or has admin/moderator role
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        if (!existingResource.getUploadedBy().getId().equals(userId) && 
            user.getRole() != User.Role.PLATFORM_ADMIN && 
            user.getRole() != User.Role.MODERATOR) {
            throw new RuntimeException("Not authorized to update this resource file");
        }
        
        log.info("Updating resource file for resource: {} by user: {}", resourceId, userId);
        
        try {
            // Delete old file if it exists
            if (existingResource.getFileUrl() != null) {
                try {
                    fileUploadService.deleteFile(existingResource.getFileUrl());
                    log.info("Deleted old file: {}", existingResource.getFileUrl());
                } catch (Exception e) {
                    log.warn("Failed to delete old file, continuing with upload: {}", e.getMessage());
                }
            }
            
            // Upload new file to S3
            String fileUrl = fileUploadService.uploadFile(file, "resources");
            
            // Update resource file information
            existingResource.setFileName(file.getOriginalFilename());
            existingResource.setFileUrl(fileUrl);
            existingResource.setFileSize(file.getSize());
            existingResource.setFileType(file.getContentType());
            
            // Reset download count for updated file
            existingResource.setDownloadCount(0);
            
            // If file is updated, require re-approval unless done by admin/moderator
            boolean isAdminOrMod = (user.getRole() == User.Role.PLATFORM_ADMIN || 
                                   user.getRole() == User.Role.MODERATOR);
            if (!isAdminOrMod) {
                existingResource.setIsApproved(false);
                log.info("Resource {} requires re-approval after file update by non-admin user", resourceId);
            }
            
            Resource updatedResource = resourceRepository.save(existingResource);
            log.info("Resource file updated for id: {} by user: {}", resourceId, userId);
            
            return updatedResource;
            
        } catch (Exception e) {
            log.error("Error updating resource file: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to update resource file: " + e.getMessage(), e);
        }
    }
    
    
    // Helper method to determine file category based on content type
    public Resource.ResourceCategory suggestCategoryFromFileType(String contentType) {
        if (contentType == null) {
            return Resource.ResourceCategory.GENERAL;
        }
        
        if (contentType.startsWith("image/")) {
            return Resource.ResourceCategory.IMAGES;
        } else if (contentType.startsWith("video/")) {
            return Resource.ResourceCategory.VIDEO;
        } else if (contentType.startsWith("audio/")) {
            return Resource.ResourceCategory.AUDIO;
        } else if (contentType.equals("application/pdf") || 
                   contentType.equals("application/msword") ||
                   contentType.equals("application/vnd.openxmlformats-officedocument.wordprocessingml.document") ||
                   contentType.equals("text/plain")) {
            return Resource.ResourceCategory.DOCUMENTS;
        }
        
        return Resource.ResourceCategory.GENERAL;
    }
}