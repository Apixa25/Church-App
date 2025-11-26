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
}
