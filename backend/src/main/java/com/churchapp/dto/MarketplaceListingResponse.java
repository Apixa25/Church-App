package com.churchapp.dto;

import com.churchapp.entity.MarketplaceListingStatus;
import com.churchapp.entity.MarketplacePostType;
import com.churchapp.entity.MarketplaceSectionType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class MarketplaceListingResponse {
    private UUID id;
    private UUID ownerUserId;
    private String ownerName;
    private String ownerProfilePicUrl;
    private Integer ownerHeartsCount;
    private Integer ownerWarningCount;
    private UUID organizationId;
    private String organizationName;

    private MarketplaceSectionType sectionType;
    private MarketplacePostType postType;
    private MarketplaceListingStatus status;

    private String title;
    private String description;
    private String category;
    private String itemCondition;
    private BigDecimal priceAmount;
    private String currency;
    private String locationLabel;
    private Integer distanceRadiusKm;
    private List<String> imageUrls;

    private Integer viewCount;
    private Integer interestCount;
    private Integer messageCount;
    private Double rankingScore;
    private boolean isOwner;

    private LocalDateTime expiresAt;
    private LocalDateTime completedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
