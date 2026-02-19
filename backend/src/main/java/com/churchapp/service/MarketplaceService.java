package com.churchapp.service;

import com.churchapp.dto.MarketplaceListingRequest;
import com.churchapp.dto.MarketplaceListingResponse;
import com.churchapp.dto.MarketplaceListingUpdateRequest;
import com.churchapp.dto.MarketplaceMetricsResponse;
import com.churchapp.entity.*;
import com.churchapp.repository.MarketplaceListingInterestRepository;
import com.churchapp.repository.MarketplaceListingRepository;
import com.churchapp.repository.OrganizationRepository;
import com.churchapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class MarketplaceService {

    private static final UUID GLOBAL_ORG_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    private final MarketplaceListingRepository marketplaceListingRepository;
    private final MarketplaceListingInterestRepository marketplaceListingInterestRepository;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final UserBlockService userBlockService;
    private final ChatService chatService;

    public MarketplaceListingResponse createListing(String userEmail, MarketplaceListingRequest request) {
        log.info("Marketplace createListing start: userEmail={}, sectionType={}, postType={}, title={}, organizationId={}",
            userEmail, request.getSectionType(), request.getPostType(), request.getTitle(), request.getOrganizationId());
        User user = getUserByEmail(userEmail);
        Organization org = resolveOrganizationContext(request.getOrganizationId(), user);

        validatePricingRules(request.getSectionType(), request.getPriceAmount());

        MarketplaceListing listing = new MarketplaceListing();
        listing.setOwner(user);
        listing.setOrganization(org);
        listing.setSectionType(request.getSectionType());
        listing.setPostType(request.getPostType());
        listing.setTitle(request.getTitle().trim());
        listing.setDescription(safeTrim(request.getDescription()));
        listing.setCategory(safeTrim(request.getCategory()));
        listing.setItemCondition(safeTrim(request.getItemCondition()));
        listing.setPriceAmount(normalizePrice(request.getPriceAmount()));
        listing.setCurrency((request.getCurrency() == null || request.getCurrency().isBlank()) ? "USD" : request.getCurrency().toUpperCase());
        listing.setLocationLabel(safeTrim(request.getLocationLabel()));
        listing.setDistanceRadiusKm(request.getDistanceRadiusKm());
        listing.setImageUrls(normalizeImageUrls(request.getImageUrls()));
        listing.setExpiresAt(request.getExpiresAt());
        listing.setStatus(MarketplaceListingStatus.ACTIVE);
        listing.setIsDeleted(false);
        listing.setIsFlagged(false);

        MarketplaceListing saved = marketplaceListingRepository.save(listing);
        log.info("Marketplace createListing success: listingId={}, sectionType={}, ownerUserId={}",
            saved.getId(), saved.getSectionType(), user.getId());
        return toResponse(saved, user.getId(), 0.0d);
    }

    @Transactional(readOnly = true)
    public MarketplaceListingResponse getListingById(String userEmail, UUID listingId) {
        User viewer = getUserByEmail(userEmail);
        MarketplaceListing listing = marketplaceListingRepository.findByIdAndIsDeletedFalse(listingId)
            .orElseThrow(() -> new RuntimeException("Marketplace listing not found"));

        if (isBlockedForViewer(viewer.getId(), listing.getOwner().getId())) {
            throw new RuntimeException("Marketplace listing not available");
        }

        return toResponse(listing, viewer.getId(), calculateRankingScore(listing, null));
    }

    public MarketplaceListingResponse updateListing(String userEmail, UUID listingId, MarketplaceListingUpdateRequest request) {
        User user = getUserByEmail(userEmail);
        MarketplaceListing listing = marketplaceListingRepository.findByIdAndIsDeletedFalse(listingId)
            .orElseThrow(() -> new RuntimeException("Marketplace listing not found"));

        ensureOwnerOrPlatformAdmin(user, listing);

        if (request.getSectionType() != null) {
            listing.setSectionType(request.getSectionType());
        }
        if (request.getPostType() != null) {
            listing.setPostType(request.getPostType());
        }
        if (request.getTitle() != null && !request.getTitle().trim().isEmpty()) {
            listing.setTitle(request.getTitle().trim());
        }
        if (request.getDescription() != null) {
            listing.setDescription(safeTrim(request.getDescription()));
        }
        if (request.getCategory() != null) {
            listing.setCategory(safeTrim(request.getCategory()));
        }
        if (request.getItemCondition() != null) {
            listing.setItemCondition(safeTrim(request.getItemCondition()));
        }
        if (request.getPriceAmount() != null) {
            listing.setPriceAmount(normalizePrice(request.getPriceAmount()));
        }
        if (request.getCurrency() != null && !request.getCurrency().isBlank()) {
            listing.setCurrency(request.getCurrency().toUpperCase());
        }
        if (request.getLocationLabel() != null) {
            listing.setLocationLabel(safeTrim(request.getLocationLabel()));
        }
        if (request.getDistanceRadiusKm() != null) {
            listing.setDistanceRadiusKm(request.getDistanceRadiusKm());
        }
        if (request.getImageUrls() != null) {
            listing.setImageUrls(normalizeImageUrls(request.getImageUrls()));
        }
        if (request.getExpiresAt() != null) {
            listing.setExpiresAt(request.getExpiresAt());
        }
        if (request.getStatus() != null) {
            listing.setStatus(request.getStatus());
            if (request.getStatus() == MarketplaceListingStatus.COMPLETED) {
                listing.setCompletedAt(LocalDateTime.now());
            }
        }

        validatePricingRules(listing.getSectionType(), listing.getPriceAmount());

        MarketplaceListing saved = marketplaceListingRepository.save(listing);
        return toResponse(saved, user.getId(), calculateRankingScore(saved, null));
    }

    public MarketplaceListingResponse updateStatus(String userEmail, UUID listingId, MarketplaceListingStatus status) {
        User user = getUserByEmail(userEmail);
        MarketplaceListing listing = marketplaceListingRepository.findByIdAndIsDeletedFalse(listingId)
            .orElseThrow(() -> new RuntimeException("Marketplace listing not found"));

        ensureOwnerOrPlatformAdmin(user, listing);
        listing.setStatus(status);
        if (status == MarketplaceListingStatus.COMPLETED) {
            listing.setCompletedAt(LocalDateTime.now());
        }
        MarketplaceListing saved = marketplaceListingRepository.save(listing);
        return toResponse(saved, user.getId(), calculateRankingScore(saved, null));
    }

    public void deleteListing(String userEmail, UUID listingId) {
        User user = getUserByEmail(userEmail);
        MarketplaceListing listing = marketplaceListingRepository.findByIdAndIsDeletedFalse(listingId)
            .orElseThrow(() -> new RuntimeException("Marketplace listing not found"));

        ensureOwnerOrPlatformAdmin(user, listing);
        listing.setIsDeleted(true);
        listing.setStatus(MarketplaceListingStatus.REMOVED);
        marketplaceListingRepository.save(listing);
    }

    public Map<String, Object> expressInterest(String userEmail, UUID listingId) {
        User user = getUserByEmail(userEmail);
        MarketplaceListing listing = marketplaceListingRepository.findByIdAndIsDeletedFalse(listingId)
            .orElseThrow(() -> new RuntimeException("Marketplace listing not found"));

        if (listing.getOwner().getId().equals(user.getId())) {
            throw new RuntimeException("You cannot express interest in your own listing");
        }
        if (listing.getStatus() != MarketplaceListingStatus.ACTIVE && listing.getStatus() != MarketplaceListingStatus.RESERVED) {
            throw new RuntimeException("Listing is not currently available");
        }
        if (marketplaceListingInterestRepository.existsByListing_IdAndUser_Id(listingId, user.getId())) {
            return Map.of(
                "message", "You already expressed interest in this listing",
                "interestCount", listing.getInterestCount() == null ? 0 : listing.getInterestCount()
            );
        }

        MarketplaceListingInterest interest = new MarketplaceListingInterest();
        interest.setListing(listing);
        interest.setUser(user);
        marketplaceListingInterestRepository.save(interest);

        long interestCount = marketplaceListingInterestRepository.countByListing_Id(listingId);
        listing.setInterestCount((int) interestCount);
        marketplaceListingRepository.save(listing);

        return Map.of(
            "message", "Interest sent successfully",
            "interestCount", interestCount
        );
    }

    public Map<String, Object> createOrOpenSellerMessage(String userEmail, UUID listingId) {
        User user = getUserByEmail(userEmail);
        MarketplaceListing listing = marketplaceListingRepository.findByIdAndIsDeletedFalse(listingId)
            .orElseThrow(() -> new RuntimeException("Marketplace listing not found"));

        if (listing.getOwner().getId().equals(user.getId())) {
            throw new RuntimeException("Use your listing controls instead of messaging yourself");
        }

        com.churchapp.dto.ChatGroupResponse dmGroup = chatService.createOrGetDirectMessage(userEmail, listing.getOwner().getEmail());
        listing.setMessageCount((listing.getMessageCount() == null ? 0 : listing.getMessageCount()) + 1);
        marketplaceListingRepository.save(listing);

        return Map.of(
            "chatGroupId", dmGroup.getId(),
            "chatGroupName", dmGroup.getName(),
            "targetUserId", listing.getOwner().getId(),
            "targetUserEmail", listing.getOwner().getEmail()
        );
    }

    public void incrementView(UUID listingId) {
        marketplaceListingRepository.incrementViewCount(listingId);
    }

    @Transactional(readOnly = true)
    public Page<MarketplaceListingResponse> getListings(
        String userEmail,
        UUID organizationId,
        MarketplaceSectionType sectionType,
        MarketplacePostType postType,
        MarketplaceListingStatus status,
        String category,
        String query,
        BigDecimal minPrice,
        BigDecimal maxPrice,
        String locationQuery,
        int page,
        int size
    ) {
        log.info("Marketplace getListings start: userEmail={}, organizationId={}, sectionType={}, postType={}, status={}, category={}, query={}, minPrice={}, maxPrice={}, page={}, size={}",
            userEmail, organizationId, sectionType, postType, status, category, query, minPrice, maxPrice, page, size);
        User viewer = getUserByEmail(userEmail);
        List<UUID> blockedUserIds = userBlockService.getMutuallyBlockedUserIds(viewer.getId());
        boolean excludeBlocked = blockedUserIds != null && !blockedUserIds.isEmpty();
        if (!excludeBlocked) {
            blockedUserIds = List.of(UUID.randomUUID());
        }

        MarketplaceListingStatus effectiveStatus = status != null ? status : MarketplaceListingStatus.ACTIVE;
        String normalizedCategory = normalizeFilterForCaseInsensitiveMatch(category);
        String normalizedQuery = normalizeFilterForCaseInsensitiveMatch(query);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<MarketplaceListing> listings = marketplaceListingRepository.searchListings(
            organizationId,
            sectionType,
            postType,
            effectiveStatus,
            normalizedCategory,
            normalizedQuery,
            minPrice,
            maxPrice,
            excludeBlocked,
            blockedUserIds,
            pageable
        );

        List<MarketplaceListingResponse> responses = listings.getContent().stream()
            .map(listing -> toResponse(listing, viewer.getId(), calculateRankingScore(listing, locationQuery)))
            .sorted(Comparator.comparing(MarketplaceListingResponse::getRankingScore, Comparator.nullsLast(Double::compareTo)).reversed())
            .toList();

        log.info("Marketplace getListings success: resultCount={}, totalElements={}, requestedPage={}",
            responses.size(), listings.getTotalElements(), page);
        return new PageImpl<>(responses, pageable, listings.getTotalElements());
    }

    @Transactional(readOnly = true)
    public MarketplaceMetricsResponse getMetrics() {
        long total = marketplaceListingRepository.countActiveUniverse();
        long active = marketplaceListingRepository.countByStatusAndNotDeleted(MarketplaceListingStatus.ACTIVE);
        long completed = marketplaceListingRepository.countByStatusAndNotDeleted(MarketplaceListingStatus.COMPLETED);
        long donation = marketplaceListingRepository.countBySectionAndNotDeleted(MarketplaceSectionType.DONATION);
        long sharing = marketplaceListingRepository.countBySectionAndNotDeleted(MarketplaceSectionType.SHARING);
        long forSale = marketplaceListingRepository.countBySectionAndNotDeleted(MarketplaceSectionType.FOR_SALE);
        Double avgInterest = marketplaceListingRepository.averageInterestCount();
        double completionRate = total == 0 ? 0.0 : (completed * 100.0) / total;

        return MarketplaceMetricsResponse.builder()
            .totalListings(total)
            .activeListings(active)
            .completedListings(completed)
            .donationListings(donation)
            .sharingListings(sharing)
            .forSaleListings(forSale)
            .completionRate(roundToTwoDecimals(completionRate))
            .avgInterestPerListing(roundToTwoDecimals(avgInterest == null ? 0.0 : avgInterest))
            .build();
    }

    private Organization resolveOrganizationContext(UUID requestedOrganizationId, User user) {
        if (requestedOrganizationId != null) {
            return organizationRepository.findById(requestedOrganizationId)
                .orElseThrow(() -> new RuntimeException("Organization not found"));
        }
        if (user.getChurchPrimaryOrganization() != null) {
            return user.getChurchPrimaryOrganization();
        }
        return organizationRepository.findById(GLOBAL_ORG_ID)
            .orElseThrow(() -> new RuntimeException("Global organization not found"));
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private void ensureOwnerOrPlatformAdmin(User user, MarketplaceListing listing) {
        boolean isOwner = listing.getOwner().getId().equals(user.getId());
        boolean isPlatformAdmin = user.getRole() == User.Role.PLATFORM_ADMIN;
        if (!isOwner && !isPlatformAdmin) {
            throw new RuntimeException("You do not have permission to modify this listing");
        }
    }

    private void validatePricingRules(MarketplaceSectionType sectionType, BigDecimal priceAmount) {
        if (sectionType == MarketplaceSectionType.FOR_SALE) {
            if (priceAmount == null || priceAmount.compareTo(BigDecimal.ZERO) <= 0) {
                throw new RuntimeException("For Sale listings must include a price greater than 0");
            }
            return;
        }
        if (priceAmount != null && priceAmount.compareTo(BigDecimal.ZERO) > 0) {
            throw new RuntimeException("Donation and Sharing listings cannot include a price in this release");
        }
    }

    private List<String> normalizeImageUrls(List<String> imageUrls) {
        if (imageUrls == null) {
            return new ArrayList<>();
        }
        return imageUrls.stream()
            .filter(Objects::nonNull)
            .map(String::trim)
            .filter(url -> !url.isBlank())
            .toList();
    }

    private BigDecimal normalizePrice(BigDecimal amount) {
        if (amount == null) {
            return null;
        }
        return amount.setScale(2, java.math.RoundingMode.HALF_UP);
    }

    private String safeTrim(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeFilterForCaseInsensitiveMatch(String value) {
        String trimmed = safeTrim(value);
        return trimmed == null ? "" : trimmed.toLowerCase(Locale.ROOT);
    }

    private boolean isBlockedForViewer(UUID viewerId, UUID ownerId) {
        List<UUID> blockedUserIds = userBlockService.getMutuallyBlockedUserIds(viewerId);
        return blockedUserIds != null && blockedUserIds.contains(ownerId);
    }

    private MarketplaceListingResponse toResponse(MarketplaceListing listing, UUID viewerId, Double score) {
        User owner = listing.getOwner();
        Organization organization = listing.getOrganization();
        return MarketplaceListingResponse.builder()
            .id(listing.getId())
            .ownerUserId(owner.getId())
            .ownerName(owner.getName())
            .ownerProfilePicUrl(owner.getProfilePicUrl())
            .ownerHeartsCount(owner.getHeartsCount())
            .ownerWarningCount(owner.getWarningCount())
            .organizationId(organization.getId())
            .organizationName(organization.getName())
            .sectionType(listing.getSectionType())
            .postType(listing.getPostType())
            .status(listing.getStatus())
            .title(listing.getTitle())
            .description(listing.getDescription())
            .category(listing.getCategory())
            .itemCondition(listing.getItemCondition())
            .priceAmount(listing.getPriceAmount())
            .currency(listing.getCurrency())
            .locationLabel(listing.getLocationLabel())
            .distanceRadiusKm(listing.getDistanceRadiusKm())
            .imageUrls(listing.getImageUrls() == null ? List.of() : listing.getImageUrls())
            .viewCount(listing.getViewCount())
            .interestCount(listing.getInterestCount())
            .messageCount(listing.getMessageCount())
            .rankingScore(roundToTwoDecimals(score == null ? 0.0 : score))
            .isOwner(owner.getId().equals(viewerId))
            .expiresAt(listing.getExpiresAt())
            .completedAt(listing.getCompletedAt())
            .createdAt(listing.getCreatedAt())
            .updatedAt(listing.getUpdatedAt())
            .build();
    }

    private double calculateRankingScore(MarketplaceListing listing, String locationQuery) {
        double score = 0.0;

        // Recency: newer listings rank higher (max ~50 points)
        if (listing.getCreatedAt() != null) {
            long hoursOld = Math.max(1, Duration.between(listing.getCreatedAt(), LocalDateTime.now()).toHours());
            score += Math.max(0, 50 - Math.min(50, hoursOld / 4.0));
        }

        // Engagement signals
        score += Math.min(20, (listing.getInterestCount() == null ? 0 : listing.getInterestCount()) * 2.0);
        score += Math.min(10, (listing.getMessageCount() == null ? 0 : listing.getMessageCount()) * 1.5);
        score += Math.min(10, (listing.getViewCount() == null ? 0 : listing.getViewCount()) / 5.0);

        // Trust: reward healthier profiles
        User owner = listing.getOwner();
        if (owner != null) {
            score += Math.min(8, (owner.getHeartsCount() == null ? 0 : owner.getHeartsCount()) / 10.0);
            score -= Math.min(8, owner.getWarningCount() * 2.0);
        }

        // Simple location relevance signal
        if (locationQuery != null && !locationQuery.isBlank()
            && listing.getLocationLabel() != null
            && listing.getLocationLabel().toLowerCase().contains(locationQuery.toLowerCase())) {
            score += 5.0;
        }

        // Keep score non-negative
        return Math.max(0.0, score);
    }

    private double roundToTwoDecimals(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
