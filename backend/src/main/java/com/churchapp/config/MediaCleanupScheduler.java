package com.churchapp.config;

import com.churchapp.service.FileCleanupService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled job to clean up original media files after processing
 * Implements the Facebook/X approach: delete originals after optimized versions are ready
 * 
 * Schedule: Daily at 2:00 AM (can be configured via application.properties)
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MediaCleanupScheduler {
    
    private final FileCleanupService fileCleanupService;
    
    /**
     * Clean up original files that have been processed
     * Runs daily at 2:00 AM
     * 
     * Cron format: second, minute, hour, day, month, weekday
     * "0 0 2 * * *" = Every day at 2:00 AM
     */
    @Scheduled(cron = "0 0 2 * * *")
    public void cleanupProcessedOriginals() {
        log.info("Starting scheduled cleanup of processed original media files");
        try {
            fileCleanupService.cleanupProcessedOriginals();
            log.info("Scheduled media cleanup completed successfully");
        } catch (Exception e) {
            log.error("Error during scheduled media cleanup", e);
        }
    }
    
    /**
     * Retry failed processing jobs
     * Runs every 6 hours to check for retryable failed processing
     * 
     * Cron: "0 0 *\/6 * * *" = Every 6 hours
     */
    @Scheduled(cron = "0 0 */6 * * *")
    public void retryFailedProcessing() {
        log.info("Starting scheduled retry of failed media processing");
        try {
            fileCleanupService.retryFailedProcessing();
            log.info("Scheduled retry check completed successfully");
        } catch (Exception e) {
            log.error("Error during scheduled retry check", e);
        }
    }
}

