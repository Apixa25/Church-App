package com.churchapp.service;

import com.churchapp.dto.ProcessingStatus;
import com.churchapp.entity.MediaFile;
import com.churchapp.repository.MediaFileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Service for cleaning up original media files after processing
 * Implements the Facebook/X approach: keep originals temporarily, then delete after processing completes
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FileCleanupService {
    
    private final S3Client s3Client;
    private final MediaFileRepository mediaFileRepository;
    
    @Value("${aws.s3.bucket-name}")
    private String bucketName;
    
    @Value("${aws.region}")
    private String region;
    
    @Value("${media.cleanup.original-retention-hours:24}")
    private int retentionHours;
    
    @Value("${media.cleanup.enabled:true}")
    private boolean cleanupEnabled;
    
    /**
     * Clean up original files that have been processed and are older than retention period
     * This is called by the scheduled job
     */
    @Transactional
    public void cleanupProcessedOriginals() {
        if (!cleanupEnabled) {
            log.debug("File cleanup is disabled");
            return;
        }
        
        try {
            LocalDateTime cutoffTime = LocalDateTime.now().minusHours(retentionHours);
            List<MediaFile> filesToCleanup = mediaFileRepository.findReadyForCleanup(
                ProcessingStatus.COMPLETED, 
                cutoffTime
            );
            
            log.info("Found {} original files ready for cleanup (older than {} hours)", 
                    filesToCleanup.size(), retentionHours);
            
            int deletedCount = 0;
            int errorCount = 0;
            
            for (MediaFile mediaFile : filesToCleanup) {
                try {
                    deleteOriginalFile(mediaFile);
                    deletedCount++;
                } catch (Exception e) {
                    log.error("Error deleting original file: {}", mediaFile.getOriginalUrl(), e);
                    errorCount++;
                }
            }
            
            log.info("Cleanup completed: {} deleted, {} errors", deletedCount, errorCount);
            
        } catch (Exception e) {
            log.error("Error during file cleanup", e);
        }
    }
    
    /**
     * Delete original file from S3
     * Only deletes if optimized version exists and processing is completed
     */
    @Transactional
    public void deleteOriginalFile(MediaFile mediaFile) {
        if (mediaFile.getOptimizedUrl() == null) {
            log.warn("Cannot delete original file {} - no optimized version exists", 
                    mediaFile.getOriginalUrl());
            return;
        }
        
        if (mediaFile.getProcessingStatus() != ProcessingStatus.COMPLETED) {
            log.warn("Cannot delete original file {} - processing not completed (status: {})", 
                    mediaFile.getOriginalUrl(), mediaFile.getProcessingStatus());
            return;
        }
        
        try {
            String key = extractKeyFromUrl(mediaFile.getOriginalUrl());
            
            DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build();
            
            s3Client.deleteObject(deleteRequest);
            
            log.debug("Deleted original file from S3: {}", mediaFile.getOriginalUrl());
            
        } catch (Exception e) {
            log.error("Failed to delete original file from S3: {}", mediaFile.getOriginalUrl(), e);
            throw e;
        }
    }
    
    /**
     * Clean up failed processing jobs that can be retried
     * This can be called manually or scheduled separately
     */
    @Transactional
    public void retryFailedProcessing() {
        List<MediaFile> failedFiles = mediaFileRepository.findFailedProcessingRetryable(
            ProcessingStatus.FAILED
        );
        
        log.info("Found {} failed processing jobs that can be retried", failedFiles.size());
        
        // TODO: Implement retry logic
        // This would require re-downloading from S3 and re-processing
        // For now, just log them
        for (MediaFile mediaFile : failedFiles) {
            log.info("Retryable failed file: {} (retry count: {}/{})", 
                    mediaFile.getOriginalUrl(), 
                    mediaFile.getRetryCount(), 
                    mediaFile.getMaxRetries());
        }
    }
    
    /**
     * Extract S3 key from full URL
     */
    private String extractKeyFromUrl(String fileUrl) {
        if (fileUrl == null || !fileUrl.contains(bucketName)) {
            throw new IllegalArgumentException("Invalid file URL: " + fileUrl);
        }
        String urlPattern = String.format("https://%s.s3.%s.amazonaws.com/", bucketName, region);
        if (fileUrl.startsWith(urlPattern)) {
            return fileUrl.substring(urlPattern.length());
        }
        throw new IllegalArgumentException("URL format not recognized: " + fileUrl);
    }
}

