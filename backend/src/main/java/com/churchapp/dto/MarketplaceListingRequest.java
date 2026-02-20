package com.churchapp.dto;

import com.churchapp.entity.MarketplacePostType;
import com.churchapp.entity.MarketplaceSectionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class MarketplaceListingRequest {

    @NotNull
    private MarketplaceSectionType sectionType;

    @NotNull
    private MarketplacePostType postType;

    @NotBlank
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

    private BigDecimal latitude;

    private BigDecimal longitude;

    @Size(max = 30)
    private String locationSource;

    @Size(max = 50)
    private String geocodeStatus;

    private List<String> imageUrls;

    private LocalDateTime expiresAt;

    private UUID organizationId;
}
