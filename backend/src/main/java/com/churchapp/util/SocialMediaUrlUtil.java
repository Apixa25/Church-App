package com.churchapp.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.net.URL;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Utility class for social media URL detection, validation, and ID extraction
 * Supports: X (Twitter), Facebook Reels, Instagram Reels, YouTube
 * 
 * Industry Standard Approach: Following X.com's pattern of robust URL pattern matching
 */
@Component
@Slf4j
public class SocialMediaUrlUtil {

    // ============================================================================
    // X (Twitter) URL Patterns
    // ============================================================================
    // Supports: https://x.com/username/status/1234567890
    //          https://twitter.com/username/status/1234567890
    private static final Pattern X_STATUS_PATTERN = Pattern.compile(
        "(?:x\\.com|twitter\\.com)/([a-zA-Z0-9_]+)/status/(\\d+)"
    );

    // ============================================================================
    // Facebook Reel URL Patterns
    // ============================================================================
    // Supports: https://www.facebook.com/reel/2296029477541954
    //          https://facebook.com/reel/2296029477541954
    //          https://m.facebook.com/reel/2296029477541954
    private static final Pattern FACEBOOK_REEL_PATTERN = Pattern.compile(
        "(?:www\\.|m\\.)?facebook\\.com/reel/(\\d+)"
    );

    // ============================================================================
    // Facebook Post/Video URL Patterns
    // ============================================================================
    // Supports: https://www.facebook.com/pagename/posts/pfbid...
    //          https://facebook.com/pagename/posts/pfbid...
    //          https://www.facebook.com/pagename/videos/123456
    //          https://www.facebook.com/watch/?v=123456
    //          https://www.facebook.com/photo/?fbid=123456
    private static final Pattern FACEBOOK_POST_PATTERN = Pattern.compile(
        "facebook\\.com/[^/]+/posts/"
    );

    // ============================================================================
    // Instagram Reel URL Patterns
    // ============================================================================
    // Supports: https://www.instagram.com/reel/ABC123xyz/?...
    //          https://instagram.com/reel/ABC123xyz/
    private static final Pattern INSTAGRAM_REEL_PATTERN = Pattern.compile(
        "(?:www\\.)?instagram\\.com/reel/([a-zA-Z0-9_-]+)"
    );

    /**
     * Supported social media platforms
     */
    public enum Platform {
        X_POST("X"),
        FACEBOOK_REEL("Facebook"),
        FACEBOOK_POST("Facebook"),
        INSTAGRAM_REEL("Instagram"),
        YOUTUBE("YouTube"),
        UNKNOWN("Unknown");

        private final String displayName;

        Platform(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }

    /**
     * Detects the platform type from a URL
     * 
     * @param url The URL to analyze
     * @return Platform enum or UNKNOWN if not recognized
     */
    public static Platform detectPlatform(String url) {
        if (url == null || url.trim().isEmpty()) {
            return Platform.UNKNOWN;
        }

        try {
            String normalizedUrl = normalizeUrl(url.trim());
            if (normalizedUrl == null) {
                return Platform.UNKNOWN;
            }

            // Check YouTube first (already has utility)
            if (YouTubeUtil.isValidYouTubeUrl(normalizedUrl)) {
                return Platform.YOUTUBE;
            }

            // Check X/Twitter
            if (X_STATUS_PATTERN.matcher(normalizedUrl).find()) {
                return Platform.X_POST;
            }

            // Check Facebook Reel (must check before generic post pattern)
            if (FACEBOOK_REEL_PATTERN.matcher(normalizedUrl).find()) {
                return Platform.FACEBOOK_REEL;
            }

            // Check Facebook Post/Video
            if (FACEBOOK_POST_PATTERN.matcher(normalizedUrl).find()) {
                return Platform.FACEBOOK_POST;
            }

            // Check Instagram Reel
            if (INSTAGRAM_REEL_PATTERN.matcher(normalizedUrl).find()) {
                return Platform.INSTAGRAM_REEL;
            }

            return Platform.UNKNOWN;
        } catch (Exception e) {
            log.warn("Error detecting platform for URL: {}", url, e);
            return Platform.UNKNOWN;
        }
    }

    /**
     * Validates if the URL is a supported social media URL
     * 
     * @param url The URL to validate
     * @return true if URL is from a supported platform
     */
    public static boolean isSupportedSocialMediaUrl(String url) {
        Platform platform = detectPlatform(url);
        return platform != Platform.UNKNOWN;
    }

    /**
     * Extracts platform-specific identifier from URL
     * 
     * @param url The social media URL
     * @return Extracted identifier or null if invalid
     */
    public static String extractIdentifier(String url) {
        if (url == null || url.trim().isEmpty()) {
            return null;
        }

        try {
            String normalizedUrl = normalizeUrl(url.trim());
            if (normalizedUrl == null) {
                return null;
            }

            Platform platform = detectPlatform(normalizedUrl);

            switch (platform) {
                case X_POST:
                    return extractXPostId(normalizedUrl);
                case FACEBOOK_REEL:
                    return extractFacebookReelId(normalizedUrl);
                case FACEBOOK_POST:
                    // For posts, we use the full URL as identifier (needed for embed)
                    return normalizedUrl;
                case INSTAGRAM_REEL:
                    return extractInstagramReelId(normalizedUrl);
                case YOUTUBE:
                    return YouTubeUtil.extractVideoId(normalizedUrl);
                default:
                    return null;
            }
        } catch (Exception e) {
            log.warn("Error extracting identifier from URL: {}", url, e);
            return null;
        }
    }

    /**
     * Extracts X/Twitter post ID from URL
     * Returns format: username/statusId
     */
    private static String extractXPostId(String url) {
        Matcher matcher = X_STATUS_PATTERN.matcher(url);
        if (matcher.find()) {
            String username = matcher.group(1);
            String statusId = matcher.group(2);
            return username + "/" + statusId;
        }
        return null;
    }

    /**
     * Extracts Facebook Reel ID from URL
     */
    private static String extractFacebookReelId(String url) {
        Matcher matcher = FACEBOOK_REEL_PATTERN.matcher(url);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return null;
    }

    /**
     * Extracts Instagram Reel ID from URL
     */
    private static String extractInstagramReelId(String url) {
        Matcher matcher = INSTAGRAM_REEL_PATTERN.matcher(url);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return null;
    }

    /**
     * Normalizes URLs to a standard format
     * Adds protocol if missing and validates URL format
     */
    private static String normalizeUrl(String url) {
        try {
            // Add protocol if missing
            if (!url.startsWith("http://") && !url.startsWith("https://")) {
                url = "https://" + url;
            }

            // Validate URL format
            new URL(url);
            
            return url;
        } catch (Exception e) {
            log.debug("Invalid URL format: {}", url);
            return null;
        }
    }

    /**
     * Normalizes and cleans a URL for storage
     * Removes query parameters and tracking parameters
     * 
     * @param url The URL to normalize
     * @return Clean URL without tracking parameters
     */
    public static String normalizeForStorage(String url) {
        if (url == null || url.trim().isEmpty()) {
            return null;
        }

        try {
            String normalized = normalizeUrl(url.trim());
            if (normalized == null) {
                return url.trim();
            }

            // Remove common tracking parameters but keep essential ones
            // For X/Twitter: Keep the status ID, remove tracking params
            if (detectPlatform(normalized) == Platform.X_POST) {
                // Extract base URL without query params for X posts
                int queryIndex = normalized.indexOf('?');
                if (queryIndex > 0) {
                    normalized = normalized.substring(0, queryIndex);
                }
            }

            // For Instagram: Remove tracking parameters
            if (detectPlatform(normalized) == Platform.INSTAGRAM_REEL) {
                int queryIndex = normalized.indexOf('?');
                if (queryIndex > 0) {
                    normalized = normalized.substring(0, queryIndex);
                }
            }

            return normalized;
        } catch (Exception e) {
            log.warn("Error normalizing URL for storage: {}", url, e);
            return url.trim();
        }
    }
}
