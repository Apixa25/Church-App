package com.churchapp.service;

import com.churchapp.dto.PrayerNotificationEvent;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import com.churchapp.dto.PrayerRequestRequest;
import com.churchapp.dto.PrayerRequestUpdateRequest;
import com.churchapp.dto.PrayerRequestResponse;
import com.churchapp.entity.PrayerRequest;
import com.churchapp.entity.User;
import com.churchapp.repository.PrayerRequestRepository;
import com.churchapp.repository.PrayerInteractionRepository;
import com.churchapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
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
public class PrayerRequestService {
    
    private final PrayerRequestRepository prayerRequestRepository;
    private final UserRepository userRepository;
    private final PrayerInteractionRepository prayerInteractionRepository;
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    public PrayerRequestResponse createPrayerRequest(UUID userId, PrayerRequestRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        PrayerRequest prayerRequest = new PrayerRequest();
        prayerRequest.setUser(user);
        prayerRequest.setTitle(request.getTitle().trim());
        prayerRequest.setDescription(request.getDescription() != null ? request.getDescription().trim() : null);
        prayerRequest.setIsAnonymous(request.getIsAnonymous() != null ? request.getIsAnonymous() : false);
        prayerRequest.setCategory(request.getCategory() != null ? request.getCategory() : PrayerRequest.PrayerCategory.GENERAL);
        prayerRequest.setStatus(PrayerRequest.PrayerStatus.ACTIVE); // Always start as active
        
        PrayerRequest savedPrayerRequest = prayerRequestRepository.save(prayerRequest);
        log.info("Prayer request created with id: {} by user: {}", savedPrayerRequest.getId(), userId);
        
        // Send WebSocket notification for new prayer request
        notifyNewPrayerRequest(savedPrayerRequest);
        
        return PrayerRequestResponse.fromPrayerRequestForOwner(savedPrayerRequest);
    }
    
    public PrayerRequestResponse getPrayerRequest(UUID prayerRequestId, UUID requestingUserId) {
        PrayerRequest prayerRequest = prayerRequestRepository.findById(prayerRequestId)
            .orElseThrow(() -> new RuntimeException("Prayer request not found with id: " + prayerRequestId));
        
        // If the requesting user is the owner, show full details
        if (prayerRequest.getUser().getId().equals(requestingUserId)) {
            return PrayerRequestResponse.fromPrayerRequestForOwner(prayerRequest);
        }
        
        // Otherwise, respect anonymity settings
        return PrayerRequestResponse.fromPrayerRequest(prayerRequest);
    }
    
    public PrayerRequestResponse updatePrayerRequest(UUID prayerRequestId, UUID userId, PrayerRequestUpdateRequest request) {
        PrayerRequest prayerRequest = prayerRequestRepository.findById(prayerRequestId)
            .orElseThrow(() -> new RuntimeException("Prayer request not found with id: " + prayerRequestId));
        
        // Only the owner can update their prayer request
        if (!prayerRequest.getUser().getId().equals(userId)) {
            throw new RuntimeException("You can only update your own prayer requests");
        }
        
        // Update fields
        if (request.getTitle() != null && !request.getTitle().trim().isEmpty()) {
            prayerRequest.setTitle(request.getTitle().trim());
        }
        
        if (request.getDescription() != null) {
            prayerRequest.setDescription(request.getDescription().trim().isEmpty() ? null : request.getDescription().trim());
        }
        
        if (request.getIsAnonymous() != null) {
            prayerRequest.setIsAnonymous(request.getIsAnonymous());
        }
        
        if (request.getCategory() != null) {
            prayerRequest.setCategory(request.getCategory());
        }
        
        if (request.getStatus() != null) {
            prayerRequest.setStatus(request.getStatus());
        }
        
        PrayerRequest updatedPrayerRequest = prayerRequestRepository.save(prayerRequest);
        log.info("Prayer request updated: {} by user: {}", prayerRequestId, userId);
        
        // Send WebSocket notification for prayer update
        notifyPrayerRequestUpdate(updatedPrayerRequest);
        
        return PrayerRequestResponse.fromPrayerRequestForOwner(updatedPrayerRequest);
    }
    
    public void deletePrayerRequest(UUID prayerRequestId, UUID userId) {
        PrayerRequest prayerRequest = prayerRequestRepository.findById(prayerRequestId)
            .orElseThrow(() -> new RuntimeException("Prayer request not found with id: " + prayerRequestId));
        
        // Get the user making the request
        User requestingUser = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        // Allow deletion if user is the owner OR if user is an admin/moderator
        boolean isOwner = prayerRequest.getUser().getId().equals(userId);
        boolean isAdmin = requestingUser.getRole() == User.Role.ADMIN;
        boolean isModerator = requestingUser.getRole() == User.Role.MODERATOR;
        
        if (!isOwner && !isAdmin && !isModerator) {
            throw new RuntimeException("You can only delete your own prayer requests");
        }
        
        // Delete all related prayer interactions first to avoid foreign key constraint violation
        // This includes reactions, comments, and replies
        // Use bulk delete queries to efficiently delete all interactions,
        // deleting replies first (children) then top-level interactions (parents)
        // This avoids foreign key constraint violations with the parent-child relationship
        try {
            long interactionCount = prayerInteractionRepository.countByPrayerRequestId(prayerRequestId);
            
            if (interactionCount > 0) {
                log.info("Deleting {} interactions (including replies) for prayer request: {}", interactionCount, prayerRequestId);
                
                // Step 1: Delete all reply interactions (interactions with a parent) first
                // This avoids foreign key constraint violations with the parent_interaction_id reference
                prayerInteractionRepository.deleteRepliesByPrayerRequestId(prayerRequestId);
                prayerInteractionRepository.flush();
                log.debug("Deleted reply interactions for prayer request: {}", prayerRequestId);
                
                // Step 2: Delete all top-level interactions (interactions without a parent)
                // Now safe to delete since all replies have been deleted
                prayerInteractionRepository.deleteTopLevelInteractionsByPrayerRequestId(prayerRequestId);
                prayerInteractionRepository.flush();
                log.debug("Deleted top-level interactions for prayer request: {}", prayerRequestId);
                
                log.info("Successfully deleted {} interactions for prayer request: {}", interactionCount, prayerRequestId);
            }
        } catch (Exception e) {
            log.error("Error deleting interactions for prayer request {}: {}", prayerRequestId, e.getMessage(), e);
            throw new RuntimeException("Failed to delete prayer request: " + e.getMessage(), e);
        }
        
        // Now delete the prayer request
        prayerRequestRepository.delete(prayerRequest);
        log.info("Prayer request deleted: {} by user: {} (owner: {}, admin: {}, moderator: {})", 
            prayerRequestId, userId, isOwner, isAdmin, isModerator);
    }
    
    public Page<PrayerRequestResponse> getAllPrayerRequests(UUID requestingUserId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<PrayerRequest> prayerRequests = prayerRequestRepository.findVisiblePrayersForUser(requestingUserId, pageable);
        
        return prayerRequests.map(prayerRequest -> {
            if (prayerRequest.getUser().getId().equals(requestingUserId)) {
                return PrayerRequestResponse.fromPrayerRequestForOwner(prayerRequest);
            }
            return PrayerRequestResponse.fromPrayerRequest(prayerRequest);
        });
    }
    
    public Page<PrayerRequestResponse> getPrayerRequestsByCategory(
            PrayerRequest.PrayerCategory category, 
            UUID requestingUserId, 
            int page, 
            int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<PrayerRequest> prayerRequests = prayerRequestRepository.findByCategoryOrderByCreatedAtDesc(category, pageable);
        
        return prayerRequests.map(prayerRequest -> {
            if (prayerRequest.getUser().getId().equals(requestingUserId)) {
                return PrayerRequestResponse.fromPrayerRequestForOwner(prayerRequest);
            }
            return PrayerRequestResponse.fromPrayerRequest(prayerRequest);
        });
    }
    
    public Page<PrayerRequestResponse> getPrayerRequestsByStatus(
            PrayerRequest.PrayerStatus status, 
            UUID requestingUserId, 
            int page, 
            int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<PrayerRequest> prayerRequests = prayerRequestRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
        
        return prayerRequests.map(prayerRequest -> {
            if (prayerRequest.getUser().getId().equals(requestingUserId)) {
                return PrayerRequestResponse.fromPrayerRequestForOwner(prayerRequest);
            }
            return PrayerRequestResponse.fromPrayerRequest(prayerRequest);
        });
    }
    
    public List<PrayerRequestResponse> getUserPrayerRequests(UUID userId) {
        List<PrayerRequest> prayerRequests = prayerRequestRepository.findByUserIdOrderByCreatedAtDesc(userId);
        
        return prayerRequests.stream()
                .map(PrayerRequestResponse::fromPrayerRequestForOwner)
                .collect(Collectors.toList());
    }
    
    public Page<PrayerRequestResponse> searchPrayerRequests(String searchTerm, UUID requestingUserId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<PrayerRequest> prayerRequests = prayerRequestRepository.searchPrayerRequests(searchTerm, pageable);
        
        return prayerRequests.map(prayerRequest -> {
            if (prayerRequest.getUser().getId().equals(requestingUserId)) {
                return PrayerRequestResponse.fromPrayerRequestForOwner(prayerRequest);
            }
            return PrayerRequestResponse.fromPrayerRequest(prayerRequest);
        });
    }
    
    // Dashboard specific methods
    public List<PrayerRequestResponse> getRecentPrayerRequestsForDashboard(int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        List<PrayerRequest> recentPrayers = prayerRequestRepository.findRecentPrayersForFeed(pageable);
        
        return recentPrayers.stream()
                .map(PrayerRequestResponse::fromPrayerRequest)
                .collect(Collectors.toList());
    }
    
    public List<PrayerRequestResponse> getRecentPrayerRequestsForDashboard(LocalDateTime since, int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        List<PrayerRequest> recentPrayers = prayerRequestRepository.findByCreatedAtAfterOrderByCreatedAtDesc(since, pageable);
        
        return recentPrayers.stream()
                .map(PrayerRequestResponse::fromPrayerRequest)
                .collect(Collectors.toList());
    }
    
    public long getActivePrayerCount() {
        return prayerRequestRepository.countByStatus(PrayerRequest.PrayerStatus.ACTIVE);
    }
    
    public long getAnsweredPrayerCount() {
        return prayerRequestRepository.countByStatus(PrayerRequest.PrayerStatus.ANSWERED);
    }
    
    /**
     * Send WebSocket notification for new prayer request
     */
    private void notifyNewPrayerRequest(PrayerRequest prayerRequest) {
        try {
            User user = prayerRequest.getUser();
            PrayerNotificationEvent event = PrayerNotificationEvent.newPrayerRequest(
                prayerRequest.getId(),
                user.getId(),
                user.getEmail(),
                user.getName(),
                prayerRequest.getTitle(),
                prayerRequest.getDescription()
            );
            
            // Broadcast to all connected users
            messagingTemplate.convertAndSend("/topic/prayers", event);
            log.info("Broadcasted new prayer request notification for prayer: {}", prayerRequest.getId());
            
        } catch (Exception e) {
            log.error("Error sending new prayer request notification: {}", e.getMessage());
        }
    }
    
    /**
     * Send WebSocket notification for prayer request update
     */
    private void notifyPrayerRequestUpdate(PrayerRequest prayerRequest) {
        try {
            User user = prayerRequest.getUser();
            PrayerNotificationEvent event = PrayerNotificationEvent.prayerAnswered(
                prayerRequest.getId(),
                user.getId(),
                user.getEmail(),
                user.getName(),
                prayerRequest.getTitle()
            );
            
            // Broadcast to all connected users
            messagingTemplate.convertAndSend("/topic/prayers", event);
            log.info("Broadcasted prayer update notification for prayer: {}", prayerRequest.getId());
            
        } catch (Exception e) {
            log.error("Error sending prayer update notification: {}", e.getMessage());
        }
    }
}