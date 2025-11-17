package com.churchapp.config;

import com.churchapp.service.MetricsSnapshotService;
import com.churchapp.service.OrganizationMetricsService;
import com.churchapp.service.StorageLimitService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled job to update organization metrics periodically.
 * Runs daily at 2:00 AM to calculate metrics for all organizations.
 * Creates historical snapshots at 2:30 AM.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MetricsScheduler {

    private final OrganizationMetricsService metricsService;
    private final StorageLimitService storageLimitService;
    private final MetricsSnapshotService metricsSnapshotService;

    /**
     * Update metrics for all organizations daily at 2:00 AM
     * Cron format: second, minute, hour, day, month, weekday
     * 0 0 2 * * * = Every day at 2:00 AM
     */
    @Scheduled(cron = "0 0 2 * * *")
    public void updateAllOrganizationMetrics() {
        log.info("Starting scheduled metrics update for all organizations");
        try {
            metricsService.updateAllOrganizationsMetrics();
            storageLimitService.evaluateStorageLimits();
            log.info("Scheduled metrics update completed successfully");
        } catch (Exception e) {
            log.error("Error during scheduled metrics update", e);
        }
    }

    /**
     * Create metrics snapshots for all organizations daily at 2:30 AM
     * Runs after metrics update to capture the latest data
     */
    @Scheduled(cron = "0 30 2 * * *")
    public void createDailyMetricsSnapshots() {
        log.info("Starting daily metrics snapshot creation for all organizations");
        try {
            metricsSnapshotService.createSnapshotsForAllOrganizations();
            log.info("Daily metrics snapshot creation completed successfully");
        } catch (Exception e) {
            log.error("Error during metrics snapshot creation", e);
        }
    }

    /**
     * Clean up old history records (keep last 365 days) - runs monthly on 1st at 3:00 AM
     */
    @Scheduled(cron = "0 0 3 1 * *")
    public void monthlyHistoryCleanup() {
        log.info("Starting monthly metrics history cleanup");
        try {
            metricsSnapshotService.cleanupOldHistory(365); // Keep last year
            log.info("Monthly metrics history cleanup completed successfully");
        } catch (Exception e) {
            log.error("Error during metrics history cleanup", e);
        }
    }
}

