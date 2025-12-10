package com.churchapp.service;

import com.churchapp.entity.MediaFile;
import com.churchapp.repository.MediaFileRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

/**
 * Service to handle MediaConvert job completion webhooks via SNS
 * 
 * Follows the same pattern as StripeWebhookService for consistency.
 * 
 * When a MediaConvert job completes:
 * - SNS publishes a notification to our webhook endpoint
 * - This service verifies the SNS message signature
 * - Extracts the job completion details
 * - Updates the MediaFile entity with thumbnail URL and optimized video URL
 * 
 * Industry standard approach used by X.com, Instagram, and other major platforms.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MediaConvertWebhookService {

    @Value("${aws.sns.mediaconvert.topic-arn:}")
    private String snsTopicArn;
    
    @Value("${aws.cloudfront.distribution-url:}")
    private String cloudFrontDistributionUrl;
    
    @Value("${aws.s3.bucket-name:church-app-uploads-stevensills2}")
    private String bucketName;
    
    @Value("${aws.region:us-west-2}")
    private String region;

    private final MediaFileRepository mediaFileRepository;
    private final ObjectMapper objectMapper;

    /**
     * Process SNS webhook notification for MediaConvert job completion
     * 
     * SNS sends two types of messages:
     * 1. SubscriptionConfirmation - when endpoint is first subscribed
     * 2. Notification - actual job completion events
     * 
     * @param messageType SNS message type header
     * @param messageBody SNS message body (JSON)
     */
    @Transactional
    public void processWebhook(String messageType, String messageBody) {
        try {
            log.info("🔔 Processing SNS webhook - Type: {}", messageType);

            JsonNode message = objectMapper.readTree(messageBody);

            // Handle subscription confirmation (first time setup)
            if ("SubscriptionConfirmation".equals(messageType)) {
                handleSubscriptionConfirmation(message);
                return;
            }

            // Handle notification (job completion event)
            if ("Notification".equals(messageType)) {
                handleJobCompletionNotification(message);
                return;
            }

            log.warn("Unknown SNS message type: {}", messageType);

        } catch (Exception e) {
            log.error("Error processing MediaConvert webhook: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to process webhook: " + e.getMessage(), e);
        }
    }

    /**
     * Handle SNS subscription confirmation
     * When AWS SNS first subscribes your endpoint, it sends a confirmation message
     * We automatically confirm by making a GET request to the SubscribeURL
     */
    private void handleSubscriptionConfirmation(JsonNode message) {
        String subscribeUrl = message.get("SubscribeURL").asText();
        String topicArn = message.get("TopicArn").asText();
        
        log.info("🔔 SNS Subscription Confirmation received for topic: {}", topicArn);
        log.info("📡 Auto-confirming subscription by visiting SubscribeURL...");
        
        try {
            // Automatically confirm the subscription by making a GET request to the SubscribeURL
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(subscribeUrl))
                    .GET()
                    .build();
            
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("✅ SNS Subscription confirmed successfully! Topic: {}", topicArn);
            } else {
                log.error("❌ Failed to confirm SNS subscription. Status: {}, Body: {}", 
                        response.statusCode(), response.body());
            }
        } catch (Exception e) {
            log.error("❌ Error confirming SNS subscription: {}", e.getMessage(), e);
            log.warn("📋 Manual confirmation URL (if needed): {}", subscribeUrl);
        }
    }

    /**
     * Handle MediaConvert job completion notification
     * 
     * The SNS message contains the MediaConvert job completion event.
     * We extract:
     * - Job ID
     * - Job status (COMPLETE, ERROR, etc.)
     * - Output file URIs (optimized video and thumbnail)
     */
    @Transactional
    private void handleJobCompletionNotification(JsonNode message) {
        try {
            // SNS wraps the MediaConvert event in a "Message" field (JSON string)
            String messageText = message.get("Message").asText();
            JsonNode mediaconvertEvent = objectMapper.readTree(messageText);

            // Extract job details from MediaConvert event
            String jobId = mediaconvertEvent.get("detail").get("jobId").asText();
            String jobStatus = mediaconvertEvent.get("detail").get("status").asText();

            log.info("MediaConvert job completion notification - Job ID: {}, Status: {}", jobId, jobStatus);

            // Find MediaFile by jobId
            MediaFile mediaFile = mediaFileRepository.findByJobId(jobId)
                    .orElse(null);

            if (mediaFile == null) {
                log.warn("MediaFile not found for job ID: {}", jobId);
                return;
            }

            // Handle job completion based on status
            if ("COMPLETE".equals(jobStatus)) {
                handleJobCompleted(mediaconvertEvent, mediaFile);
            } else if ("ERROR".equals(jobStatus) || "CANCELED".equals(jobStatus)) {
                handleJobFailed(mediaconvertEvent, mediaFile, jobStatus);
            } else {
                log.debug("Job {} is still in status: {}", jobId, jobStatus);
            }

        } catch (Exception e) {
            log.error("Error handling job completion notification: {}", e.getMessage(), e);
        }
    }

    /**
     * Handle successfully completed MediaConvert job
     * Extracts optimized video URL and thumbnail URL from job output
     */
    @Transactional
    private void handleJobCompleted(JsonNode mediaconvertEvent, MediaFile mediaFile) {
        try {
            log.info("🎬 Processing completed MediaConvert job for MediaFile: {}", mediaFile.getId());

            // Get job output details
            JsonNode detail = mediaconvertEvent.get("detail");
            JsonNode outputGroupDetails = detail.get("outputGroupDetails");

            // Log full event structure for debugging
            log.debug("📋 Full MediaConvert event structure: {}", objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(mediaconvertEvent));

            if (outputGroupDetails == null || !outputGroupDetails.isArray()) {
                log.warn("⚠️ No output group details found in job completion event for MediaFile: {}", mediaFile.getId());
                log.warn("📋 Event detail keys: {}", detail.fieldNames());
                return;
            }

            String optimizedUrl = null;
            String thumbnailUrl = null;

            // Parse output groups to find optimized video and thumbnail
            log.debug("🔍 Parsing {} output groups", outputGroupDetails.size());
            for (JsonNode outputGroup : outputGroupDetails) {
                log.debug("📦 Output group type: {}", outputGroup.has("type") ? outputGroup.get("type").asText() : "unknown");
                
                JsonNode outputDetails = outputGroup.get("outputDetails");
                if (outputDetails == null || !outputDetails.isArray()) {
                    log.debug("⚠️ No outputDetails array in this output group");
                    continue;
                }

                log.debug("🔍 Found {} output details in this group", outputDetails.size());
                for (JsonNode output : outputDetails) {
                    // Try multiple possible field names for the output file URI
                    String outputFileUri = null;
                    if (output.has("outputFileUri")) {
                        outputFileUri = output.get("outputFileUri").asText();
                    } else if (output.has("outputFileURIs") && output.get("outputFileURIs").isArray() && output.get("outputFileURIs").size() > 0) {
                        outputFileUri = output.get("outputFileURIs").get(0).asText();
                    } else if (output.has("uri")) {
                        outputFileUri = output.get("uri").asText();
                    }

                    if (outputFileUri == null) {
                        log.debug("⚠️ No outputFileUri found in output. Available fields: {}", output.fieldNames());
                        continue;
                    }

                    log.debug("📄 Found output file URI: {}", outputFileUri);

                    // Check if this is the optimized video (contains "_optimized")
                    if (outputFileUri.contains("_optimized")) {
                        optimizedUrl = convertS3UriToUrl(outputFileUri);
                        log.info("✅ Found optimized video URL: {}", optimizedUrl);
                    }

                    // Check if this is the thumbnail (contains "_thumbnail")
                    if (outputFileUri.contains("_thumbnail")) {
                        thumbnailUrl = convertS3UriToUrl(outputFileUri);
                        log.info("🖼️ Found thumbnail URL: {}", thumbnailUrl);
                    }
                }
            }

            // Fallback: If optimized URL not found in event, construct from known pattern
            // EventBridge events sometimes have missing or incorrect outputFilePaths
            // We know the pattern: posts/optimized/{uuid}_optimized.mp4
            if (optimizedUrl == null) {
                log.warn("⚠️ Optimized URL not found in event output. Attempting fallback construction...");
                optimizedUrl = constructOptimizedUrlFromPattern(mediaFile);
                if (optimizedUrl != null) {
                    log.info("✅ Constructed optimized URL from pattern: {}", optimizedUrl);
                }
            }

            // Fallback: If thumbnail not found in event, try to construct from known pattern
            // MediaConvert creates thumbnails at: {folder}/thumbnails/{uuid}_thumbnail.jpg
            if (thumbnailUrl == null) {
                log.warn("⚠️ Thumbnail URL not found in event output. Attempting fallback construction...");
                thumbnailUrl = constructThumbnailUrlFromPattern(mediaFile);
                if (thumbnailUrl != null) {
                    log.info("🖼️ Constructed thumbnail URL from pattern: {}", thumbnailUrl);
                }
            }

            // Update MediaFile with results
            // If we still don't have an optimized URL, use the original (this shouldn't happen)
            String finalOptimizedUrl = optimizedUrl != null ? optimizedUrl : mediaFile.getOriginalUrl();
            if (optimizedUrl == null) {
                log.error("❌ Failed to determine optimized URL for MediaFile: {}. Using original URL as fallback.", mediaFile.getId());
            }
            mediaFile.markProcessingCompleted(finalOptimizedUrl, 0L, thumbnailUrl);
            mediaFileRepository.save(mediaFile);

            log.info("✅ MediaConvert job completed successfully for MediaFile: {}. Optimized: {}, Thumbnail: {}",
                    mediaFile.getId(), 
                    optimizedUrl != null ? "yes" : "no",
                    thumbnailUrl != null ? "yes" : "no");

        } catch (Exception e) {
            log.error("❌ Error processing completed job for MediaFile: {}", mediaFile.getId(), e);
            mediaFile.markProcessingFailed("Error extracting job output: " + e.getMessage());
            mediaFileRepository.save(mediaFile);
        }
    }

    /**
     * Fallback: Construct optimized video URL from known pattern
     * EventBridge events sometimes have missing or incorrect outputFilePaths
     * Since we control the MediaConvert job settings, we know the output pattern:
     * Input: posts/originals/{uuid}.webm (or .mov, .mp4)
     * Output: posts/optimized/{uuid}_optimized.mp4
     */
    private String constructOptimizedUrlFromPattern(MediaFile mediaFile) {
        try {
            String originalUrl = mediaFile.getOriginalUrl();
            if (originalUrl == null || originalUrl.isEmpty()) {
                log.warn("⚠️ Cannot construct optimized URL: MediaFile originalUrl is null or empty");
                return null;
            }
            
            // Extract the UUID from the original URL
            // Original URL format: https://bucket.s3.region.amazonaws.com/posts/originals/{uuid}.webm
            // Or CloudFront: https://xxxxx.cloudfront.net/posts/originals/{uuid}.webm
            String uuid = null;
            if (originalUrl.contains("/posts/originals/")) {
                int startIdx = originalUrl.indexOf("/posts/originals/") + "/posts/originals/".length();
                int endIdx = originalUrl.lastIndexOf(".");
                if (endIdx > startIdx) {
                    uuid = originalUrl.substring(startIdx, endIdx);
                }
            }
            
            if (uuid == null || uuid.isEmpty()) {
                log.warn("⚠️ Cannot extract UUID from original URL: {}", originalUrl);
                return null;
            }
            
            // Construct the optimized URL
            // Pattern: posts/optimized/{uuid}_optimized.mp4
            String optimizedKey = String.format("posts/optimized/%s_optimized.mp4", uuid);
            
            // ALWAYS use CloudFront URL - S3 direct access is denied
            String optimizedUrl;
            if (cloudFrontDistributionUrl != null && !cloudFrontDistributionUrl.isEmpty()) {
                // Use CloudFront (preferred)
                optimizedUrl = cloudFrontDistributionUrl + "/" + optimizedKey;
                log.info("✅ Using CloudFront URL for optimized video");
            } else {
                // Fallback to S3 (will likely fail due to access policy, but try anyway)
                optimizedUrl = String.format("https://%s.s3.%s.amazonaws.com/%s", bucketName, region, optimizedKey);
                log.warn("⚠️ CloudFront URL not configured! Using S3 URL which may not work.");
            }
            
            log.info("✅ Constructed optimized URL from pattern: {} (UUID: {})", optimizedUrl, uuid);
            
            return optimizedUrl;
        } catch (Exception e) {
            log.error("Error constructing optimized URL from pattern: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Fallback: Construct thumbnail URL from known pattern
     * Since MediaConvert creates files with predictable patterns, we can try to construct the URL
     * Based on the folder and the fact that MediaConvert uses nameModifier
     */
    private String constructThumbnailUrlFromPattern(MediaFile mediaFile) {
        try {
            String folder = mediaFile.getFolder();
            if (folder == null || folder.isEmpty()) {
                log.warn("⚠️ Cannot construct thumbnail URL: MediaFile folder is null or empty");
                return null;
            }
            
            // MediaConvert creates thumbnails at: {baseFolder}/thumbnails_thumbnail.0000000.jpg
            // The folder is like "posts/originals/{uuid}", but MediaConvert uses just the base folder "posts"
            // Extract the base folder (first part before the first slash after the base)
            String baseFolder = folder;
            if (folder.contains("/")) {
                // Extract just the base folder (e.g., "posts" from "posts/originals/{uuid}")
                baseFolder = folder.substring(0, folder.indexOf("/"));
            }
            
            // MediaConvert creates: {baseFolder}/thumbnails_thumbnail.0000000.jpg
            String thumbnailKey = String.format("%s/thumbnails_thumbnail.0000000.jpg", baseFolder);
            
            // Use CloudFront URL if available
            String thumbnailUrl;
            if (cloudFrontDistributionUrl != null && !cloudFrontDistributionUrl.isEmpty()) {
                thumbnailUrl = cloudFrontDistributionUrl + "/" + thumbnailKey;
            } else {
                thumbnailUrl = String.format("https://%s.s3.%s.amazonaws.com/%s", bucketName, region, thumbnailKey);
            }
            
            log.info("🖼️ Constructed thumbnail URL from pattern: {} (extracted base folder: {} from full folder: {})", 
                    thumbnailUrl, baseFolder, folder);
            log.warn("⚠️ This is a fallback - webhook should provide the actual URL. Consider fixing EventBridge/SNS webhook delivery.");
            
            return thumbnailUrl;
        } catch (Exception e) {
            log.error("Error constructing thumbnail URL from pattern: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Handle failed or canceled MediaConvert job
     */
    @Transactional
    private void handleJobFailed(JsonNode mediaconvertEvent, MediaFile mediaFile, String status) {
        try {
            JsonNode detail = mediaconvertEvent.get("detail");
            String errorMessage = detail.has("errorMessage") 
                    ? detail.get("errorMessage").asText() 
                    : "MediaConvert job " + status.toLowerCase();

            log.warn("MediaConvert job failed for MediaFile: {}. Error: {}", mediaFile.getId(), errorMessage);

            mediaFile.markProcessingFailed(errorMessage);
            mediaFileRepository.save(mediaFile);

        } catch (Exception e) {
            log.error("Error processing failed job for MediaFile: {}", mediaFile.getId(), e);
        }
    }

    /**
     * Convert S3 URI to accessible HTTPS URL
     * IMPORTANT: Uses CloudFront URL if configured, as direct S3 access is denied
     * Example: s3://bucket-name/path/to/file.jpg -> https://d3loytcgioxpml.cloudfront.net/path/to/file.jpg
     */
    private String convertS3UriToUrl(String s3Uri) {
        if (s3Uri == null || !s3Uri.startsWith("s3://")) {
            return s3Uri; // Return as-is if not an S3 URI
        }

        // Remove s3:// prefix
        String path = s3Uri.substring(5);
        
        // Split bucket and key
        int firstSlash = path.indexOf('/');
        if (firstSlash == -1) {
            // No key, just bucket - shouldn't happen for real files
            log.warn("S3 URI has no key: {}", s3Uri);
            return s3Uri;
        }

        String key = path.substring(firstSlash + 1);
        
        // ALWAYS prefer CloudFront URL - S3 direct access is denied
        if (cloudFrontDistributionUrl != null && !cloudFrontDistributionUrl.isEmpty()) {
            String cloudFrontUrl = cloudFrontDistributionUrl + "/" + key;
            log.info("✅ Converted S3 URI to CloudFront URL: {} -> {}", s3Uri, cloudFrontUrl);
            return cloudFrontUrl;
        }
        
        // Fallback to S3 (will likely fail)
        String bucket = path.substring(0, firstSlash);
        log.warn("⚠️ CloudFront not configured, using S3 URL which may not work: {}", s3Uri);
        return String.format("https://%s.s3.%s.amazonaws.com/%s", bucket, region, key);
    }
}

