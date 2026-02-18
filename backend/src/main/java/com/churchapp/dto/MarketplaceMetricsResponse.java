package com.churchapp.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MarketplaceMetricsResponse {
    private long totalListings;
    private long activeListings;
    private long completedListings;
    private long donationListings;
    private long sharingListings;
    private long forSaleListings;
    private double completionRate;
    private double avgInterestPerListing;
}
