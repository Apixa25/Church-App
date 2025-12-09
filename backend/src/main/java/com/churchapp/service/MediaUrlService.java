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
                log.info("🔄 Detected S3 URL from different bucket: {} -> extracting key: {}", url, key);
            }
        }
        
        if (key != null && !key.isEmpty()) {
            // Convert to CloudFront URL
            String baseUrl = cloudFrontDistributionUrl.trim();
            if (baseUrl.endsWith("/")) {
                baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
            }
            String cloudFrontUrl = baseUrl + "/" + key;
            log.info("🔄 Converted S3 URL to CloudFront: {} -> {}", url, cloudFrontUrl);
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
            
            if (mediaFileOpt.isPresent()) {
                MediaFile mediaFile = mediaFileOpt.get();
                
                // If processing is completed and optimized URL exists, use it
                if (mediaFile.getProcessingStatus() == ProcessingStatus.COMPLETED 
                    && mediaFile.getOptimizedUrl() != null 
                    && !mediaFile.getOptimizedUrl().isEmpty()) {
                    resultUrl = mediaFile.getOptimizedUrl();
                    log.debug("Using optimized URL for: {} -> {}", originalUrl, resultUrl);
                } else {
                    // Use original URL (processing pending, failed, or no optimized version)
                    log.debug("Using original URL (status: {}): {}", mediaFile.getProcessingStatus(), originalUrl);
                }
            } else {
                // No MediaFile found - this is likely an old URL or non-processed file
                log.debug("No MediaFile found for URL, returning as-is: {}", originalUrl);
            }
        } catch (Exception e) {
            // If MediaFile table doesn't exist yet or any other error, fall back to original URL
            // This ensures backward compatibility during migration
            log.warn("Error looking up MediaFile for URL: {}, using original URL. Error: {}", originalUrl, e.getMessage());
        }
        
        // CRITICAL: Always ensure the final URL is a CloudFront URL
        // Direct S3 URLs don't work (bucket access policy)
        return ensureCloudFrontUrl(resultUrl);
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
                // Log conversion for debugging
                if (!originalUrl.equals(bestUrl)) {
                    log.info("🔄 MediaUrlService converted URL: {} -> {}", originalUrl, bestUrl);
                }
                bestUrls.add(bestUrl);
            } catch (Exception e) {
                // If any URL fails, still convert to CloudFront
                log.warn("⚠️ Error resolving URL: {}, using CloudFront fallback. Error: {}", originalUrl, e.getMessage());
                String fallbackUrl = ensureCloudFrontUrl(originalUrl);
                log.info("🔄 MediaUrlService fallback conversion: {} -> {}", originalUrl, fallbackUrl);
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
}

