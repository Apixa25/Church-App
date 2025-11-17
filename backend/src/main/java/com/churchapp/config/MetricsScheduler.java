package com.churchapp.config;

import com.churchapp.service.OrganizationMetricsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled job to update organization metrics periodically.
 * Runs daily at 2:00 AM to calculate metrics for all organizations.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MetricsScheduler {

    private final OrganizationMetricsService metricsService;

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
            log.info("Scheduled metrics update completed successfully");
        } catch (Exception e) {
            log.error("Error during scheduled metrics update", e);
        }
    }
}

