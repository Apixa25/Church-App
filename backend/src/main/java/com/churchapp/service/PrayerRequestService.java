package com.churchapp.service;

import com.churchapp.dto.PrayerRequestRequest;
import com.churchapp.dto.PrayerRequestUpdateRequest;
import com.churchapp.dto.PrayerRequestResponse;
import com.churchapp.entity.PrayerRequest;
import com.churchapp.entity.User;
import com.churchapp.repository.PrayerRequestRepository;
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
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class PrayerRequestService {
    
    private final PrayerRequestRepository prayerRequestRepository;
    private final UserRepository userRepository;
    
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
        
        return PrayerRequestResponse.fromPrayerRequestForOwner(updatedPrayerRequest);
    }
    
    public void deletePrayerRequest(UUID prayerRequestId, UUID userId) {
        PrayerRequest prayerRequest = prayerRequestRepository.findById(prayerRequestId)
            .orElseThrow(() -> new RuntimeException("Prayer request not found with id: " + prayerRequestId));
        
        // Only the owner can delete their prayer request
        if (!prayerRequest.getUser().getId().equals(userId)) {
            throw new RuntimeException("You can only delete your own prayer requests");
        }
        
        prayerRequestRepository.delete(prayerRequest);
        log.info("Prayer request deleted: {} by user: {}", prayerRequestId, userId);
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
}