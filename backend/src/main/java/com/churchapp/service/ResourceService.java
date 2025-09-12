package com.churchapp.service;

import com.churchapp.entity.Resource;
import com.churchapp.entity.User;
import com.churchapp.repository.ResourceRepository;
import com.churchapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    
    public Resource createResource(UUID uploaderId, Resource resourceRequest) {
        User uploader = userRepository.findById(uploaderId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + uploaderId));
        
        log.info("Creating resource - Title: '{}', Category: '{}', File: '{}'", 
                resourceRequest.getTitle(), resourceRequest.getCategory(), resourceRequest.getFileName());
        
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
        
        // Auto-approve if uploaded by admin/moderator, otherwise require approval
        boolean autoApprove = (uploader.getRole() == User.UserRole.ADMIN || 
                              uploader.getRole() == User.UserRole.MODERATOR);
        resource.setIsApproved(autoApprove);
        
        Resource savedResource = resourceRepository.save(resource);
        log.info("Resource created with id: {} by user: {} (auto-approved: {})", 
                savedResource.getId(), uploaderId, autoApprove);
        
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
            user.getRole() != User.UserRole.ADMIN && 
            user.getRole() != User.UserRole.MODERATOR) {
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
            boolean isAdminOrMod = (user.getRole() == User.UserRole.ADMIN || 
                                   user.getRole() == User.UserRole.MODERATOR);
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
        
        log.info("Delete authorization check - Resource: {} | Uploader: {} | Current User: {} | User Role: {}", 
                resourceId, resource.getUploadedBy().getId(), userId, user.getRole());
        
        boolean isUploader = resource.getUploadedBy().getId().equals(userId);
        boolean isAdmin = user.getRole() == User.UserRole.ADMIN;
        
        log.info("Authorization result - Is Uploader: {} | Is Admin: {} | Can Delete: {}", 
                isUploader, isAdmin, (isUploader || isAdmin));
        
        if (!isUploader && !isAdmin) {
            throw new RuntimeException("Not authorized to delete this resource. Only the uploader or administrators can delete resources.");
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
        
        if (admin.getRole() != User.UserRole.ADMIN && admin.getRole() != User.UserRole.MODERATOR) {
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
        
        if (admin.getRole() != User.UserRole.ADMIN && admin.getRole() != User.UserRole.MODERATOR) {
            throw new RuntimeException("Not authorized to view all resources. Admin or moderator role required.");
        }
        
        Pageable pageable = PageRequest.of(page, size);
        return resourceRepository.findAll(pageable);
    }
    
    public Page<Resource> searchAllResources(UUID adminId, String searchTerm, int page, int size) {
        User admin = userRepository.findById(adminId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + adminId));
        
        if (admin.getRole() != User.UserRole.ADMIN && admin.getRole() != User.UserRole.MODERATOR) {
            throw new RuntimeException("Not authorized to search all resources. Admin or moderator role required.");
        }
        
        Pageable pageable = PageRequest.of(page, size);
        return resourceRepository.searchAllResources(searchTerm, pageable);
    }
    
    public Page<Resource> getResourcesPendingApproval(UUID adminId, int page, int size) {
        User admin = userRepository.findById(adminId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + adminId));
        
        if (admin.getRole() != User.UserRole.ADMIN && admin.getRole() != User.UserRole.MODERATOR) {
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
}