package com.churchapp.repository;

import com.churchapp.entity.OrganizationMetrics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrganizationMetricsRepository extends JpaRepository<OrganizationMetrics, UUID> {

    Optional<OrganizationMetrics> findByOrganizationId(UUID organizationId);

    @Query("SELECT m FROM OrganizationMetrics m WHERE m.organization.id = :orgId")
    Optional<OrganizationMetrics> findByOrganization(@Param("orgId") UUID orgId);

    boolean existsByOrganizationId(UUID organizationId);
}

