package com.churchapp.service;

import com.churchapp.dto.AnnouncementRequest;
import com.churchapp.dto.AnnouncementResponse;
import com.churchapp.entity.Announcement;
import com.churchapp.entity.User;
import com.churchapp.repository.AnnouncementRepository;
import com.churchapp.repository.UserRepository;
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
    
    public AnnouncementResponse createAnnouncement(UUID userId, AnnouncementRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        // Only admin and moderator can create announcements
        if (!isAuthorizedToManageAnnouncements(user)) {
            throw new AccessDeniedException("User does not have permission to create announcements");
        }
        
        Announcement announcement = new Announcement();
        announcement.setUser(user);
        announcement.setTitle(request.getTitle().trim());
        announcement.setContent(request.getContent().trim());
        announcement.setImageUrl(request.getImageUrl());
        announcement.setCategory(request.getCategory() != null ? request.getCategory() : Announcement.AnnouncementCategory.GENERAL);
        announcement.setIsPinned(request.getIsPinned() != null ? request.getIsPinned() : false);
        
        Announcement savedAnnouncement = announcementRepository.save(announcement);
        log.info("Announcement created with id: {} by user: {}", savedAnnouncement.getId(), userId);
        
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
    
    public Page<AnnouncementResponse> getAllAnnouncements(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Announcement> announcements = announcementRepository.findAllActive(pageable);
        
        return announcements.map(AnnouncementResponse::fromAnnouncement);
    }
    
    public Page<AnnouncementResponse> getAnnouncementsByCategory(Announcement.AnnouncementCategory category, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Announcement> announcements = announcementRepository.findByCategoryOrderByCreatedAtDesc(category, pageable);
        
        return announcements.map(AnnouncementResponse::fromAnnouncement);
    }
    
    public List<AnnouncementResponse> getPinnedAnnouncements() {
        List<Announcement> pinnedAnnouncements = announcementRepository.findPinnedAnnouncements();
        
        return pinnedAnnouncements.stream()
            .map(AnnouncementResponse::fromAnnouncement)
            .collect(Collectors.toList());
    }
    
    public Page<AnnouncementResponse> searchAnnouncements(String searchTerm, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Announcement> announcements = announcementRepository.searchAnnouncements(searchTerm, pageable);
        
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
        if (request.getIsPinned() != null && user.getRole() == User.Role.ADMIN) {
            announcement.setIsPinned(request.getIsPinned());
        }
        
        Announcement updatedAnnouncement = announcementRepository.save(announcement);
        log.info("Announcement updated with id: {} by user: {}", announcementId, userId);
        
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
        if (user.getRole() != User.Role.ADMIN) {
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
        if (user.getRole() != User.Role.ADMIN) {
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
    
    // Helper methods
    private boolean isAuthorizedToManageAnnouncements(User user) {
        return user.getRole() == User.Role.ADMIN || user.getRole() == User.Role.MODERATOR;
    }
    
    private boolean canModifyAnnouncement(User user, Announcement announcement) {
        return user.getRole() == User.Role.ADMIN || 
               announcement.getUser().getId().equals(user.getId());
    }
}