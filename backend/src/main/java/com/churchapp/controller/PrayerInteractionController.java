package com.churchapp.controller;

import com.churchapp.dto.PrayerInteractionRequest;
import com.churchapp.dto.PrayerInteractionResponse;
import com.churchapp.dto.PrayerInteractionSummary;
import com.churchapp.dto.PrayerParticipantResponse;
import com.churchapp.dto.UserProfileResponse;
import com.churchapp.entity.PrayerInteraction;
import com.churchapp.service.PrayerInteractionService;
import com.churchapp.service.UserProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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
@RequestMapping("/prayer-interactions")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8100", "capacitor://localhost"})
public class PrayerInteractionController {
    
    private final PrayerInteractionService prayerInteractionService;
    private final UserProfileService userProfileService;
    
    @PostMapping
    public ResponseEntity<?> createInteraction(@AuthenticationPrincipal User user,
                                             @Valid @RequestBody PrayerInteractionRequest request) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            PrayerInteractionResponse interaction = prayerInteractionService.createInteraction(
                currentProfile.getUserId(), request);
            
            if (interaction == null) {
                // Interaction was removed (toggle behavior)
                Map<String, String> response = new HashMap<>();
                response.put("message", "Interaction removed");
                response.put("action", "removed");
                return ResponseEntity.ok(response);
            }
            
            return ResponseEntity.ok(interaction);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @DeleteMapping("/{interactionId}")
    public ResponseEntity<?> deleteInteraction(@AuthenticationPrincipal User user,
                                             @PathVariable UUID interactionId) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            prayerInteractionService.deleteInteraction(interactionId, currentProfile.getUserId());
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "Interaction deleted successfully");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @GetMapping("/prayer/{prayerRequestId}")
    public ResponseEntity<?> getInteractionsByPrayerRequest(@PathVariable UUID prayerRequestId,
                                                          @RequestParam(defaultValue = "0") int page,
                                                          @RequestParam(defaultValue = "50") int size) {
        try {
            if (page == 0 && size == 50) {
                // Return all interactions if default pagination is used
                List<PrayerInteractionResponse> interactions = prayerInteractionService
                    .getInteractionsByPrayerRequest(prayerRequestId);
                return ResponseEntity.ok(interactions);
            } else {
                // Return paginated results
                Page<PrayerInteractionResponse> interactions = prayerInteractionService
                    .getInteractionsByPrayerRequest(prayerRequestId, page, size);
                return ResponseEntity.ok(interactions);
            }
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @GetMapping("/prayer/{prayerRequestId}/comments")
    public ResponseEntity<?> getCommentsByPrayerRequest(@PathVariable UUID prayerRequestId,
                                                       @RequestParam(defaultValue = "0") int page,
                                                       @RequestParam(defaultValue = "20") int size) {
        try {
            if (page == 0 && size == 20) {
                // Return all comments if default pagination is used
                List<PrayerInteractionResponse> comments = prayerInteractionService
                    .getCommentsByPrayerRequest(prayerRequestId);
                return ResponseEntity.ok(comments);
            } else {
                // Return paginated results
                Page<PrayerInteractionResponse> comments = prayerInteractionService
                    .getCommentsByPrayerRequest(prayerRequestId, page, size);
                return ResponseEntity.ok(comments);
            }
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @GetMapping("/prayer/{prayerRequestId}/reactions")
    public ResponseEntity<?> getReactionsByPrayerRequest(@PathVariable UUID prayerRequestId) {
        try {
            List<PrayerInteractionResponse> reactions = prayerInteractionService
                .getReactionsByPrayerRequest(prayerRequestId);
            return ResponseEntity.ok(reactions);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @GetMapping("/prayer/{prayerRequestId}/summary")
    public ResponseEntity<?> getInteractionSummary(@PathVariable UUID prayerRequestId) {
        try {
            PrayerInteractionSummary summary = prayerInteractionService.getInteractionSummary(prayerRequestId);
            return ResponseEntity.ok(summary);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @GetMapping("/prayer/{prayerRequestId}/participants")
    public ResponseEntity<?> getParticipants(@PathVariable UUID prayerRequestId) {
        try {
            List<PrayerParticipantResponse> participants = prayerInteractionService.getParticipants(prayerRequestId);
            return ResponseEntity.ok(participants);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @GetMapping("/my-interactions")
    public ResponseEntity<?> getMyInteractions(@AuthenticationPrincipal User user) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            List<PrayerInteractionResponse> myInteractions = prayerInteractionService
                .getUserInteractions(currentProfile.getUserId());
            return ResponseEntity.ok(myInteractions);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @GetMapping("/check-interaction/{prayerRequestId}/{type}")
    public ResponseEntity<?> checkUserInteraction(@AuthenticationPrincipal User user,
                                                @PathVariable UUID prayerRequestId,
                                                @PathVariable PrayerInteraction.InteractionType type) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            boolean hasInteracted = prayerInteractionService.hasUserInteracted(
                prayerRequestId, currentProfile.getUserId(), type);
            
            Map<String, Object> response = new HashMap<>();
            response.put("hasInteracted", hasInteracted);
            response.put("type", type);
            response.put("prayerRequestId", prayerRequestId);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @GetMapping("/types")
    public ResponseEntity<PrayerInteraction.InteractionType[]> getInteractionTypes() {
        return ResponseEntity.ok(PrayerInteraction.InteractionType.values());
    }
    
    @GetMapping("/recent")
    public ResponseEntity<?> getRecentInteractions(@RequestParam(defaultValue = "10") int limit) {
        try {
            List<PrayerInteractionResponse> recentInteractions = prayerInteractionService
                .getRecentInteractionsForDashboard(limit);
            return ResponseEntity.ok(recentInteractions);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}