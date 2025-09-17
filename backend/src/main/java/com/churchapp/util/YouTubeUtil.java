package com.churchapp.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.net.URL;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Utility class for YouTube URL validation and video ID extraction
 */
@Component
@Slf4j
public class YouTubeUtil {
    
    // YouTube URL patterns
    private static final Pattern YOUTUBE_WATCH_PATTERN = Pattern.compile(
        "(?:youtube\\.com/watch\\?v=|youtu\\.be/|youtube\\.com/embed/)([a-zA-Z0-9_-]{11})"
    );
    
    private static final Pattern YOUTUBE_SHORT_PATTERN = Pattern.compile(
        "youtube\\.com/shorts/([a-zA-Z0-9_-]{11})"
    );
    
    /**
     * Validates if the given URL is a valid YouTube URL
     */
    public static boolean isValidYouTubeUrl(String url) {
        if (url == null || url.trim().isEmpty()) {
            return false;
        }
        
        try {
            // Normalize the URL
            String normalizedUrl = normalizeYouTubeUrl(url.trim());
            if (normalizedUrl == null) {
                return false;
            }
            
            // Check if it matches YouTube patterns
            return YOUTUBE_WATCH_PATTERN.matcher(normalizedUrl).find() || 
                   YOUTUBE_SHORT_PATTERN.matcher(normalizedUrl).find();
        } catch (Exception e) {
            log.warn("Error validating YouTube URL: {}", url, e);
            return false;
        }
    }
    
    /**
     * Extracts the YouTube video ID from a YouTube URL
     */
    public static String extractVideoId(String url) {
        if (url == null || url.trim().isEmpty()) {
            return null;
        }
        
        try {
            String normalizedUrl = normalizeYouTubeUrl(url.trim());
            if (normalizedUrl == null) {
                return null;
            }
            
            // Try watch/embed pattern first
            Matcher matcher = YOUTUBE_WATCH_PATTERN.matcher(normalizedUrl);
            if (matcher.find()) {
                return matcher.group(1);
            }
            
            // Try shorts pattern
            matcher = YOUTUBE_SHORT_PATTERN.matcher(normalizedUrl);
            if (matcher.find()) {
                return matcher.group(1);
            }
            
            return null;
        } catch (Exception e) {
            log.warn("Error extracting video ID from URL: {}", url, e);
            return null;
        }
    }
    
    /**
     * Generates the standard YouTube watch URL from a video ID
     */
    public static String generateWatchUrl(String videoId) {
        if (videoId == null || videoId.trim().isEmpty()) {
            return null;
        }
        return "https://www.youtube.com/watch?v=" + videoId.trim();
    }
    
    /**
     * Generates the YouTube embed URL from a video ID
     */
    public static String generateEmbedUrl(String videoId) {
        if (videoId == null || videoId.trim().isEmpty()) {
            return null;
        }
        return "https://www.youtube.com/embed/" + videoId.trim();
    }
    
    /**
     * Generates the YouTube thumbnail URL from a video ID
     */
    public static String generateThumbnailUrl(String videoId) {
        if (videoId == null || videoId.trim().isEmpty()) {
            return null;
        }
        return "https://img.youtube.com/vi/" + videoId.trim() + "/maxresdefault.jpg";
    }
    
    /**
     * Normalizes YouTube URLs to a standard format
     */
    private static String normalizeYouTubeUrl(String url) {
        try {
            // Add protocol if missing
            if (!url.startsWith("http://") && !url.startsWith("https://")) {
                url = "https://" + url;
            }
            
            // Validate URL format
            new URL(url);
            
            return url;
        } catch (Exception e) {
            return null;
        }
    }
    
    /**
     * Validates that a video ID is in the correct format
     */
    public static boolean isValidVideoId(String videoId) {
        if (videoId == null || videoId.trim().isEmpty()) {
            return false;
        }
        
        // YouTube video IDs are 11 characters long and contain alphanumeric characters, hyphens, and underscores
        return videoId.trim().matches("[a-zA-Z0-9_-]{11}");
    }
}
