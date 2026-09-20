package com.churchapp.controller;

import com.churchapp.dto.FeedPreferenceRequest;
import com.churchapp.dto.FeedPreferenceResponse;
import com.churchapp.dto.FeedScope;
import com.churchapp.dto.FeedScopeParseRequest;
import com.churchapp.dto.FeedScopeParseResult;
import com.churchapp.dto.FeedScopeSaveRequest;
import com.churchapp.entity.FeedPreference;
import com.churchapp.repository.UserRepository;
import com.churchapp.service.FeedFilterService;
import com.churchapp.service.FeedScopeParserService;
import com.churchapp.service.FeedScopeRateLimiter;
import com.churchapp.service.FeedScopeValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/feed-preferences")
@RequiredArgsConstructor
@Slf4j
public class FeedPreferenceController {

    private final FeedFilterService feedFilterService;
    private final UserRepository userRepository;
    private final FeedScopeParserService parserService;
    private final FeedScopeValidator scopeValidator;
    private final FeedScopeRateLimiter rateLimiter;

    // Helper method to get user ID from Spring Security User
    private UUID getUserId(User securityUser) {
        return userRepository.findByEmail(securityUser.getUsername())
            .map(com.churchapp.entity.User::getId)
            .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // ========================================================================
    // FEED PREFERENCE MANAGEMENT
    // ========================================================================

    @GetMapping
    public ResponseEntity<FeedPreferenceResponse> getFeedPreference(
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        FeedPreference preference = feedFilterService.getFeedPreference(userId);

        FeedPreferenceResponse response = FeedPreferenceResponse.fromFeedPreference(
            preference, feedFilterService.readScope(preference));
        return ResponseEntity.ok(response);
    }

    // ========================================================================
    // FLEXIBLE SCOPE (CUSTOM filter) - natural language + quick chips
    // ========================================================================

    /**
     * Preview only: translate free text into a FeedScope. Nothing is saved.
     * The frontend shows the description + warnings and asks the user to confirm.
     */
    @PostMapping("/parse")
    public ResponseEntity<?> parseScope(
            @Valid @RequestBody FeedScopeParseRequest request,
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);

        if (!rateLimiter.tryAcquire(userId)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(java.util.Map.of(
                    "message", "You've changed your feed a lot in the last hour - try the quick options or wait a bit.",
                    "limitPerHour", rateLimiter.getLimitPerHour()));
        }

        log.info("🗣️ User {} parsing feed scope text ({} chars)", userId, request.getText().length());
        FeedScopeParseResult result = parserService.parse(userId, request.getText());
        return ResponseEntity.ok(result);
    }

    /**
     * Save a scope (from the preview card or a quick chip) and switch to the CUSTOM filter.
     * The scope is re-validated server-side; the client is never trusted.
     */
    @PutMapping("/scope")
    public ResponseEntity<FeedPreferenceResponse> saveScope(
            @Valid @RequestBody FeedScopeSaveRequest request,
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);

        FeedScopeValidator.ValidationResult validated = scopeValidator.validate(userId, request.getScope());
        FeedScope scope = validated.scope();
        String description = parserService.describe(userId, scope);

        log.info("💾 User {} saving CUSTOM feed scope: {} (warnings={})", userId, description, validated.warnings());

        FeedPreference saved = feedFilterService.saveCustomScope(userId, scope, description, request.getSourceText());

        FeedPreferenceResponse response = FeedPreferenceResponse.fromFeedPreference(saved, scope);
        if (response.getUserId() == null) {
            response.setUserId(userId);
        }
        return ResponseEntity.ok(response);
    }

    /**
     * Preview what a scope would resolve to (org/group counts) without saving.
     * Handy for the "Nearby churches" chip so we can show "12 churches within 25 mi".
     */
    @PostMapping("/scope/preview")
    public ResponseEntity<FeedScopeParseResult> previewScope(
            @Valid @RequestBody FeedScopeSaveRequest request,
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        FeedScopeValidator.ValidationResult validated = scopeValidator.validate(userId, request.getScope());
        FeedScope scope = validated.scope();

        FeedScopeParseResult result = FeedScopeParseResult.builder()
            .scope(scope)
            .description(parserService.describe(userId, scope))
            .confidence(1.0)
            .warnings(validated.warnings())
            .source("CHIP")
            .sourceText(request.getSourceText())
            .build();
        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<FeedPreferenceResponse> createOrUpdateFeedPreference(
            @Valid @RequestBody FeedPreferenceRequest request,
            @AuthenticationPrincipal User userDetails) {

        try {
            UUID userId = getUserId(userDetails);
            log.info("User {} updating feed preference to filter: {}", userId, request.getActiveFilter());

            // Parse the enum
            FeedPreference.FeedFilter filter;
            try {
                filter = FeedPreference.FeedFilter.valueOf(request.getActiveFilter().toUpperCase());
            } catch (IllegalArgumentException e) {
                log.error("Invalid feed filter value: {}", request.getActiveFilter());
                return ResponseEntity.badRequest().build();
            }

            // Handle empty array - convert to null if filter is not SELECTED_GROUPS
            List<UUID> selectedGroupIds = request.getSelectedGroupIds();
            if (selectedGroupIds != null && selectedGroupIds.isEmpty() && filter != FeedPreference.FeedFilter.SELECTED_GROUPS) {
                selectedGroupIds = null;
            }

            FeedPreference updated = feedFilterService.updateFeedPreference(
                userId,
                filter,
                selectedGroupIds,
                request.getSelectedOrganizationId()
            );

            // Create response with userId explicitly set to avoid lazy loading issues
            FeedPreferenceResponse response = FeedPreferenceResponse.fromFeedPreference(
                updated, feedFilterService.readScope(updated));
            // Ensure userId is set even if user relationship fails
            if (response.getUserId() == null) {
                response.setUserId(userId);
            }
            
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.error("Invalid argument when updating feed preference: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().build();
        } catch (RuntimeException e) {
            log.error("Error updating feed preference for user: {}", userDetails != null ? userDetails.getUsername() : "unknown", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        } catch (Exception e) {
            log.error("Unexpected error updating feed preference", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping
    public ResponseEntity<FeedPreferenceResponse> updateFeedPreference(
            @Valid @RequestBody FeedPreferenceRequest request,
            @AuthenticationPrincipal User userDetails) {

        // Same as POST - upsert behavior
        return createOrUpdateFeedPreference(request, userDetails);
    }

    @DeleteMapping
    public ResponseEntity<Void> resetFeedPreference(
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        log.info("User {} resetting feed preference to ALL", userId);

        // Reset to default (ALL)
        feedFilterService.updateFeedPreference(userId, FeedPreference.FeedFilter.ALL, null, null);

        return ResponseEntity.noContent().build();
    }

    // ========================================================================
    // FEED VISIBILITY QUERIES
    // ========================================================================

    @GetMapping("/visible-group-ids")
    public ResponseEntity<List<UUID>> getVisibleGroupIds(
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        List<UUID> groupIds = feedFilterService.getVisibleGroupIds(userId);

        return ResponseEntity.ok(groupIds);
    }

    @GetMapping("/has-primary-org")
    public ResponseEntity<Boolean> hasPrimaryOrganization(
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        boolean hasPrimary = feedFilterService.hasPrimaryOrganization(userId);

        return ResponseEntity.ok(hasPrimary);
    }

    @GetMapping("/primary-org-id")
    public ResponseEntity<UUID> getPrimaryOrganizationId(
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        UUID primaryOrgId = feedFilterService.getUserPrimaryOrgId(userId);

        if (primaryOrgId == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(primaryOrgId);
    }

    @GetMapping("/secondary-org-ids")
    public ResponseEntity<List<UUID>> getSecondaryOrganizationIds(
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        List<UUID> secondaryOrgIds = feedFilterService.getUserSecondaryOrgIds(userId);

        return ResponseEntity.ok(secondaryOrgIds);
    }

    // ========================================================================
    // FEED PARAMETERS (for frontend to use in feed queries)
    // ========================================================================

    @GetMapping("/feed-parameters")
    public ResponseEntity<FeedParametersResponse> getFeedParameters(
            @AuthenticationPrincipal User userDetails) {

        UUID userId = getUserId(userDetails);
        FeedFilterService.FeedParameters params = feedFilterService.getFeedParameters(userId);

        FeedParametersResponse response = new FeedParametersResponse(
            params.getPrimaryOrgId(),
            params.getSecondaryOrgIds(),
            params.getGroupIds()
        );

        return ResponseEntity.ok(response);
    }

    // Inner class for feed parameters response
    @lombok.Data
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class FeedParametersResponse {
        private UUID primaryOrgId;
        private List<UUID> secondaryOrgIds;
        private List<UUID> groupIds;
    }
}
