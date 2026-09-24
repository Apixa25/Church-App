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
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Reactions and comments on prayer requests.
 *
 * Every endpoint resolves the caller and hands it to the service, which
 * enforces that the caller belongs to the prayer's church.
 */
@RestController
@RequestMapping("/prayer-interactions")
@RequiredArgsConstructor
@Slf4j
public class PrayerInteractionController {
    
    private final PrayerInteractionService prayerInteractionService;
    private final UserProfileService userProfileService;
    
    @PostMapping
    public ResponseEntity<?> createInteraction(@AuthenticationPrincipal User user,
                                             @Valid @RequestBody PrayerInteractionRequest request) {
        try {
            PrayerInteractionResponse interaction = prayerInteractionService.createInteraction(
                viewerId(user), request);
            
            if (interaction == null) {
                // Interaction was removed (toggle behavior)
                Map<String, String> response = new HashMap<>();
                response.put("message", "Interaction removed");
                response.put("action", "removed");
                return ResponseEntity.ok(response);
            }
            
            return ResponseEntity.ok(interaction);
        } catch (DataIntegrityViolationException e) {
            // Two taps raced past the find-then-insert; the unique index kept the
            // second one out. The reaction is already recorded, so tell the client
            // to refresh rather than surfacing a raw constraint error.
            log.debug("Duplicate prayer reaction rejected by unique index: {}", e.getMostSpecificCause().getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("error", "You've already reacted to this prayer.", "action", "duplicate"));
        } catch (RuntimeException e) {
            return badRequest(e);
        }
    }
    
    @DeleteMapping("/{interactionId}")
    public ResponseEntity<?> deleteInteraction(@AuthenticationPrincipal User user,
                                             @PathVariable UUID interactionId) {
        try {
            prayerInteractionService.deleteInteraction(interactionId, viewerId(user));
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "Interaction deleted successfully");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return badRequest(e);
        }
    }
    
    @GetMapping("/prayer/{prayerRequestId}")
    public ResponseEntity<?> getInteractionsByPrayerRequest(@AuthenticationPrincipal User user,
                                                          @PathVariable UUID prayerRequestId,
                                                          @RequestParam(defaultValue = "0") int page,
                                                          @RequestParam(defaultValue = "50") int size) {
        try {
            UUID viewerId = viewerId(user);
            if (page == 0 && size == 50) {
                // Return all interactions if default pagination is used
                List<PrayerInteractionResponse> interactions = prayerInteractionService
                    .getInteractionsByPrayerRequest(prayerRequestId, viewerId);
                return ResponseEntity.ok(interactions);
            } else {
                // Return paginated results
                Page<PrayerInteractionResponse> interactions = prayerInteractionService
                    .getInteractionsByPrayerRequest(prayerRequestId, viewerId, page, size);
                return ResponseEntity.ok(interactions);
            }
        } catch (RuntimeException e) {
            return badRequest(e);
        }
    }
    
    @GetMapping("/prayer/{prayerRequestId}/comments")
    public ResponseEntity<?> getCommentsByPrayerRequest(@AuthenticationPrincipal User user,
                                                       @PathVariable UUID prayerRequestId,
                                                       @RequestParam(defaultValue = "0") int page,
                                                       @RequestParam(defaultValue = "20") int size) {
        try {
            UUID viewerId = viewerId(user);
            if (page == 0 && size == 20) {
                // Return all comments if default pagination is used
                List<PrayerInteractionResponse> comments = prayerInteractionService
                    .getCommentsByPrayerRequest(prayerRequestId, viewerId);
                return ResponseEntity.ok(comments);
            } else {
                // Return paginated results
                Page<PrayerInteractionResponse> comments = prayerInteractionService
                    .getCommentsByPrayerRequest(prayerRequestId, viewerId, page, size);
                return ResponseEntity.ok(comments);
            }
        } catch (RuntimeException e) {
            return badRequest(e);
        }
    }
    
    @GetMapping("/prayer/{prayerRequestId}/reactions")
    public ResponseEntity<?> getReactionsByPrayerRequest(@AuthenticationPrincipal User user,
                                                        @PathVariable UUID prayerRequestId) {
        try {
            List<PrayerInteractionResponse> reactions = prayerInteractionService
                .getReactionsByPrayerRequest(prayerRequestId, viewerId(user));
            return ResponseEntity.ok(reactions);
        } catch (RuntimeException e) {
            return badRequest(e);
        }
    }
    
    @GetMapping("/prayer/{prayerRequestId}/summary")
    public ResponseEntity<?> getInteractionSummary(@AuthenticationPrincipal User user,
                                                   @PathVariable UUID prayerRequestId) {
        try {
            PrayerInteractionSummary summary = prayerInteractionService
                .getInteractionSummary(prayerRequestId, viewerId(user));
            return ResponseEntity.ok(summary);
        } catch (RuntimeException e) {
            return badRequest(e);
        }
    }

    @GetMapping("/prayer/{prayerRequestId}/participants")
    public ResponseEntity<?> getParticipants(@AuthenticationPrincipal User user,
                                             @PathVariable UUID prayerRequestId) {
        try {
            List<PrayerParticipantResponse> participants = prayerInteractionService
                .getParticipants(prayerRequestId, viewerId(user));
            return ResponseEntity.ok(participants);
        } catch (RuntimeException e) {
            return badRequest(e);
        }
    }
    
    @GetMapping("/my-interactions")
    public ResponseEntity<?> getMyInteractions(@AuthenticationPrincipal User user) {
        try {
            List<PrayerInteractionResponse> myInteractions = prayerInteractionService
                .getUserInteractions(viewerId(user));
            return ResponseEntity.ok(myInteractions);
        } catch (RuntimeException e) {
            return badRequest(e);
        }
    }
    
    @GetMapping("/check-interaction/{prayerRequestId}/{type}")
    public ResponseEntity<?> checkUserInteraction(@AuthenticationPrincipal User user,
                                                @PathVariable UUID prayerRequestId,
                                                @PathVariable PrayerInteraction.InteractionType type) {
        try {
            boolean hasInteracted = prayerInteractionService.hasUserInteracted(
                prayerRequestId, viewerId(user), type);
            
            Map<String, Object> response = new HashMap<>();
            response.put("hasInteracted", hasInteracted);
            response.put("type", type);
            response.put("prayerRequestId", prayerRequestId);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return badRequest(e);
        }
    }
    
    @GetMapping("/types")
    public ResponseEntity<PrayerInteraction.InteractionType[]> getInteractionTypes() {
        return ResponseEntity.ok(PrayerInteraction.InteractionType.values());
    }
    
    /** Recent prayer activity in the caller's church (dashboard widget). */
    @GetMapping("/recent")
    public ResponseEntity<?> getRecentInteractions(@AuthenticationPrincipal User user,
                                                   @RequestParam(defaultValue = "10") int limit) {
        try {
            List<PrayerInteractionResponse> recentInteractions = prayerInteractionService
                .getRecentInteractionsForDashboard(viewerId(user), limit);
            return ResponseEntity.ok(recentInteractions);
        } catch (RuntimeException e) {
            return badRequest(e);
        }
    }

    /**
     * Get comments that others have made on prayers owned by a specific user
     * This is for the "Comments on my content" tab in user profiles
     */
    @GetMapping("/user/{userId}/comments-received")
    public ResponseEntity<?> getCommentsReceivedByUser(
            @AuthenticationPrincipal User user,
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        try {
            Page<PrayerInteractionResponse> comments = prayerInteractionService
                .getCommentsReceivedByUser(userId, viewerId(user), page, size);
            return ResponseEntity.ok(comments);
        } catch (RuntimeException e) {
            return badRequest(e);
        }
    }

    /**
     * Get count of comments received on prayers owned by a specific user
     */
    @GetMapping("/user/{userId}/comments-received-count")
    public ResponseEntity<?> getCommentsReceivedCount(@AuthenticationPrincipal User user,
                                                      @PathVariable UUID userId) {
        try {
            long count = prayerInteractionService.getCommentsReceivedCount(userId, viewerId(user));
            return ResponseEntity.ok(Map.of("count", count));
        } catch (RuntimeException e) {
            return badRequest(e);
        }
    }

    // ------------------------------------------------------------------
    // helpers
    // ------------------------------------------------------------------

    private UUID viewerId(User user) {
        UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
        return currentProfile.getUserId();
    }

    private ResponseEntity<Map<String, String>> badRequest(RuntimeException e) {
        Map<String, String> error = new HashMap<>();
        error.put("error", e.getMessage());
        return ResponseEntity.badRequest().body(error);
    }
}
