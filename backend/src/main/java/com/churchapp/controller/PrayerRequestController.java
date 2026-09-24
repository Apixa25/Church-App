package com.churchapp.controller;

import com.churchapp.dto.PrayerInteractionSummary;
import com.churchapp.dto.PrayerRequestRequest;
import com.churchapp.dto.PrayerRequestUpdateRequest;
import com.churchapp.dto.PrayerRequestResponse;
import com.churchapp.dto.UserProfileResponse;
import com.churchapp.entity.PrayerRequest;
import com.churchapp.exception.PrayerException;
import com.churchapp.service.PrayerRequestService;
import com.churchapp.service.PrayerInteractionService;
import com.churchapp.service.UserProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/prayers")
@RequiredArgsConstructor
@Slf4j
// CORS is handled globally by SecurityConfig - no need for controller-level annotation
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
            return errorResponse(e);
        }
    }
    
    @PostMapping(value = "/with-image", consumes = {"multipart/form-data"})
    public ResponseEntity<?> createPrayerRequestWithImage(
            @AuthenticationPrincipal User user,
            @RequestParam("title") String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "isAnonymous", required = false) Boolean isAnonymous,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "organizationId", required = false) UUID organizationId,
            @RequestParam(value = "image", required = false) MultipartFile imageFile) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            
            // Build request object
            PrayerRequestRequest request = new PrayerRequestRequest();
            request.setTitle(title);
            request.setDescription(description);
            request.setIsAnonymous(isAnonymous); // null → the member's visibility setting decides
            request.setOrganizationId(organizationId); // Pass organizationId from active context
            
            // Parse category
            if (category != null && !category.trim().isEmpty()) {
                try {
                    request.setCategory(PrayerRequest.PrayerCategory.valueOf(category.toUpperCase()));
                } catch (IllegalArgumentException e) {
                    request.setCategory(PrayerRequest.PrayerCategory.GENERAL);
                }
            } else {
                request.setCategory(PrayerRequest.PrayerCategory.GENERAL);
            }
            
            // Create prayer request with image
            PrayerRequestResponse prayerRequest = prayerRequestService.createPrayerRequestWithImage(
                currentProfile.getUserId(), request, imageFile);
            return ResponseEntity.ok(prayerRequest);
        } catch (RuntimeException e) {
            return errorResponse(e);
        } catch (Exception e) {
            log.error("Error creating prayer request with image: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to create prayer request: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
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
            return errorResponse(e);
        }
    }
    
    @PutMapping("/{prayerRequestId}")
    public ResponseEntity<?> updatePrayerRequest(@AuthenticationPrincipal User user,
                                               @PathVariable UUID prayerRequestId,
                                               @Valid @RequestBody PrayerRequestUpdateRequest request) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            PrayerRequestResponse updatedPrayerRequest = prayerRequestService.updatePrayerRequest(
                prayerRequestId, currentProfile.getUserId(), request);
            return ResponseEntity.ok(updatedPrayerRequest);
        } catch (RuntimeException e) {
            return errorResponse(e);
        }
    }
    
    @PutMapping(value = "/{prayerRequestId}/with-image", consumes = {"multipart/form-data"})
    public ResponseEntity<?> updatePrayerRequestWithImage(
            @AuthenticationPrincipal User user,
            @PathVariable UUID prayerRequestId,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "isAnonymous", required = false) Boolean isAnonymous,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "imageUrl", required = false) String imageUrl,
            @RequestParam(value = "image", required = false) MultipartFile imageFile) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            
            // Build update request object
            PrayerRequestUpdateRequest request = new PrayerRequestUpdateRequest();
            request.setTitle(title);
            request.setDescription(description);
            request.setIsAnonymous(isAnonymous);
            request.setImageUrl(imageUrl);
            
            // Parse category
            if (category != null && !category.trim().isEmpty()) {
                try {
                    request.setCategory(PrayerRequest.PrayerCategory.valueOf(category.toUpperCase()));
                } catch (IllegalArgumentException e) {
                    // Invalid category, ignore
                }
            }
            
            // Parse status
            if (status != null && !status.trim().isEmpty()) {
                try {
                    request.setStatus(PrayerRequest.PrayerStatus.valueOf(status.toUpperCase()));
                } catch (IllegalArgumentException e) {
                    // Invalid status, ignore
                }
            }
            
            // Update prayer request with image
            PrayerRequestResponse updatedPrayerRequest = prayerRequestService.updatePrayerRequestWithImage(
                prayerRequestId, currentProfile.getUserId(), request, imageFile);
            return ResponseEntity.ok(updatedPrayerRequest);
        } catch (RuntimeException e) {
            return errorResponse(e);
        } catch (Exception e) {
            log.error("Error updating prayer request with image: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to update prayer request: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
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
            return errorResponse(e);
        }
    }
    
    /**
     * Church prayer feed. {@code category} and {@code status} are optional and combine;
     * without a status only ACTIVE prayers are returned.
     */
    @GetMapping
    public ResponseEntity<?> getAllPrayerRequests(@AuthenticationPrincipal User user,
                                                @RequestParam(defaultValue = "0") int page,
                                                @RequestParam(defaultValue = "20") int size,
                                                @RequestParam(required = false) UUID organizationId,
                                                @RequestParam(required = false) PrayerRequest.PrayerCategory category,
                                                @RequestParam(required = false) PrayerRequest.PrayerStatus status) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            Page<PrayerRequestResponse> prayerRequests = prayerRequestService.getAllPrayerRequests(
                currentProfile.getUserId(), organizationId, category, status, page, size);
            Page<PrayerRequestResponse> enrichedRequests = enrichWithInteractions(prayerRequests);
            return ResponseEntity.ok(enrichedRequests);
        } catch (RuntimeException e) {
            return errorResponse(e);
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
            return errorResponse(e);
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
            return errorResponse(e);
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
            return errorResponse(e);
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
            return errorResponse(e);
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
    public ResponseEntity<?> getPrayerStats(@AuthenticationPrincipal User user) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            Map<String, Long> stats = prayerRequestService.getPrayerStatsForUser(currentProfile.getUserId());
            return ResponseEntity.ok(stats);
        } catch (RuntimeException e) {
            return errorResponse(e);
        }
    }
    
    @GetMapping("/sheet")
    public ResponseEntity<?> getPrayerSheet(@AuthenticationPrincipal User user) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            List<PrayerRequestResponse> activePrayers = prayerRequestService.getActivePrayersForSheet(
                currentProfile.getUserId());
            return ResponseEntity.ok(activePrayers);
        } catch (RuntimeException e) {
            return errorResponse(e);
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
    
    /**
     * Enrich a whole list with two batched queries instead of four per prayer.
     * The list has already been scoped to the viewer's church by the service.
     */
    private List<PrayerRequestResponse> enrichWithInteractions(List<PrayerRequestResponse> prayerResponses) {
        if (prayerResponses.isEmpty()) {
            return prayerResponses;
        }
        try {
            List<UUID> ids = prayerResponses.stream()
                .map(PrayerRequestResponse::getId)
                .collect(Collectors.toList());
            Map<UUID, PrayerInteractionSummary> summaries = prayerInteractionService.getInteractionSummaries(ids);
            for (PrayerRequestResponse response : prayerResponses) {
                response.setInteractionSummary(summaries.get(response.getId()));
            }
        } catch (Exception e) {
            log.warn("Could not load interaction summaries for {} prayers: {}", prayerResponses.size(), e.getMessage());
            // Continue without interaction summaries rather than failing
        }
        return prayerResponses;
    }
    
    private Page<PrayerRequestResponse> enrichWithInteractions(Page<PrayerRequestResponse> prayerResponses) {
        enrichWithInteractions(prayerResponses.getContent());
        return prayerResponses;
    }

    /**
     * Prayer exceptions carry their own HTTP status (404 not found, 403 not
     * allowed); anything else is treated as a bad request, as before.
     */
    private ResponseEntity<Map<String, String>> errorResponse(RuntimeException e) {
        HttpStatus status = e instanceof PrayerException
            ? ((PrayerException) e).getStatus()
            : HttpStatus.BAD_REQUEST;
        if (status.is4xxClientError()) {
            log.debug("Prayer request rejected ({}): {}", status.value(), e.getMessage());
        } else {
            log.error("Prayer request failed ({}): {}", status.value(), e.getMessage(), e);
        }
        Map<String, String> error = new HashMap<>();
        error.put("error", e.getMessage());
        return ResponseEntity.status(status).body(error);
    }
}