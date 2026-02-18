package com.churchapp.repository;

import com.churchapp.entity.MarketplaceListingInterest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface MarketplaceListingInterestRepository extends JpaRepository<MarketplaceListingInterest, UUID> {

    boolean existsByListing_IdAndUser_Id(UUID listingId, UUID userId);

    long countByListing_Id(UUID listingId);

    @Query("SELECT COUNT(i) FROM MarketplaceListingInterest i WHERE i.listing.owner.id = :ownerUserId")
    long countInterestsReceivedByOwner(@Param("ownerUserId") UUID ownerUserId);
}
