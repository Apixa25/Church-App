package com.churchapp.controller;

import com.churchapp.dto.PrayerRequestRequest;
import com.churchapp.dto.PrayerRequestResponse;
import com.churchapp.dto.UserProfileResponse;
import com.churchapp.entity.PrayerRequest;
import com.churchapp.service.PrayerRequestService;
import com.churchapp.service.PrayerInteractionService;
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

@RestController
@RequestMapping("/prayers")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8100", "capacitor://localhost"})
public class PrayerRequestController {
    
    private final PrayerRequestService prayerRequestService;
    private final PrayerInteractionService prayerInteractionService;
    private final UserProfileService userProfileService;
    
    @PostMapping
    public ResponseEntity<?> createPrayerRequest(@AuthenticationPrincipal User user,
                                               @Valid @RequestBody PrayerRequestRequest request) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            PrayerRequestResponse prayerRequest = prayerRequestService.createPrayerRequest(
                currentProfile.getUserId(), request);
            return ResponseEntity.ok(prayerRequest);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @GetMapping("/{prayerRequestId}")
    public ResponseEntity<?> getPrayerRequest(@AuthenticationPrincipal User user,
                                            @PathVariable UUID prayerRequestId) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            PrayerRequestResponse prayerRequest = prayerRequestService.getPrayerRequest(
                prayerRequestId, currentProfile.getUserId());
            PrayerRequestResponse enrichedRequest = enrichWithInteractions(prayerRequest);
            return ResponseEntity.ok(enrichedRequest);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @PutMapping("/{prayerRequestId}")
    public ResponseEntity<?> updatePrayerRequest(@AuthenticationPrincipal User user,
                                               @PathVariable UUID prayerRequestId,
                                               @Valid @RequestBody PrayerRequestRequest request) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            PrayerRequestResponse updatedPrayerRequest = prayerRequestService.updatePrayerRequest(
                prayerRequestId, currentProfile.getUserId(), request);
            return ResponseEntity.ok(updatedPrayerRequest);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @DeleteMapping("/{prayerRequestId}")
    public ResponseEntity<?> deletePrayerRequest(@AuthenticationPrincipal User user,
                                               @PathVariable UUID prayerRequestId) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            prayerRequestService.deletePrayerRequest(prayerRequestId, currentProfile.getUserId());
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "Prayer request deleted successfully");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @GetMapping
    public ResponseEntity<?> getAllPrayerRequests(@AuthenticationPrincipal User user,
                                                @RequestParam(defaultValue = "0") int page,
                                                @RequestParam(defaultValue = "20") int size) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            Page<PrayerRequestResponse> prayerRequests = prayerRequestService.getAllPrayerRequests(
                currentProfile.getUserId(), page, size);
            Page<PrayerRequestResponse> enrichedRequests = enrichWithInteractions(prayerRequests);
            return ResponseEntity.ok(enrichedRequests);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @GetMapping("/my-prayers")
    public ResponseEntity<?> getMyPrayerRequests(@AuthenticationPrincipal User user) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            List<PrayerRequestResponse> myPrayerRequests = prayerRequestService.getUserPrayerRequests(
                currentProfile.getUserId());
            return ResponseEntity.ok(myPrayerRequests);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @GetMapping("/category/{category}")
    public ResponseEntity<?> getPrayerRequestsByCategory(@AuthenticationPrincipal User user,
                                                       @PathVariable PrayerRequest.PrayerCategory category,
                                                       @RequestParam(defaultValue = "0") int page,
                                                       @RequestParam(defaultValue = "20") int size) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            Page<PrayerRequestResponse> prayerRequests = prayerRequestService.getPrayerRequestsByCategory(
                category, currentProfile.getUserId(), page, size);
            return ResponseEntity.ok(prayerRequests);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @GetMapping("/status/{status}")
    public ResponseEntity<?> getPrayerRequestsByStatus(@AuthenticationPrincipal User user,
                                                     @PathVariable PrayerRequest.PrayerStatus status,
                                                     @RequestParam(defaultValue = "0") int page,
                                                     @RequestParam(defaultValue = "20") int size) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            Page<PrayerRequestResponse> prayerRequests = prayerRequestService.getPrayerRequestsByStatus(
                status, currentProfile.getUserId(), page, size);
            return ResponseEntity.ok(prayerRequests);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @GetMapping("/search")
    public ResponseEntity<?> searchPrayerRequests(@AuthenticationPrincipal User user,
                                                @RequestParam String query,
                                                @RequestParam(defaultValue = "0") int page,
                                                @RequestParam(defaultValue = "20") int size) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            Page<PrayerRequestResponse> prayerRequests = prayerRequestService.searchPrayerRequests(
                query, currentProfile.getUserId(), page, size);
            return ResponseEntity.ok(prayerRequests);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @GetMapping("/categories")
    public ResponseEntity<PrayerRequest.PrayerCategory[]> getPrayerCategories() {
        return ResponseEntity.ok(PrayerRequest.PrayerCategory.values());
    }
    
    @GetMapping("/statuses")
    public ResponseEntity<PrayerRequest.PrayerStatus[]> getPrayerStatuses() {
        return ResponseEntity.ok(PrayerRequest.PrayerStatus.values());
    }
    
    @GetMapping("/stats")
    public ResponseEntity<?> getPrayerStats() {
        try {
            Map<String, Object> stats = new HashMap<>();
            stats.put("activePrayerCount", prayerRequestService.getActivePrayerCount());
            stats.put("answeredPrayerCount", prayerRequestService.getAnsweredPrayerCount());
            return ResponseEntity.ok(stats);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    // Helper method to enrich prayer request responses with interaction summaries
    private PrayerRequestResponse enrichWithInteractions(PrayerRequestResponse prayerResponse) {
        try {
            prayerResponse.setInteractionSummary(
                prayerInteractionService.getInteractionSummary(prayerResponse.getId()));
        } catch (Exception e) {
            log.warn("Could not load interaction summary for prayer {}: {}", 
                prayerResponse.getId(), e.getMessage());
            // Continue without interaction summary rather than failing
        }
        return prayerResponse;
    }
    
    private List<PrayerRequestResponse> enrichWithInteractions(List<PrayerRequestResponse> prayerResponses) {
        return prayerResponses.stream()
                .map(this::enrichWithInteractions)
                .collect(java.util.stream.Collectors.toList());
    }
    
    private Page<PrayerRequestResponse> enrichWithInteractions(Page<PrayerRequestResponse> prayerResponses) {
        return prayerResponses.map(this::enrichWithInteractions);
    }
}