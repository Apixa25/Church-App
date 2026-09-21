package com.churchapp.repository;

import com.churchapp.entity.Organization;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrganizationRepository extends JpaRepository<Organization, UUID> {

    // Find by slug - only non-deleted organizations
    @Query("SELECT o FROM Organization o WHERE o.slug = :slug AND o.deletedAt IS NULL")
    Optional<Organization> findBySlug(@Param("slug") String slug);
    
    // Find by slug including deleted (for admin purposes)
    @Query("SELECT o FROM Organization o WHERE o.slug = :slug")
    Optional<Organization> findBySlugIncludingDeleted(@Param("slug") String slug);

    // Check slug exists - only among non-deleted organizations
    @Query("SELECT CASE WHEN COUNT(o) > 0 THEN true ELSE false END FROM Organization o WHERE o.slug = :slug AND o.deletedAt IS NULL")
    boolean existsBySlug(@Param("slug") String slug);

    // Find active (non-deleted) organization by ID
    @Query("SELECT o FROM Organization o WHERE o.id = :id AND o.deletedAt IS NULL")
    Optional<Organization> findActiveById(@Param("id") UUID id);

    List<Organization> findByType(Organization.OrganizationType type);

    List<Organization> findByStatus(Organization.OrganizationStatus status);

    @Query("SELECT o FROM Organization o WHERE o.status = :status AND o.type = :type AND o.deletedAt IS NULL")
    List<Organization> findByStatusAndType(
        @Param("status") Organization.OrganizationStatus status,
        @Param("type") Organization.OrganizationType type
    );

    // Search organizations - only non-deleted
    @Query("SELECT o FROM Organization o WHERE " +
           "o.deletedAt IS NULL AND (" +
           "LOWER(o.name) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
           "OR LOWER(o.slug) LIKE LOWER(CONCAT('%', :searchTerm, '%')))")
    Page<Organization> searchOrganizations(@Param("searchTerm") String searchTerm, Pageable pageable);

    @Query("SELECT o FROM Organization o WHERE o.status = 'ACTIVE' AND o.deletedAt IS NULL " +
           "ORDER BY o.createdAt DESC")
    Page<Organization> findAllActiveOrganizations(Pageable pageable);

    @Query("SELECT COUNT(o) FROM Organization o WHERE o.status = 'ACTIVE' AND o.deletedAt IS NULL")
    Long countActiveOrganizations();

    // Get all non-deleted organizations (for admin - includes TRIAL, ACTIVE, SUSPENDED, CANCELLED)
    @Query("SELECT o FROM Organization o WHERE o.deletedAt IS NULL " +
           "ORDER BY o.createdAt DESC")
    Page<Organization> findAllNonDeletedOrganizations(Pageable pageable);

    @Query("SELECT o FROM Organization o WHERE o.parentOrganization.id = :parentId")
    List<Organization> findByParentOrganizationId(@Param("parentId") UUID parentId);

    @Query("SELECT o FROM Organization o WHERE " +
           "o.subscriptionExpiresAt IS NOT NULL AND " +
           "o.subscriptionExpiresAt < :expiryDate AND " +
           "o.status = 'ACTIVE'")
    List<Organization> findExpiringSubscriptions(@Param("expiryDate") LocalDateTime expiryDate);

    // Metadata-based queries (for tag filtering in cross-org groups)
    @Query(value = "SELECT * FROM organizations o WHERE " +
           "o.metadata @> CAST(:metadataJson AS jsonb)",
           nativeQuery = true)
    List<Organization> findByMetadataContains(@Param("metadataJson") String metadataJson);

    /**
     * Discover organizations within {@code radiusMiles} of a point.
     *
     * Standard "bounding box + Haversine" approach (no PostGIS required):
     * the bounding-box predicate lets PostgreSQL use idx_organizations_coordinates
     * to prune candidates cheaply, then the Haversine expression filters the
     * remaining rows to a true great-circle distance.
     *
     * Safety rules baked into the query:
     *  - FAMILY and GLOBAL organizations are never returned.
     *  - Only discoverable, non-deleted, ACTIVE/TRIAL organizations.
     *  - Optional denomination match (case-insensitive).
     *
     * @param typeNames   enum names of allowed organization types (e.g. ["CHURCH"])
     * @param denomination optional denomination filter; pass null for any
     */
    @Query(value =
        "SELECT o.* FROM organizations o " +
        "WHERE o.deleted_at IS NULL " +
        "  AND o.discoverable = TRUE " +
        "  AND o.status IN ('ACTIVE', 'TRIAL') " +
        "  AND o.type NOT IN ('FAMILY', 'GLOBAL') " +
        "  AND o.type IN (:typeNames) " +
        "  AND o.latitude IS NOT NULL AND o.longitude IS NOT NULL " +
        "  AND (CAST(:denomination AS text) IS NULL OR LOWER(o.denomination) = LOWER(CAST(:denomination AS text))) " +
        // Explicit double-precision casts keep the arithmetic in floating point on every
        // database (H2 otherwise infers DECFLOAT for untyped parameters and overflows on division).
        "  AND CAST(o.latitude AS double precision) BETWEEN " +
        "        (CAST(:lat AS double precision) - (CAST(:radiusMiles AS double precision) / 69.0e0)) " +
        "    AND (CAST(:lat AS double precision) + (CAST(:radiusMiles AS double precision) / 69.0e0)) " +
        "  AND CAST(o.longitude AS double precision) BETWEEN " +
        "        (CAST(:lng AS double precision) - (CAST(:radiusMiles AS double precision) / (69.0e0 * COS(RADIANS(CAST(:lat AS double precision)))))) " +
        "    AND (CAST(:lng AS double precision) + (CAST(:radiusMiles AS double precision) / (69.0e0 * COS(RADIANS(CAST(:lat AS double precision)))))) " +
        "  AND (3958.8e0 * ACOS(LEAST(1.0e0, GREATEST(-1.0e0, " +
        "        COS(RADIANS(CAST(:lat AS double precision))) * COS(RADIANS(CAST(o.latitude AS double precision))) " +
        "          * COS(RADIANS(CAST(o.longitude AS double precision)) - RADIANS(CAST(:lng AS double precision))) " +
        "      + SIN(RADIANS(CAST(:lat AS double precision))) * SIN(RADIANS(CAST(o.latitude AS double precision))))))) " +
        "      <= CAST(:radiusMiles AS double precision) " +
        "ORDER BY (3958.8e0 * ACOS(LEAST(1.0e0, GREATEST(-1.0e0, " +
        "        COS(RADIANS(CAST(:lat AS double precision))) * COS(RADIANS(CAST(o.latitude AS double precision))) " +
        "          * COS(RADIANS(CAST(o.longitude AS double precision)) - RADIANS(CAST(:lng AS double precision))) " +
        "      + SIN(RADIANS(CAST(:lat AS double precision))) * SIN(RADIANS(CAST(o.latitude AS double precision))))))) ASC " +
        "LIMIT 200",
        nativeQuery = true)
    List<Organization> findNearby(
        @Param("lat") double lat,
        @Param("lng") double lng,
        @Param("radiusMiles") double radiusMiles,
        @Param("typeNames") List<String> typeNames,
        @Param("denomination") String denomination
    );

    /**
     * Discoverable organizations filtered by type and (optionally) denomination, with no location
     * constraint - backs natural-language searches like "Lutheran churches" that name no place.
     * Same safety rules as {@link #findNearby}: never FAMILY/GLOBAL, only discoverable ACTIVE/TRIAL.
     */
    @Query(value =
        "SELECT o.* FROM organizations o " +
        "WHERE o.deleted_at IS NULL " +
        "  AND o.discoverable = TRUE " +
        "  AND o.status IN ('ACTIVE', 'TRIAL') " +
        "  AND o.type NOT IN ('FAMILY', 'GLOBAL') " +
        "  AND o.type IN (:typeNames) " +
        "  AND (CAST(:denomination AS text) IS NULL OR LOWER(o.denomination) = LOWER(CAST(:denomination AS text))) " +
        "ORDER BY o.name ASC " +
        "LIMIT 100",
        nativeQuery = true)
    List<Organization> findDiscoverableByTypes(
        @Param("typeNames") List<String> typeNames,
        @Param("denomination") String denomination
    );

    /** Distinct denominations currently in use (for parser hints and admin dropdown). */
    @Query(value = "SELECT DISTINCT o.denomination FROM organizations o " +
           "WHERE o.denomination IS NOT NULL AND o.deleted_at IS NULL ORDER BY o.denomination",
           nativeQuery = true)
    List<String> findDistinctDenominations();
}
