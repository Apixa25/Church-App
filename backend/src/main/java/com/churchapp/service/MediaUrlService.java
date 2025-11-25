package com.churchapp.service;

import com.churchapp.dto.ProcessingStatus;
import com.churchapp.entity.MediaFile;
import com.churchapp.repository.MediaFileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Service for resolving media URLs
 * Returns optimized URL if available, otherwise returns original URL
 * Implements the Facebook/X approach: serve optimized versions when ready
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MediaUrlService {
    
    private final MediaFileRepository mediaFileRepository;
    
    /**
     * Get the best URL for a media file
     * Returns optimized URL if processing is completed, otherwise returns original URL
     * 
     * @param originalUrl The original URL (may be from MediaFile or direct URL)
     * @return The best URL to use (optimized if available, original otherwise)
     */
    public String getBestUrl(String originalUrl) {
        if (originalUrl == null || originalUrl.isEmpty()) {
            return originalUrl;
        }
        
        try {
            // Try to find MediaFile by original URL
            Optional<MediaFile> mediaFileOpt = mediaFileRepository.findByOriginalUrl(originalUrl);
            
            if (mediaFileOpt.isPresent()) {
                MediaFile mediaFile = mediaFileOpt.get();
                
                // If processing is completed and optimized URL exists, use it
                if (mediaFile.getProcessingStatus() == ProcessingStatus.COMPLETED 
                    && mediaFile.getOptimizedUrl() != null 
                    && !mediaFile.getOptimizedUrl().isEmpty()) {
                    log.debug("Using optimized URL for: {} -> {}", originalUrl, mediaFile.getOptimizedUrl());
                    return mediaFile.getOptimizedUrl();
                }
                
                // Otherwise, use original URL (processing pending, failed, or no optimized version)
                log.debug("Using original URL (status: {}): {}", mediaFile.getProcessingStatus(), originalUrl);
                return originalUrl;
            }
        } catch (Exception e) {
            // If MediaFile table doesn't exist yet or any other error, fall back to original URL
            // This ensures backward compatibility during migration
            log.warn("Error looking up MediaFile for URL: {}, using original URL. Error: {}", originalUrl, e.getMessage());
            return originalUrl; // Return original URL on any error
        }
        
        // No MediaFile found - this is likely an old URL or non-processed file
        // Return as-is for backward compatibility
        log.debug("No MediaFile found for URL, returning as-is: {}", originalUrl);
        return originalUrl;
    }
    
    /**
     * Get the best URLs for a list of media URLs
     * Useful for posts with multiple media files
     * 
     * @param originalUrls List of original URLs
     * @return List of best URLs (optimized if available, original otherwise)
     */
    public List<String> getBestUrls(List<String> originalUrls) {
        if (originalUrls == null || originalUrls.isEmpty()) {
            return new ArrayList<>();
        }
        
        List<String> bestUrls = new ArrayList<>();
        for (String originalUrl : originalUrls) {
            try {
                bestUrls.add(getBestUrl(originalUrl));
            } catch (Exception e) {
                // If any URL fails, use original URL for that item
                log.warn("Error resolving URL: {}, using original. Error: {}", originalUrl, e.getMessage());
                bestUrls.add(originalUrl);
            }
        }
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

