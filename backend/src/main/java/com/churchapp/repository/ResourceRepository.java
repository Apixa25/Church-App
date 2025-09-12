package com.churchapp.repository;

import com.churchapp.entity.Resource;
import com.churchapp.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface ResourceRepository extends JpaRepository<Resource, UUID> {
    
    // Find by uploader
    Page<Resource> findByUploadedBy(User uploadedBy, Pageable pageable);
    
    List<Resource> findByUploadedByIdOrderByCreatedAtDesc(UUID uploadedById);
    
    // Find by category
    Page<Resource> findByCategoryOrderByCreatedAtDesc(Resource.ResourceCategory category, Pageable pageable);
    
    // Find by approval status
    Page<Resource> findByIsApprovedOrderByCreatedAtDesc(Boolean isApproved, Pageable pageable);
    
    // Find approved resources only
    @Query("SELECT r FROM Resource r WHERE r.isApproved = true ORDER BY r.createdAt DESC")
    Page<Resource> findApprovedResources(Pageable pageable);
    
    // Find by category and approval status
    Page<Resource> findByCategoryAndIsApprovedOrderByCreatedAtDesc(
        Resource.ResourceCategory category, 
        Boolean isApproved, 
        Pageable pageable
    );
    
    // Search resources by title or description (approved only)
    @Query("SELECT r FROM Resource r WHERE r.isApproved = true AND (" +
           "LOWER(r.title) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(r.description) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(r.fileName) LIKE LOWER(CONCAT('%', :searchTerm, '%'))" +
           ") ORDER BY r.createdAt DESC")
    Page<Resource> searchApprovedResources(@Param("searchTerm") String searchTerm, Pageable pageable);
    
    // Search all resources (for admin)
    @Query("SELECT r FROM Resource r WHERE " +
           "LOWER(r.title) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(r.description) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(r.fileName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
           "ORDER BY r.createdAt DESC")
    Page<Resource> searchAllResources(@Param("searchTerm") String searchTerm, Pageable pageable);
    
    // Count by category
    long countByCategory(Resource.ResourceCategory category);
    
    // Count by approval status
    long countByIsApproved(Boolean isApproved);
    
    // Count approved resources by category
    long countByCategoryAndIsApproved(Resource.ResourceCategory category, Boolean isApproved);
    
    // Dashboard-specific queries for recent resources
    List<Resource> findByCreatedAtAfterOrderByCreatedAtDesc(LocalDateTime createdAfter, Pageable pageable);
    
    // Recent approved resources for feed
    @Query("SELECT r FROM Resource r WHERE r.isApproved = true ORDER BY r.createdAt DESC")
    List<Resource> findRecentApprovedResourcesForFeed(Pageable pageable);
    
    // Resources pending approval (admin view)
    @Query("SELECT r FROM Resource r WHERE r.isApproved = false ORDER BY r.createdAt ASC")
    List<Resource> findResourcesPendingApproval();
    
    @Query("SELECT r FROM Resource r WHERE r.isApproved = false ORDER BY r.createdAt ASC")
    Page<Resource> findResourcesPendingApproval(Pageable pageable);
    
    // Most downloaded resources
    @Query("SELECT r FROM Resource r WHERE r.isApproved = true ORDER BY r.downloadCount DESC, r.createdAt DESC")
    List<Resource> findMostDownloadedResources(Pageable pageable);
    
    // Find resources by file type (approved only)
    @Query("SELECT r FROM Resource r WHERE r.isApproved = true AND LOWER(r.fileType) LIKE LOWER(CONCAT('%', :fileType, '%')) ORDER BY r.createdAt DESC")
    Page<Resource> findByFileTypeApproved(@Param("fileType") String fileType, Pageable pageable);
    
    // Count resources created after a certain date
    long countByCreatedAtAfter(LocalDateTime createdAfter);
    
    // Find resources uploaded by user and approval status
    Page<Resource> findByUploadedByAndIsApprovedOrderByCreatedAtDesc(
        User uploadedBy, 
        Boolean isApproved, 
        Pageable pageable
    );
    
    // Find resources with file URLs (uploaded files)
    @Query("SELECT r FROM Resource r WHERE r.fileUrl IS NOT NULL AND r.isApproved = true ORDER BY r.createdAt DESC")
    Page<Resource> findResourcesWithFiles(Pageable pageable);
    
    // Find text-only resources (no file URL)
    @Query("SELECT r FROM Resource r WHERE r.fileUrl IS NULL AND r.isApproved = true ORDER BY r.createdAt DESC")
    Page<Resource> findTextOnlyResources(Pageable pageable);
}