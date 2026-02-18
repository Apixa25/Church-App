package com.churchapp.repository;

import com.churchapp.entity.MarketplaceListing;
import com.churchapp.entity.MarketplaceListingStatus;
import com.churchapp.entity.MarketplacePostType;
import com.churchapp.entity.MarketplaceSectionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MarketplaceListingRepository extends JpaRepository<MarketplaceListing, UUID> {

    Optional<MarketplaceListing> findByIdAndIsDeletedFalse(UUID id);

    @Query("""
        SELECT l
        FROM MarketplaceListing l
        WHERE l.isDeleted = false
          AND (:organizationId IS NULL OR l.organization.id = :organizationId)
          AND (:sectionType IS NULL OR l.sectionType = :sectionType)
          AND (:postType IS NULL OR l.postType = :postType)
          AND (:status IS NULL OR l.status = :status)
          AND (:category IS NULL OR LOWER(l.category) = LOWER(:category))
          AND (:query IS NULL
              OR LOWER(l.title) LIKE LOWER(CONCAT('%', :query, '%'))
              OR LOWER(COALESCE(l.description, '')) LIKE LOWER(CONCAT('%', :query, '%'))
              OR LOWER(COALESCE(l.locationLabel, '')) LIKE LOWER(CONCAT('%', :query, '%')))
          AND (:minPrice IS NULL OR l.priceAmount >= :minPrice)
          AND (:maxPrice IS NULL OR l.priceAmount <= :maxPrice)
          AND (:excludeBlocked = false OR l.owner.id NOT IN :blockedUserIds)
    """)
    Page<MarketplaceListing> searchListings(
        @Param("organizationId") UUID organizationId,
        @Param("sectionType") MarketplaceSectionType sectionType,
        @Param("postType") MarketplacePostType postType,
        @Param("status") MarketplaceListingStatus status,
        @Param("category") String category,
        @Param("query") String query,
        @Param("minPrice") BigDecimal minPrice,
        @Param("maxPrice") BigDecimal maxPrice,
        @Param("excludeBlocked") boolean excludeBlocked,
        @Param("blockedUserIds") List<UUID> blockedUserIds,
        Pageable pageable
    );

    @Query("SELECT COUNT(l) FROM MarketplaceListing l WHERE l.isDeleted = false AND l.status = :status")
    long countByStatusAndNotDeleted(@Param("status") MarketplaceListingStatus status);

    @Query("SELECT COUNT(l) FROM MarketplaceListing l WHERE l.isDeleted = false")
    long countActiveUniverse();

    @Query("SELECT COUNT(l) FROM MarketplaceListing l WHERE l.isDeleted = false AND l.sectionType = :sectionType")
    long countBySectionAndNotDeleted(@Param("sectionType") MarketplaceSectionType sectionType);

    @Query("SELECT AVG(l.interestCount) FROM MarketplaceListing l WHERE l.isDeleted = false")
    Double averageInterestCount();

    @Modifying
    @Query("UPDATE MarketplaceListing l SET l.viewCount = l.viewCount + 1 WHERE l.id = :listingId")
    int incrementViewCount(@Param("listingId") UUID listingId);
}
