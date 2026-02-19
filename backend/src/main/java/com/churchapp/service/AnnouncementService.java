package com.churchapp.service;

import com.churchapp.dto.AnnouncementRequest;
import com.churchapp.dto.AnnouncementResponse;
import com.churchapp.entity.Announcement;
import com.churchapp.entity.User;
import com.churchapp.repository.AnnouncementRepository;
import com.churchapp.repository.UserRepository;
import com.churchapp.repository.OrganizationRepository;
import com.churchapp.repository.UserOrganizationMembershipRepository;
import com.churchapp.entity.UserOrganizationMembership;
import com.churchapp.service.FileUploadService;
import org.springframework.web.multipart.MultipartFile;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class AnnouncementService {
    
    private final AnnouncementRepository announcementRepository;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final UserOrganizationMembershipRepository membershipRepository;
    private final FileUploadService fileUploadService;

    public AnnouncementResponse createAnnouncement(UUID userId, AnnouncementRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        // Determine organization scope
        boolean isSystemWide = request.getIsSystemWide() != null && request.getIsSystemWide();
        
        // Check if user can create system-wide announcement
        if (isSystemWide) {
            if (user.getRole() != User.Role.PLATFORM_ADMIN) {
                throw new RuntimeException("Only system administrators can create system-wide announcements");
            }
        } else {
            // Regular announcements require a primary organization
            if (user.getPrimaryOrganization() == null) {
                throw new RuntimeException("Cannot create announcement without a primary organization. Please join a church first.");
            }
        }

        Announcement announcement = new Announcement();
        announcement.setUser(user);
        // Set organization: null for system-wide, otherwise user's primary organization
        announcement.setOrganization(isSystemWide ? null : user.getPrimaryOrganization());
        announcement.setTitle(request.getTitle().trim());
        announcement.setContent(request.getContent().trim());
        announcement.setImageUrl(request.getImageUrl());
        announcement.setCategory(request.getCategory() != null ? request.getCategory() : Announcement.AnnouncementCategory.GENERAL);
        announcement.setIsPinned(request.getIsPinned() != null ? request.getIsPinned() : false);

        Announcement savedAnnouncement = announcementRepository.save(announcement);
        
        if (isSystemWide) {
            log.info("System-wide announcement created with id: {} by PLATFORM_ADMIN user: {}",
                savedAnnouncement.getId(), userId);
        } else {
            log.info("Announcement created with id: {} by user: {} in org: {}",
                savedAnnouncement.getId(), userId, user.getPrimaryOrganization().getId());
        }

        return AnnouncementResponse.fromAnnouncement(savedAnnouncement);
    }
    
    public AnnouncementResponse createAnnouncementWithImage(UUID userId, AnnouncementRequest request, MultipartFile imageFile) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        // Determine organization scope
        boolean isSystemWide = request.getIsSystemWide() != null && request.getIsSystemWide();
        
        // Check if user can create system-wide announcement
        if (isSystemWide) {
            if (user.getRole() != User.Role.PLATFORM_ADMIN) {
                throw new RuntimeException("Only system administrators can create system-wide announcements");
            }
        } else {
            // Regular announcements require a primary organization
            if (user.getPrimaryOrganization() == null) {
                throw new RuntimeException("Cannot create announcement without a primary organization. Please join a church first.");
            }
        }

        // Upload image if provided
        String imageUrl = null;
        if (imageFile != null && !imageFile.isEmpty()) {
            try {
                // Validate that it's an image
                String contentType = imageFile.getContentType();
                if (contentType == null || !contentType.startsWith("image/")) {
                    throw new RuntimeException("File must be an image");
                }

                // Upload image to S3
                imageUrl = fileUploadService.uploadFile(imageFile, "announcements");
                log.info("Image uploaded for announcement: {}", imageUrl);
            } catch (Exception e) {
                log.error("Error uploading image for announcement: {}", e.getMessage(), e);
                throw new RuntimeException("Failed to upload image: " + e.getMessage(), e);
            }
        }

        // Create announcement with image URL
        Announcement announcement = new Announcement();
        announcement.setUser(user);
        // Set organization: null for system-wide, otherwise user's primary organization
        announcement.setOrganization(isSystemWide ? null : user.getPrimaryOrganization());
        announcement.setTitle(request.getTitle().trim());
        announcement.setContent(request.getContent().trim());
        announcement.setImageUrl(imageUrl);
        announcement.setCategory(request.getCategory() != null ? request.getCategory() : Announcement.AnnouncementCategory.GENERAL);
        announcement.setIsPinned(request.getIsPinned() != null ? request.getIsPinned() : false);

        Announcement savedAnnouncement = announcementRepository.save(announcement);
        
        if (isSystemWide) {
            log.info("System-wide announcement created with image with id: {} by PLATFORM_ADMIN user: {}",
                savedAnnouncement.getId(), userId);
        } else {
            log.info("Announcement created with image with id: {} by user: {} in org: {}",
                savedAnnouncement.getId(), userId, user.getPrimaryOrganization().getId());
        }

        return AnnouncementResponse.fromAnnouncement(savedAnnouncement);
    }
    
    public AnnouncementResponse getAnnouncement(UUID announcementId) {
        Announcement announcement = announcementRepository.findById(announcementId)
            .orElseThrow(() -> new RuntimeException("Announcement not found with id: " + announcementId));
        
        if (announcement.isDeleted()) {
            throw new RuntimeException("Announcement has been deleted");
        }
        
        return AnnouncementResponse.fromAnnouncement(announcement);
    }
    
    /**
     * Get all announcements - filters based on user role and organization
     * PLATFORM_ADMIN: sees all announcements
     * Regular users: see their organization's announcements + system-wide announcements
     */
    public Page<AnnouncementResponse> getAllAnnouncements(UUID userId, int page, int size) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Pageable pageable = PageRequest.of(page, size);
        Page<Announcement> announcements;

        // PLATFORM_ADMIN sees all announcements
        if (user.getRole() == User.Role.PLATFORM_ADMIN) {
            announcements = announcementRepository.findAllActive(pageable);
        } else {
            // Regular users see their organization's announcements + system-wide (organization IS NULL)
            if (user.getPrimaryOrganization() == null) {
                // If no primary org, only show system-wide announcements
                announcements = announcementRepository.findSystemWideAnnouncements(pageable);
            } else {
                announcements = announcementRepository.findByOrganizationIdOrSystemWide(
                    user.getPrimaryOrganization().getId(), pageable);
            }
        }

        return announcements.map(AnnouncementResponse::fromAnnouncement);
    }

    /**
     * Get all announcements for user's primary organization (including system-wide)
     * This method is kept for backward compatibility but now includes system-wide announcements
     */
    public Page<AnnouncementResponse> getAnnouncementsForUser(UUID userId, int page, int size) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getPrimaryOrganization() == null) {
            // If no primary org, only show system-wide announcements
            Pageable pageable = PageRequest.of(page, size);
            Page<Announcement> announcements = announcementRepository.findSystemWideAnnouncements(pageable);
            return announcements.map(AnnouncementResponse::fromAnnouncement);
        }

        Pageable pageable = PageRequest.of(page, size);
        Page<Announcement> announcements = announcementRepository.findByOrganizationIdOrSystemWide(
            user.getPrimaryOrganization().getId(), pageable);

        return announcements.map(AnnouncementResponse::fromAnnouncement);
    }

    /**
     * Get announcements for a specific organization (for admins/analytics)
     */
    public Page<AnnouncementResponse> getAnnouncementsByOrganization(UUID organizationId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Announcement> announcements = announcementRepository.findByOrganizationId(organizationId, pageable);

        return announcements.map(AnnouncementResponse::fromAnnouncement);
    }

    /**
     * Get pinned announcements for user's primary organization (including system-wide)
     */
    public List<AnnouncementResponse> getPinnedAnnouncementsForUser(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        List<Announcement> pinnedAnnouncements;
        
        if (user.getRole() == User.Role.PLATFORM_ADMIN) {
            // PLATFORM_ADMIN sees all pinned announcements
            pinnedAnnouncements = announcementRepository.findPinnedAnnouncements();
        } else if (user.getPrimaryOrganization() == null) {
            // If no primary org, only show system-wide pinned announcements
            // We need to filter system-wide announcements where isPinned = true
            Pageable pageable = PageRequest.of(0, 100); // Get up to 100 pinned announcements
            Page<Announcement> systemWide = announcementRepository.findSystemWideAnnouncements(pageable);
            pinnedAnnouncements = systemWide.getContent().stream()
                .filter(Announcement::getIsPinned)
                .collect(Collectors.toList());
        } else {
            // Regular users see their org's pinned announcements + system-wide pinned
            pinnedAnnouncements = announcementRepository.findPinnedByOrganizationIdOrSystemWide(
                user.getPrimaryOrganization().getId());
        }

        return pinnedAnnouncements.stream()
            .map(AnnouncementResponse::fromAnnouncement)
            .collect(Collectors.toList());
    }

    /**
     * Get announcements by category - filters based on user role and organization
     */
    public Page<AnnouncementResponse> getAnnouncementsByCategory(UUID userId, Announcement.AnnouncementCategory category, int page, int size) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Pageable pageable = PageRequest.of(page, size);
        Page<Announcement> announcements;

        if (user.getRole() == User.Role.PLATFORM_ADMIN) {
            // PLATFORM_ADMIN sees all announcements by category
            announcements = announcementRepository.findByCategoryOrderByCreatedAtDesc(category, pageable);
        } else if (user.getPrimaryOrganization() == null) {
            // If no primary org, only show system-wide announcements by category
            // Note: We'll need to filter system-wide announcements by category
            Page<Announcement> systemWide = announcementRepository.findSystemWideAnnouncements(pageable);
            announcements = new org.springframework.data.domain.PageImpl<>(
                systemWide.getContent().stream()
                    .filter(a -> a.getCategory() == category)
                    .collect(Collectors.toList()),
                pageable,
                systemWide.getTotalElements()
            );
        } else {
            // Regular users see their org's announcements + system-wide by category
            announcements = announcementRepository.findByOrganizationIdOrSystemWideAndCategory(
                user.getPrimaryOrganization().getId(), category, pageable);
        }

        return announcements.map(AnnouncementResponse::fromAnnouncement);
    }

    /**
     * Get pinned announcements - for backward compatibility, returns all pinned
     * Note: This should be replaced with getPinnedAnnouncementsForUser() for proper filtering
     */
    public List<AnnouncementResponse> getPinnedAnnouncements() {
        List<Announcement> pinnedAnnouncements = announcementRepository.findPinnedAnnouncements();

        return pinnedAnnouncements.stream()
            .map(AnnouncementResponse::fromAnnouncement)
            .collect(Collectors.toList());
    }

    /**
     * Get pinned announcements for user - filters based on role and organization
     */
    public List<AnnouncementResponse> getPinnedAnnouncements(UUID userId) {
        return getPinnedAnnouncementsForUser(userId);
    }
    
    /**
     * Search announcements - filters based on user role and organization
     */
    public Page<AnnouncementResponse> searchAnnouncements(UUID userId, String searchTerm, int page, int size) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Pageable pageable = PageRequest.of(page, size);
        Page<Announcement> announcements;

        if (user.getRole() == User.Role.PLATFORM_ADMIN) {
            // PLATFORM_ADMIN searches all announcements
            announcements = announcementRepository.searchAnnouncements(searchTerm, pageable);
        } else if (user.getPrimaryOrganization() == null) {
            // If no primary org, only search system-wide announcements
            Page<Announcement> systemWide = announcementRepository.findSystemWideAnnouncements(pageable);
            String lowerSearchTerm = searchTerm.toLowerCase();
            List<Announcement> filtered = systemWide.getContent().stream()
                .filter(a -> a.getTitle().toLowerCase().contains(lowerSearchTerm) ||
                           a.getContent().toLowerCase().contains(lowerSearchTerm))
                .collect(Collectors.toList());
            announcements = new org.springframework.data.domain.PageImpl<>(
                filtered, pageable, filtered.size());
        } else {
            // Regular users search their org's announcements + system-wide
            announcements = announcementRepository.searchByOrganizationIdOrSystemWide(
                user.getPrimaryOrganization().getId(), searchTerm, pageable);
        }

        return announcements.map(AnnouncementResponse::fromAnnouncement);
    }
    
    public AnnouncementResponse updateAnnouncement(UUID announcementId, UUID userId, AnnouncementRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        Announcement announcement = announcementRepository.findById(announcementId)
            .orElseThrow(() -> new RuntimeException("Announcement not found with id: " + announcementId));
        
        if (announcement.isDeleted()) {
            throw new RuntimeException("Cannot update deleted announcement");
        }
        
        // Only the creator or admin can update
        if (!canModifyAnnouncement(user, announcement)) {
            throw new AccessDeniedException("User does not have permission to update this announcement");
        }
        
        // Update fields
        announcement.setTitle(request.getTitle().trim());
        announcement.setContent(request.getContent().trim());
        announcement.setImageUrl(request.getImageUrl());
        announcement.setCategory(request.getCategory() != null ? request.getCategory() : announcement.getCategory());
        
        // Only admins can pin/unpin announcements
        if (request.getIsPinned() != null && user.getRole() == User.Role.PLATFORM_ADMIN) {
            announcement.setIsPinned(request.getIsPinned());
        }
        
        Announcement updatedAnnouncement = announcementRepository.save(announcement);
        log.info("Announcement updated with id: {} by user: {}", announcementId, userId);
        
        return AnnouncementResponse.fromAnnouncement(updatedAnnouncement);
    }

    public AnnouncementResponse updateAnnouncementWithImage(UUID announcementId, UUID userId, AnnouncementRequest request, MultipartFile imageFile) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        Announcement announcement = announcementRepository.findById(announcementId)
            .orElseThrow(() -> new RuntimeException("Announcement not found with id: " + announcementId));

        if (announcement.isDeleted()) {
            throw new RuntimeException("Cannot update deleted announcement");
        }

        // Only the creator or admin can update
        if (!canModifyAnnouncement(user, announcement)) {
            throw new AccessDeniedException("User does not have permission to update this announcement");
        }

        // Update core fields
        announcement.setTitle(request.getTitle().trim());
        announcement.setContent(request.getContent().trim());
        announcement.setCategory(request.getCategory() != null ? request.getCategory() : announcement.getCategory());

        // Handle uploaded image file (preferred when provided)
        if (imageFile != null && !imageFile.isEmpty()) {
            try {
                String contentType = imageFile.getContentType();
                if (contentType == null || !contentType.startsWith("image/")) {
                    throw new RuntimeException("File must be an image");
                }

                String imageUrl = fileUploadService.uploadFile(imageFile, "announcements");
                announcement.setImageUrl(imageUrl);
            } catch (Exception e) {
                log.error("Error uploading image for announcement update: {}", e.getMessage(), e);
                throw new RuntimeException("Failed to upload image: " + e.getMessage(), e);
            }
        } else if (request.getImageUrl() != null) {
            // Allow explicit URL updates/removal when no file is uploaded
            String imageUrl = request.getImageUrl().trim();
            announcement.setImageUrl(imageUrl.isEmpty() ? null : imageUrl);
        }

        // Only platform admins can pin/unpin announcements
        if (request.getIsPinned() != null && user.getRole() == User.Role.PLATFORM_ADMIN) {
            announcement.setIsPinned(request.getIsPinned());
        }

        Announcement updatedAnnouncement = announcementRepository.save(announcement);
        log.info("Announcement updated with image flow with id: {} by user: {} (uploadedImage: {})",
            announcementId, userId, imageFile != null && !imageFile.isEmpty());

        return AnnouncementResponse.fromAnnouncement(updatedAnnouncement);
    }
    
    public void deleteAnnouncement(UUID announcementId, UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        Announcement announcement = announcementRepository.findById(announcementId)
            .orElseThrow(() -> new RuntimeException("Announcement not found with id: " + announcementId));
        
        if (announcement.isDeleted()) {
            throw new RuntimeException("Announcement is already deleted");
        }
        
        // Only the creator or admin can delete
        if (!canModifyAnnouncement(user, announcement)) {
            throw new AccessDeniedException("User does not have permission to delete this announcement");
        }
        
        // Soft delete
        announcement.markAsDeleted();
        announcementRepository.save(announcement);
        log.info("Announcement soft deleted with id: {} by user: {}", announcementId, userId);
    }
    
    public AnnouncementResponse pinAnnouncement(UUID announcementId, UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        // Only admins can pin announcements
        if (user.getRole() != User.Role.PLATFORM_ADMIN) {
            throw new AccessDeniedException("Only admins can pin announcements");
        }
        
        Announcement announcement = announcementRepository.findById(announcementId)
            .orElseThrow(() -> new RuntimeException("Announcement not found with id: " + announcementId));
        
        if (announcement.isDeleted()) {
            throw new RuntimeException("Cannot pin deleted announcement");
        }
        
        announcement.setIsPinned(true);
        Announcement updatedAnnouncement = announcementRepository.save(announcement);
        log.info("Announcement pinned with id: {} by admin: {}", announcementId, userId);
        
        return AnnouncementResponse.fromAnnouncement(updatedAnnouncement);
    }
    
    public AnnouncementResponse unpinAnnouncement(UUID announcementId, UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        // Only admins can unpin announcements
        if (user.getRole() != User.Role.PLATFORM_ADMIN) {
            throw new AccessDeniedException("Only admins can unpin announcements");
        }
        
        Announcement announcement = announcementRepository.findById(announcementId)
            .orElseThrow(() -> new RuntimeException("Announcement not found with id: " + announcementId));
        
        announcement.setIsPinned(false);
        Announcement updatedAnnouncement = announcementRepository.save(announcement);
        log.info("Announcement unpinned with id: {} by admin: {}", announcementId, userId);
        
        return AnnouncementResponse.fromAnnouncement(updatedAnnouncement);
    }
    
    // Dashboard service methods
    public List<AnnouncementResponse> getRecentAnnouncementsForFeed(int limit) {
        LocalDateTime weekAgo = LocalDateTime.now().minusDays(7);
        Pageable pageable = PageRequest.of(0, limit);
        List<Announcement> recentAnnouncements = announcementRepository.findRecentAnnouncementsForFeed(weekAgo, pageable);
        
        return recentAnnouncements.stream()
            .map(AnnouncementResponse::fromAnnouncement)
            .collect(Collectors.toList());
    }
    
    public long getAnnouncementCount() {
        return announcementRepository.countActiveAnnouncements();
    }
    
    public long getPinnedAnnouncementCount() {
        return announcementRepository.countPinnedAnnouncements();
    }
    
    /**
     * Get announcement count for a specific organization
     */
    public long getAnnouncementCountByOrganization(UUID organizationId) {
        Long count = announcementRepository.countByOrganizationId(organizationId);
        return count != null ? count : 0L;
    }
    
    /**
     * Get pinned announcement count for a specific organization
     */
    public long getPinnedAnnouncementCountByOrganization(UUID organizationId) {
        List<Announcement> pinned = announcementRepository.findPinnedByOrganizationId(organizationId);
        return pinned.size();
    }
    
    // Helper methods
    private boolean canModifyAnnouncement(User user, Announcement announcement) {
        // Platform admin can always modify (including system-wide announcements)
        if (user.getRole() == User.Role.PLATFORM_ADMIN) {
            return true;
        }
        
        // Creator can always modify their own announcements
        if (announcement.getUser().getId().equals(user.getId())) {
            return true;
        }
        
        // For system-wide announcements (organization IS NULL), only PLATFORM_ADMIN can modify
        if (announcement.getOrganization() == null) {
            return false;
        }
        
        // ORG_ADMIN can modify any announcement in their organization
        return membershipRepository
            .findByUserIdAndOrganizationId(user.getId(), announcement.getOrganization().getId())
            .map(membership -> membership.getRole() == UserOrganizationMembership.OrgRole.ORG_ADMIN)
            .orElse(false);
    }
}