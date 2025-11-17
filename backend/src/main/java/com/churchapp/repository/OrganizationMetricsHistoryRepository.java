package com.churchapp.repository;

import com.churchapp.entity.OrganizationMetricsHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface OrganizationMetricsHistoryRepository extends JpaRepository<OrganizationMetricsHistory, UUID> {

    /**
     * Find all history records for an organization, ordered by recorded date (newest first)
     */
    @Query("SELECT h FROM OrganizationMetricsHistory h WHERE h.organization.id = :orgId ORDER BY h.recordedAt DESC")
    List<OrganizationMetricsHistory> findByOrganizationIdOrderByRecordedAtDesc(@Param("orgId") UUID orgId);

    /**
     * Find history records for an organization within a date range
     */
    @Query("SELECT h FROM OrganizationMetricsHistory h WHERE " +
           "h.organization.id = :orgId AND " +
           "h.recordedAt >= :startDate AND h.recordedAt <= :endDate " +
           "ORDER BY h.recordedAt ASC")
    List<OrganizationMetricsHistory> findByOrganizationIdAndDateRange(
        @Param("orgId") UUID orgId,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );

    /**
     * Find the most recent snapshot for an organization
     */
    @Query(value = "SELECT * FROM organization_metrics_history WHERE organization_id = :orgId ORDER BY recorded_at DESC LIMIT 1", nativeQuery = true)
    OrganizationMetricsHistory findLatestByOrganizationId(@Param("orgId") UUID orgId);

    /**
     * Find history records across all organizations since a date
     */
    @Query("SELECT h FROM OrganizationMetricsHistory h WHERE h.recordedAt >= :since ORDER BY h.recordedAt ASC")
    List<OrganizationMetricsHistory> findByRecordedAtAfter(@Param("since") LocalDateTime since);

    /**
     * Find history records for the last N days
     */
    @Query("SELECT h FROM OrganizationMetricsHistory h WHERE " +
           "h.organization.id = :orgId AND " +
           "h.recordedAt >= :since " +
           "ORDER BY h.recordedAt ASC")
    List<OrganizationMetricsHistory> findByOrganizationIdSince(
        @Param("orgId") UUID orgId,
        @Param("since") LocalDateTime since
    );

    /**
     * Count history records for an organization
     */
    long countByOrganizationId(UUID organizationId);

    /**
     * Delete old history records (for cleanup/maintenance)
     */
    @Modifying
    @Transactional
    @Query("DELETE FROM OrganizationMetricsHistory h WHERE h.recordedAt < :beforeDate")
    void deleteByRecordedAtBefore(@Param("beforeDate") LocalDateTime beforeDate);
}

