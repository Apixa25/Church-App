package com.churchapp.dto;

import com.churchapp.entity.MarketplaceListingStatus;
import com.churchapp.entity.MarketplacePostType;
import com.churchapp.entity.MarketplaceSectionType;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class MarketplaceListingUpdateRequest {
    private MarketplaceSectionType sectionType;
    private MarketplacePostType postType;

    @Size(max = 140)
    private String title;

    @Size(max = 5000)
    private String description;

    @Size(max = 80)
    private String category;

    @Size(max = 40)
    private String itemCondition;

    private BigDecimal priceAmount;

    @Size(max = 3)
    private String currency;

    @Size(max = 255)
    private String locationLabel;

    private Integer distanceRadiusKm;

    private List<String> imageUrls;

    private MarketplaceListingStatus status;

    private LocalDateTime expiresAt;
}
