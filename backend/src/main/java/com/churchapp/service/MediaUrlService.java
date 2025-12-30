package com.churchapp.service;

import com.churchapp.dto.ProcessingStatus;
import com.churchapp.entity.MediaFile;
import com.churchapp.repository.MediaFileRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;
import java.util.regex.Matcher;

/**
 * Service for resolving media URLs
 * Returns optimized URL if available, otherwise returns original URL
 * Implements the Facebook/X approach: serve optimized versions when ready
 * 
 * IMPORTANT: All URLs are converted to CloudFront URLs for proper delivery.
 * Direct S3 URLs don't work due to bucket access policies.
 */
@Service
@Slf4j
public class MediaUrlService {
    
    private final MediaFileRepository mediaFileRepository;
    
    @Value("${aws.cloudfront.distribution-url:}")
    private String cloudFrontDistributionUrl;
    
    @Value("${aws.s3.bucket-name}")
    private String bucketName;
    
    @Value("${aws.region}")
    private String region;
    
    public MediaUrlService(MediaFileRepository mediaFileRepository) {
        this.mediaFileRepository = mediaFileRepository;
    }
    
    /**
     * Convert any S3 URL to CloudFront URL.
     * This is critical because direct S3 URLs don't work (bucket is not public).
     * All media must be served through CloudFront.
     * 
     * This method detects ANY S3 URL pattern, not just the configured bucket,
     * to handle URLs from different buckets (e.g., old dev bucket URLs).
     * 
     * @param url The URL (might be S3 or CloudFront)
     * @return CloudFront URL
     */
    public String ensureCloudFrontUrl(String url) {
        if (url == null || url.isEmpty()) {
            return url;
        }
        
        // If CloudFront is not configured, return original URL
        if (cloudFrontDistributionUrl == null || cloudFrontDistributionUrl.trim().isEmpty()) {
            log.warn("⚠️ CloudFront URL not configured, cannot convert S3 URL: {}", url);
            return url;
        }
        
        // Already a CloudFront URL - return as-is
        if (url.contains("cloudfront.net")) {
            return url;
        }
        
        // Check if it's an S3 URL that needs conversion
        // Pattern 1: https://bucket-name.s3.region.amazonaws.com/key
        // Pattern 2: https://bucket-name.s3-region.amazonaws.com/key
        // Pattern 3: https://s3.region.amazonaws.com/bucket-name/key (path-style)
        
        String key = null;
        
        // Try configured bucket patterns first (most common)
        String s3Pattern1 = String.format("https://%s.s3.%s.amazonaws.com/", bucketName, region);
        String s3Pattern2 = String.format("https://%s.s3-%s.amazonaws.com/", bucketName, region);
        
        if (url.startsWith(s3Pattern1)) {
            key = url.substring(s3Pattern1.length());
        } else if (url.startsWith(s3Pattern2)) {
            key = url.substring(s3Pattern2.length());
        } else {
            // Try to match ANY S3 URL pattern using regex
            // Pattern: https://[bucket].s3.[region].amazonaws.com/[key]
            // or: https://[bucket].s3-[region].amazonaws.com/[key]
            Pattern s3Pattern = Pattern.compile(
                "https://([^.]+)\\.s3[.-]([^.]+)\\.amazonaws\\.com/(.+)"
            );
            Matcher matcher = s3Pattern.matcher(url);
            if (matcher.matches()) {
                key = matcher.group(3); // Extract the key (everything after the bucket/region)
                log.debug("🔄 Detected S3 URL from different bucket: {} -> extracting key: {}", url, key);
            }
        }
        
        if (key != null && !key.isEmpty()) {
            // Convert to CloudFront URL
            String baseUrl = cloudFrontDistributionUrl.trim();
            if (baseUrl.endsWith("/")) {
                baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
            }
            String cloudFrontUrl = baseUrl + "/" + key;
            log.debug("🔄 Converted S3 URL to CloudFront: {} -> {}", url, cloudFrontUrl);
            return cloudFrontUrl;
        }
        
        // Not an S3 URL we recognize, return as-is
        log.warn("⚠️ Could not convert URL to CloudFront (not an S3 URL): {}", url);
        return url;
    }
    
    /**
     * Get the best URL for a media file
     * Returns optimized URL if processing is completed, otherwise returns original URL
     * ALL URLs are converted to CloudFront URLs for proper delivery.
     * 
     * @param originalUrl The original URL (may be from MediaFile or direct URL)
     * @return The best URL to use (optimized if available, original otherwise) - always CloudFront
     */
    /**
     * Extract S3 key from URL (handles both CloudFront and S3 URLs)
     */
    private String extractS3KeyFromUrl(String url) {
        if (url == null || url.isEmpty()) {
            return null;
        }
        
        // Handle CloudFront URLs
        if (url.contains("cloudfront.net")) {
            int domainEnd = url.indexOf(".net/");
            if (domainEnd > 0) {
                String key = url.substring(domainEnd + 5); // +5 to skip ".net/"
                // Remove query parameters
                int queryIndex = key.indexOf('?');
                if (queryIndex > 0) {
                    key = key.substring(0, queryIndex);
                }
                return key;
            }
        }
        
        // Handle S3 URLs
        String s3Pattern1 = String.format("https://%s.s3.%s.amazonaws.com/", bucketName, region);
        String s3Pattern2 = String.format("https://%s.s3-%s.amazonaws.com/", bucketName, region);
        
        if (url.startsWith(s3Pattern1)) {
            String key = url.substring(s3Pattern1.length());
            int queryIndex = key.indexOf('?');
            return queryIndex > 0 ? key.substring(0, queryIndex) : key;
        } else if (url.startsWith(s3Pattern2)) {
            String key = url.substring(s3Pattern2.length());
            int queryIndex = key.indexOf('?');
            return queryIndex > 0 ? key.substring(0, queryIndex) : key;
        }
        
        // Try regex for any S3 URL
        Pattern s3Pattern = Pattern.compile("https://([^.]+)\\.s3[.-]([^.]+)\\.amazonaws\\.com/(.+)");
        Matcher matcher = s3Pattern.matcher(url);
        if (matcher.matches()) {
            String key = matcher.group(3);
            int queryIndex = key.indexOf('?');
            return queryIndex > 0 ? key.substring(0, queryIndex) : key;
        }
        
        return null;
    }
    
    public String getBestUrl(String originalUrl) {
        if (originalUrl == null || originalUrl.isEmpty()) {
            return originalUrl;
        }
        
        String resultUrl = originalUrl;
        
        try {
            // First, ensure the originalUrl is in CloudFront format for lookup
            // (MediaFile might be stored with either format)
            String lookupUrl = ensureCloudFrontUrl(originalUrl);
            
            // Try to find MediaFile by original URL (try both formats)
            Optional<MediaFile> mediaFileOpt = mediaFileRepository.findByOriginalUrl(originalUrl);
            if (mediaFileOpt.isEmpty() && !lookupUrl.equals(originalUrl)) {
                mediaFileOpt = mediaFileRepository.findByOriginalUrl(lookupUrl);
            }
            
            // Fallback: Try to find by S3 key if URL lookup fails
            // This handles cases where URL format might differ slightly
            if (mediaFileOpt.isEmpty()) {
                String s3Key = extractS3KeyFromUrl(originalUrl);
                if (s3Key != null) {
                    // Try to find MediaFile by reconstructing possible URLs
                    // MediaFile might be stored with CloudFront URL
                    String possibleCloudFrontUrl = ensureCloudFrontUrl(originalUrl);
                    mediaFileOpt = mediaFileRepository.findByOriginalUrl(possibleCloudFrontUrl);
                    
                    // Also try S3 URL format
                    if (mediaFileOpt.isEmpty()) {
                        String possibleS3Url = String.format("https://%s.s3.%s.amazonaws.com/%s", bucketName, region, s3Key);
                        mediaFileOpt = mediaFileRepository.findByOriginalUrl(possibleS3Url);
                    }
                }
            }
            
            if (mediaFileOpt.isPresent()) {
                MediaFile mediaFile = mediaFileOpt.get();
                
                // If processing is completed and optimized URL exists, use it
                if (mediaFile.getProcessingStatus() == ProcessingStatus.COMPLETED 
                    && mediaFile.getOptimizedUrl() != null 
                    && !mediaFile.getOptimizedUrl().isEmpty()) {
                    resultUrl = mediaFile.getOptimizedUrl();
                    log.info("✅ Using optimized URL for: {} -> {}", originalUrl, resultUrl);
                } else {
                    // Use original URL (processing pending, failed, or no optimized version)
                    // Log at appropriate level based on status
                    if (mediaFile.getProcessingStatus() == ProcessingStatus.FAILED) {
                        log.warn("⚠️ Using original URL - processing FAILED: {}", originalUrl);
                    } else if (mediaFile.getProcessingStatus() == ProcessingStatus.PROCESSING) {
                        log.debug("Using original URL - processing in progress: {}", originalUrl);
                    } else {
                        log.debug("Using original URL (status: {}, optimizedUrl: {}): {}", 
                                mediaFile.getProcessingStatus(), 
                                mediaFile.getOptimizedUrl() != null ? "exists" : "null",
                                originalUrl);
                    }
                }
            } else {
                // No MediaFile found - this is likely an old URL or non-processed file
                // Only log at debug level to avoid spam (this is common for old posts)
                log.debug("No MediaFile found for URL, returning original: {}", originalUrl);
            }
        } catch (Exception e) {
            // If MediaFile table doesn't exist yet or any other error, fall back to original URL
            // This ensures backward compatibility during migration
            log.error("❌ Error looking up MediaFile for URL: {}, using original URL. Error: {}", originalUrl, e.getMessage(), e);
        }
        
        // CRITICAL: Always ensure the final URL is a CloudFront URL
        // Direct S3 URLs don't work (bucket access policy)
        // Only convert if needed (avoid unnecessary logging)
        if (resultUrl != null && !resultUrl.contains("cloudfront.net") && resultUrl.contains("amazonaws.com")) {
            return ensureCloudFrontUrl(resultUrl);
        }
        return resultUrl;
    }
    
    /**
     * Get the best URLs for a list of media URLs
     * Useful for posts with multiple media files
     * ALL URLs are converted to CloudFront URLs for proper delivery.
     * 
     * @param originalUrls List of original URLs
     * @return List of best URLs (optimized if available, original otherwise) - always CloudFront
     */
    public List<String> getBestUrls(List<String> originalUrls) {
        if (originalUrls == null || originalUrls.isEmpty()) {
            return new ArrayList<>();
        }
        
        List<String> bestUrls = new ArrayList<>();
        for (String originalUrl : originalUrls) {
            try {
                String bestUrl = getBestUrl(originalUrl);
                // Only log when URL actually changed (original -> optimized)
                if (!originalUrl.equals(bestUrl) && !bestUrl.equals(ensureCloudFrontUrl(originalUrl))) {
                    log.info("🔄 MediaUrlService converted URL: {} -> {}", originalUrl, bestUrl);
                }
                bestUrls.add(bestUrl);
            } catch (Exception e) {
                // If any URL fails, still convert to CloudFront
                log.warn("⚠️ Error resolving URL: {}, using CloudFront fallback. Error: {}", originalUrl, e.getMessage());
                String fallbackUrl = ensureCloudFrontUrl(originalUrl);
                log.debug("🔄 MediaUrlService fallback conversion: {} -> {}", originalUrl, fallbackUrl);
                bestUrls.add(fallbackUrl);
            }
        }
        log.debug("✅ MediaUrlService.getBestUrls: converted {} URLs", bestUrls.size());
        return bestUrls;
    }
    
    /**
     * Get MediaFile by original URL
     * Useful for checking processing status
     * 
     * @param originalUrl The original URL
     * @return Optional MediaFile if found
     */
    @Transactional(readOnly = true)
    public Optional<MediaFile> getMediaFile(String originalUrl) {
        return mediaFileRepository.findByOriginalUrl(originalUrl);
    }
    
    /**
     * Get MediaFile by optimized URL
     * Useful for reverse lookups
     * 
     * @param optimizedUrl The optimized URL
     * @return Optional MediaFile if found
     */
    @Transactional(readOnly = true)
    public Optional<MediaFile> getMediaFileByOptimizedUrl(String optimizedUrl) {
        return mediaFileRepository.findByOptimizedUrl(optimizedUrl);
    }
    
    /**
     * Construct thumbnail URL from video URL pattern.
     * MediaConvert creates thumbnails at: posts/thumbnails/{uuid}.0000000.jpg
     * where {uuid} is extracted from the original video URL.
     * 
     * This method is used as a fallback when the thumbnail URL is not stored in the database.
     * 
     * @param videoUrl The video URL (original or optimized)
     * @return CloudFront URL for the thumbnail, or null if cannot be constructed
     */
    public String constructThumbnailUrl(String videoUrl) {
        if (videoUrl == null || videoUrl.isEmpty()) {
            return null;
        }
        
        try {
            // Extract UUID from video URL
            // Pattern: .../posts/originals/{uuid}.webm or .../posts/originals/{uuid}.mp4
            // Or optimized: .../posts/optimized/{uuid}_optimized.mp4
            String uuid = null;
            
            // Handle both old paths (posts/originals/) and new paths (media/posts/originals/)
            if (videoUrl.contains("/media/posts/originals/")) {
                int startIdx = videoUrl.indexOf("/media/posts/originals/") + "/media/posts/originals/".length();
                int endIdx = videoUrl.lastIndexOf(".");
                if (endIdx > startIdx) {
                    uuid = videoUrl.substring(startIdx, endIdx);
                }
            } else if (videoUrl.contains("/posts/originals/")) {
                int startIdx = videoUrl.indexOf("/posts/originals/") + "/posts/originals/".length();
                int endIdx = videoUrl.lastIndexOf(".");
                if (endIdx > startIdx) {
                    uuid = videoUrl.substring(startIdx, endIdx);
                }
            } else if (videoUrl.contains("/media/posts/optimized/")) {
                int startIdx = videoUrl.indexOf("/media/posts/optimized/") + "/media/posts/optimized/".length();
                int endIdx = videoUrl.indexOf("_optimized");
                if (endIdx == -1) {
                    endIdx = videoUrl.lastIndexOf(".");
                }
                if (endIdx > startIdx) {
                    uuid = videoUrl.substring(startIdx, endIdx);
                }
            } else if (videoUrl.contains("/posts/optimized/")) {
                int startIdx = videoUrl.indexOf("/posts/optimized/") + "/posts/optimized/".length();
                int endIdx = videoUrl.indexOf("_optimized");
                if (endIdx == -1) {
                    endIdx = videoUrl.lastIndexOf(".");
                }
                if (endIdx > startIdx) {
                    uuid = videoUrl.substring(startIdx, endIdx);
                }
            }
            
            if (uuid == null || uuid.isEmpty()) {
                log.debug("Cannot extract UUID from video URL for thumbnail: {}", videoUrl);
                return null;
            }

            // Determine if this is a new-style URL (with media/ prefix) or old-style
            boolean isNewPath = videoUrl.contains("/media/posts/");

            // Construct thumbnail URL based on path style
            // New: media/thumbnails/{uuid}.0000000.jpg
            // Old: posts/thumbnails/{uuid}.0000000.jpg
            String thumbnailKey = isNewPath
                ? String.format("media/thumbnails/%s.0000000.jpg", uuid)
                : String.format("posts/thumbnails/%s.0000000.jpg", uuid);

            // Build CloudFront URL
            String baseUrl = getCloudFrontBaseUrl();
            if (baseUrl != null) {
                String thumbnailUrl = baseUrl + "/" + thumbnailKey;
                log.debug("🖼️ Constructed thumbnail URL: {} -> {}", videoUrl, thumbnailUrl);
                return thumbnailUrl;
            }

            // Fallback to S3 URL (likely won't work but try anyway)
            return String.format("https://%s.s3.%s.amazonaws.com/%s", bucketName, region, thumbnailKey);
            
        } catch (Exception e) {
            log.debug("Error constructing thumbnail URL from video URL: {}", e.getMessage());
            return null;
        }
    }
    
    /**
     * Get CloudFront base URL with trailing slash removed
     */
    private String getCloudFrontBaseUrl() {
        if (cloudFrontDistributionUrl == null || cloudFrontDistributionUrl.trim().isEmpty()) {
            return null;
        }
        String url = cloudFrontDistributionUrl.trim();
        // Remove trailing slash to prevent double slashes
        while (url.endsWith("/")) {
            url = url.substring(0, url.length() - 1);
        }
        return url;
    }
}

