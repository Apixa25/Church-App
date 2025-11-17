package com.churchapp.service;

import com.churchapp.entity.Organization;
import com.churchapp.entity.OrganizationMetrics;
import com.churchapp.entity.OrganizationMetricsHistory;
import com.churchapp.repository.OrganizationMetricsHistoryRepository;
import com.churchapp.repository.OrganizationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Service for creating and managing historical metrics snapshots.
 * Stores daily snapshots of organization metrics for trending and analytics.
 */
@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class MetricsSnapshotService {

    private final OrganizationMetricsHistoryRepository historyRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMetricsService metricsService;

    /**
     * Create a snapshot of current metrics for an organization
     */
    public OrganizationMetricsHistory createSnapshot(UUID organizationId) {
        log.debug("Creating metrics snapshot for organization: {}", organizationId);

        Organization org = organizationRepository.findById(organizationId)
            .orElseThrow(() -> new RuntimeException("Organization not found: " + organizationId));

        // Get current metrics (will calculate if not exists)
        OrganizationMetrics currentMetrics = metricsService.getMetrics(organizationId);

        // Create history record
        OrganizationMetricsHistory history = OrganizationMetricsHistory.fromMetrics(currentMetrics);
        history.setOrganization(org);
        history.setRecordedAt(LocalDateTime.now());

        OrganizationMetricsHistory saved = historyRepository.save(history);
        log.info("Created metrics snapshot for organization {} at {}", organizationId, saved.getRecordedAt());

        return saved;
    }

    /**
     * Create snapshots for all active organizations
     * Called by scheduled job
     */
    public void createSnapshotsForAllOrganizations() {
        log.info("Starting metrics snapshot creation for all organizations");

        List<Organization> organizations = organizationRepository.findAll();
        int successCount = 0;
        int errorCount = 0;

        for (Organization org : organizations) {
            // Skip deleted organizations
            if (org.getDeletedAt() != null) {
                continue;
            }

            try {
                createSnapshot(org.getId());
                successCount++;
            } catch (Exception e) {
                log.error("Error creating snapshot for organization {}: {}", org.getId(), e.getMessage(), e);
                errorCount++;
            }
        }

        log.info("Completed metrics snapshot creation: {} successful, {} errors", successCount, errorCount);
    }

    /**
     * Get historical metrics for an organization
     */
    @Transactional(readOnly = true)
    public List<OrganizationMetricsHistory> getHistory(UUID organizationId) {
        return historyRepository.findByOrganizationIdOrderByRecordedAtDesc(organizationId);
    }

    /**
     * Get historical metrics for an organization within a date range
     */
    @Transactional(readOnly = true)
    public List<OrganizationMetricsHistory> getHistoryInRange(
            UUID organizationId,
            LocalDateTime startDate,
            LocalDateTime endDate) {
        return historyRepository.findByOrganizationIdAndDateRange(organizationId, startDate, endDate);
    }

    /**
     * Get historical metrics for the last N days
     */
    @Transactional(readOnly = true)
    public List<OrganizationMetricsHistory> getHistoryForLastDays(UUID organizationId, int days) {
        LocalDateTime since = LocalDateTime.now().minusDays(days);
        return historyRepository.findByOrganizationIdSince(organizationId, since);
    }

    /**
     * Get the most recent snapshot for an organization
     */
    @Transactional(readOnly = true)
    public OrganizationMetricsHistory getLatestSnapshot(UUID organizationId) {
        return historyRepository.findLatestByOrganizationId(organizationId);
    }

    /**
     * Clean up old history records (keep last N days)
     * Can be called by a scheduled maintenance job
     */
    public void cleanupOldHistory(int keepDays) {
        log.info("Cleaning up metrics history older than {} days", keepDays);

        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(keepDays);
        historyRepository.deleteByRecordedAtBefore(cutoffDate);

        log.info("Cleanup completed");
    }
}

