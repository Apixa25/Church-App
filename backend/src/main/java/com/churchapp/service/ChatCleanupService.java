package com.churchapp.service;

import com.churchapp.entity.Message;
import com.churchapp.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Service for cleaning up old chat messages and associated media files.
 *
 * This service runs on a scheduled basis to:
 * 1. Delete media files from S3 for old chat messages
 * 2. Hard delete old messages from the database
 *
 * Configurable retention period defaults to 7 days but can be adjusted.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ChatCleanupService {

    private final MessageRepository messageRepository;
    private final S3Client s3Client;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    @Value("${aws.region}")
    private String region;

    // Chat message retention in days (default: 7 days)
    @Value("${chat.cleanup.retention-days:7}")
    private int retentionDays;

    // Enable/disable chat cleanup (default: enabled)
    @Value("${chat.cleanup.enabled:true}")
    private boolean cleanupEnabled;

    /**
     * Scheduled job to clean up old chat messages.
     * Runs daily at 3 AM (after the media cleanup at 2 AM).
     */
    @Scheduled(cron = "${chat.cleanup.schedule-cron:0 0 3 * * ?}")
    public void scheduledCleanup() {
        if (!cleanupEnabled) {
            log.debug("Chat cleanup is disabled");
            return;
        }

        log.info("Starting scheduled chat cleanup (retention: {} days)", retentionDays);
        cleanupOldMessages();
    }

    /**
     * Main cleanup method - deletes old messages and their media files.
     * Can be called manually or by the scheduled job.
     */
    @Transactional
    public void cleanupOldMessages() {
        try {
            LocalDateTime cutoffTime = LocalDateTime.now().minusDays(retentionDays);

            // First, count how many messages will be affected
            long messageCount = messageRepository.countOldMessages(cutoffTime);
            log.info("Found {} messages older than {} days to clean up", messageCount, retentionDays);

            if (messageCount == 0) {
                log.info("No old messages to clean up");
                return;
            }

            // Step 1: Find and delete media files from S3
            List<Message> messagesWithMedia = messageRepository.findOldMessagesWithMedia(cutoffTime);
            int mediaDeletedCount = 0;
            int mediaErrorCount = 0;

            for (Message message : messagesWithMedia) {
                try {
                    deleteMediaFromS3(message.getMediaUrl());
                    mediaDeletedCount++;
                } catch (Exception e) {
                    log.warn("Failed to delete media file for message {}: {}",
                            message.getId(), e.getMessage());
                    mediaErrorCount++;
                }
            }

            log.info("S3 media cleanup: {} deleted, {} errors", mediaDeletedCount, mediaErrorCount);

            // Step 2: Delete the messages from the database
            int deletedCount = messageRepository.deleteMessagesOlderThan(cutoffTime);

            log.info("Chat cleanup completed: {} messages deleted from database", deletedCount);

        } catch (Exception e) {
            log.error("Error during chat cleanup", e);
        }
    }

    /**
     * Delete a media file from S3.
     */
    private void deleteMediaFromS3(String mediaUrl) {
        if (mediaUrl == null || mediaUrl.isEmpty()) {
            return;
        }

        try {
            String key = extractKeyFromUrl(mediaUrl);

            DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build();

            s3Client.deleteObject(deleteRequest);
            log.debug("Deleted chat media from S3: {}", key);

        } catch (Exception e) {
            log.warn("Failed to delete chat media from S3: {}", mediaUrl, e);
            throw e;
        }
    }

    /**
     * Extract S3 key from full URL (handles both S3 and CloudFront URLs).
     */
    private String extractKeyFromUrl(String fileUrl) {
        if (fileUrl == null || fileUrl.isEmpty()) {
            throw new IllegalArgumentException("Invalid file URL: " + fileUrl);
        }

        // Handle CloudFront URLs: https://d3loytcgioxpml.cloudfront.net/chat-media/file.jpg
        if (fileUrl.contains("cloudfront.net")) {
            int domainEnd = fileUrl.indexOf(".net/");
            if (domainEnd > 0) {
                return fileUrl.substring(domainEnd + 5); // +5 to skip ".net/"
            }
        }

        // Handle S3 URLs: https://bucket.s3.region.amazonaws.com/key
        if (fileUrl.contains(bucketName)) {
            String urlPattern = String.format("https://%s.s3.%s.amazonaws.com/", bucketName, region);
            if (fileUrl.startsWith(urlPattern)) {
                return fileUrl.substring(urlPattern.length());
            }
            // Try alternative S3 URL format
            String altPattern = String.format("https://%s.s3-%s.amazonaws.com/", bucketName, region);
            if (fileUrl.startsWith(altPattern)) {
                return fileUrl.substring(altPattern.length());
            }
            // Try another common S3 URL format
            String simplePattern = String.format("https://%s.s3.amazonaws.com/", bucketName);
            if (fileUrl.startsWith(simplePattern)) {
                return fileUrl.substring(simplePattern.length());
            }
        }

        log.warn("URL format not recognized, attempting path extraction: {}", fileUrl);
        // Fallback: try to extract path after the domain
        try {
            java.net.URL url = new java.net.URL(fileUrl);
            String path = url.getPath();
            if (path.startsWith("/")) {
                return path.substring(1);
            }
            return path;
        } catch (Exception e) {
            throw new IllegalArgumentException("Cannot parse URL: " + fileUrl, e);
        }
    }

    /**
     * Get cleanup statistics for monitoring/reporting.
     */
    public CleanupStats getCleanupStats() {
        LocalDateTime cutoffTime = LocalDateTime.now().minusDays(retentionDays);
        long messageCount = messageRepository.countOldMessages(cutoffTime);
        List<Message> messagesWithMedia = messageRepository.findOldMessagesWithMedia(cutoffTime);

        return new CleanupStats(
            retentionDays,
            messageCount,
            messagesWithMedia.size(),
            cleanupEnabled,
            cutoffTime
        );
    }

    /**
     * Statistics about pending cleanup.
     */
    public record CleanupStats(
        int retentionDays,
        long pendingMessageCount,
        int pendingMediaCount,
        boolean cleanupEnabled,
        LocalDateTime cutoffTime
    ) {}
}
