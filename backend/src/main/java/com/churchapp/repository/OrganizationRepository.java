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

    Optional<Organization> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<Organization> findByType(Organization.OrganizationType type);

    List<Organization> findByStatus(Organization.OrganizationStatus status);

    @Query("SELECT o FROM Organization o WHERE o.status = :status AND o.type = :type")
    List<Organization> findByStatusAndType(
        @Param("status") Organization.OrganizationStatus status,
        @Param("type") Organization.OrganizationType type
    );

    @Query("SELECT o FROM Organization o WHERE " +
           "LOWER(o.name) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
           "OR LOWER(o.slug) LIKE LOWER(CONCAT('%', :searchTerm, '%'))")
    Page<Organization> searchOrganizations(@Param("searchTerm") String searchTerm, Pageable pageable);

    @Query("SELECT o FROM Organization o WHERE o.status = 'ACTIVE' AND o.deletedAt IS NULL " +
           "ORDER BY o.createdAt DESC")
    Page<Organization> findAllActiveOrganizations(Pageable pageable);

    @Query("SELECT COUNT(o) FROM Organization o WHERE o.status = 'ACTIVE' AND o.deletedAt IS NULL")
    Long countActiveOrganizations();

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
