package com.churchapp.controller;

import com.churchapp.dto.MarketplaceListingRequest;
import com.churchapp.dto.MarketplaceListingResponse;
import com.churchapp.dto.MarketplaceListingUpdateRequest;
import com.churchapp.dto.MarketplaceMetricsResponse;
import com.churchapp.entity.MarketplaceListingStatus;
import com.churchapp.entity.MarketplacePostType;
import com.churchapp.entity.MarketplaceSectionType;
import com.churchapp.entity.User;
import com.churchapp.repository.UserRepository;
import com.churchapp.service.ContentModerationService;
import com.churchapp.service.MarketplaceService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/marketplace")
@RequiredArgsConstructor
@Slf4j
public class MarketplaceController {

    private final MarketplaceService marketplaceService;
    private final ContentModerationService contentModerationService;
    private final UserRepository userRepository;

    @PostMapping("/listings")
    public ResponseEntity<MarketplaceListingResponse> createListing(
        @Valid @RequestBody MarketplaceListingRequest request,
        Authentication authentication
    ) {
        MarketplaceListingResponse response = marketplaceService.createListing(authentication.getName(), request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/listings")
    public ResponseEntity<Page<MarketplaceListingResponse>> getListings(
        @RequestParam(required = false) UUID organizationId,
        @RequestParam(required = false) MarketplaceSectionType sectionType,
        @RequestParam(required = false) MarketplacePostType postType,
        @RequestParam(required = false) MarketplaceListingStatus status,
        @RequestParam(required = false) String category,
        @RequestParam(required = false) String query,
        @RequestParam(required = false) BigDecimal minPrice,
        @RequestParam(required = false) BigDecimal maxPrice,
        @RequestParam(required = false) String locationQuery,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        Authentication authentication
    ) {
        Page<MarketplaceListingResponse> response = marketplaceService.getListings(
            authentication.getName(),
            organizationId,
            sectionType,
            postType,
            status,
            category,
            query,
            minPrice,
            maxPrice,
            locationQuery,
            page,
            size
        );
        return ResponseEntity.ok(response);
    }

    @GetMapping("/listings/{listingId}")
    public ResponseEntity<MarketplaceListingResponse> getListing(
        @PathVariable UUID listingId,
        Authentication authentication
    ) {
        marketplaceService.incrementView(listingId);
        return ResponseEntity.ok(marketplaceService.getListingById(authentication.getName(), listingId));
    }

    @PatchMapping("/listings/{listingId}")
    public ResponseEntity<MarketplaceListingResponse> updateListing(
        @PathVariable UUID listingId,
        @Valid @RequestBody MarketplaceListingUpdateRequest request,
        Authentication authentication
    ) {
        return ResponseEntity.ok(marketplaceService.updateListing(authentication.getName(), listingId, request));
    }

    @PatchMapping("/listings/{listingId}/status")
    public ResponseEntity<MarketplaceListingResponse> updateListingStatus(
        @PathVariable UUID listingId,
        @RequestBody Map<String, String> request,
        Authentication authentication
    ) {
        String statusValue = request.get("status");
        if (statusValue == null || statusValue.isBlank()) {
            throw new RuntimeException("status is required");
        }
        MarketplaceListingStatus status = MarketplaceListingStatus.valueOf(statusValue.toUpperCase());
        return ResponseEntity.ok(marketplaceService.updateStatus(authentication.getName(), listingId, status));
    }

    @DeleteMapping("/listings/{listingId}")
    public ResponseEntity<Map<String, String>> deleteListing(
        @PathVariable UUID listingId,
        Authentication authentication
    ) {
        marketplaceService.deleteListing(authentication.getName(), listingId);
        return ResponseEntity.ok(Map.of("message", "Listing removed"));
    }

    @PostMapping("/listings/{listingId}/interest")
    public ResponseEntity<Map<String, Object>> expressInterest(
        @PathVariable UUID listingId,
        Authentication authentication
    ) {
        return ResponseEntity.ok(marketplaceService.expressInterest(authentication.getName(), listingId));
    }

    @PostMapping("/listings/{listingId}/message-seller")
    public ResponseEntity<Map<String, Object>> messageSeller(
        @PathVariable UUID listingId,
        Authentication authentication
    ) {
        return ResponseEntity.ok(marketplaceService.createOrOpenSellerMessage(authentication.getName(), listingId));
    }

    @PostMapping("/listings/{listingId}/report")
    public ResponseEntity<Map<String, String>> reportListing(
        @PathVariable UUID listingId,
        @RequestBody Map<String, String> request,
        Authentication authentication,
        HttpServletRequest httpServletRequest
    ) {
        String reason = request.getOrDefault("reason", "OTHER");
        String description = request.get("description");
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found with email: " + email));

        contentModerationService.reportContent(
            "MARKETPLACE",
            listingId,
            reason,
            description,
            user.getId(),
            httpServletRequest
        );

        return ResponseEntity.ok(Map.of("message", "Listing reported successfully"));
    }

    @GetMapping("/metrics")
    public ResponseEntity<MarketplaceMetricsResponse> getMarketplaceMetrics() {
        return ResponseEntity.ok(marketplaceService.getMetrics());
    }
}
