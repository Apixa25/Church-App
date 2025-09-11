package com.churchapp.controller;

import com.churchapp.dto.AnnouncementRequest;
import com.churchapp.dto.AnnouncementResponse;
import com.churchapp.dto.UserProfileResponse;
import com.churchapp.entity.Announcement;
import com.churchapp.service.AnnouncementService;
import com.churchapp.service.UserProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/announcements")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8100", "capacitor://localhost"})
public class AnnouncementController {
    
    private final AnnouncementService announcementService;
    private final UserProfileService userProfileService;
    
    @PostMapping
    public ResponseEntity<?> createAnnouncement(@AuthenticationPrincipal User user,
                                              @Valid @RequestBody AnnouncementRequest request) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            AnnouncementResponse announcement = announcementService.createAnnouncement(
                currentProfile.getUserId(), request);
            return ResponseEntity.ok(announcement);
        } catch (AccessDeniedException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Insufficient permissions: " + e.getMessage());
            return ResponseEntity.status(403).body(error);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @GetMapping("/{announcementId}")
    public ResponseEntity<?> getAnnouncement(@PathVariable UUID announcementId) {
        try {
            AnnouncementResponse announcement = announcementService.getAnnouncement(announcementId);
            return ResponseEntity.ok(announcement);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @GetMapping
    public ResponseEntity<?> getAllAnnouncements(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search) {
        
        try {
            Page<AnnouncementResponse> announcements;
            
            if (search != null && !search.trim().isEmpty()) {
                announcements = announcementService.searchAnnouncements(search.trim(), page, size);
            } else if (category != null && !category.trim().isEmpty()) {
                try {
                    Announcement.AnnouncementCategory categoryEnum = 
                        Announcement.AnnouncementCategory.valueOf(category.toUpperCase());
                    announcements = announcementService.getAnnouncementsByCategory(categoryEnum, page, size);
                } catch (IllegalArgumentException e) {
                    Map<String, String> error = new HashMap<>();
                    error.put("error", "Invalid category: " + category);
                    return ResponseEntity.badRequest().body(error);
                }
            } else {
                announcements = announcementService.getAllAnnouncements(page, size);
            }
            
            return ResponseEntity.ok(announcements);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @GetMapping("/pinned")
    public ResponseEntity<?> getPinnedAnnouncements() {
        try {
            List<AnnouncementResponse> pinnedAnnouncements = announcementService.getPinnedAnnouncements();
            return ResponseEntity.ok(pinnedAnnouncements);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @PutMapping("/{announcementId}")
    public ResponseEntity<?> updateAnnouncement(@AuthenticationPrincipal User user,
                                              @PathVariable UUID announcementId,
                                              @Valid @RequestBody AnnouncementRequest request) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            AnnouncementResponse updatedAnnouncement = announcementService.updateAnnouncement(
                announcementId, currentProfile.getUserId(), request);
            return ResponseEntity.ok(updatedAnnouncement);
        } catch (AccessDeniedException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Insufficient permissions: " + e.getMessage());
            return ResponseEntity.status(403).body(error);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @DeleteMapping("/{announcementId}")
    public ResponseEntity<?> deleteAnnouncement(@AuthenticationPrincipal User user,
                                              @PathVariable UUID announcementId) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            announcementService.deleteAnnouncement(announcementId, currentProfile.getUserId());
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "Announcement deleted successfully");
            return ResponseEntity.ok(response);
        } catch (AccessDeniedException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Insufficient permissions: " + e.getMessage());
            return ResponseEntity.status(403).body(error);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @PostMapping("/{announcementId}/pin")
    public ResponseEntity<?> pinAnnouncement(@AuthenticationPrincipal User user,
                                           @PathVariable UUID announcementId) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            AnnouncementResponse pinnedAnnouncement = announcementService.pinAnnouncement(
                announcementId, currentProfile.getUserId());
            return ResponseEntity.ok(pinnedAnnouncement);
        } catch (AccessDeniedException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Insufficient permissions: " + e.getMessage());
            return ResponseEntity.status(403).body(error);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @PostMapping("/{announcementId}/unpin")
    public ResponseEntity<?> unpinAnnouncement(@AuthenticationPrincipal User user,
                                             @PathVariable UUID announcementId) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            AnnouncementResponse unpinnedAnnouncement = announcementService.unpinAnnouncement(
                announcementId, currentProfile.getUserId());
            return ResponseEntity.ok(unpinnedAnnouncement);
        } catch (AccessDeniedException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Insufficient permissions: " + e.getMessage());
            return ResponseEntity.status(403).body(error);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    // Statistics endpoints for dashboard
    @GetMapping("/stats")
    public ResponseEntity<?> getAnnouncementStats() {
        try {
            Map<String, Object> stats = new HashMap<>();
            stats.put("totalAnnouncements", announcementService.getAnnouncementCount());
            stats.put("pinnedAnnouncements", announcementService.getPinnedAnnouncementCount());
            
            return ResponseEntity.ok(stats);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    // Feed endpoint for dashboard integration
    @GetMapping("/feed")
    public ResponseEntity<?> getAnnouncementsForFeed(@RequestParam(defaultValue = "5") int limit) {
        try {
            List<AnnouncementResponse> feedAnnouncements = announcementService.getRecentAnnouncementsForFeed(limit);
            return ResponseEntity.ok(feedAnnouncements);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}