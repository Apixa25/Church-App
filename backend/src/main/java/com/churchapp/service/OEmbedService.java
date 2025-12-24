package com.churchapp.service;

import com.churchapp.util.SocialMediaUrlUtil;
import com.churchapp.util.YouTubeUtil;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/**
 * Service for fetching oEmbed data from social media platforms
 * Industry Standard: Following X.com's approach to embedding external content
 * 
 * Supports:
 * - X (Twitter): No authentication required
 * - Facebook/Instagram: Requires App Access Token (to be configured in Phase 2)
 */
@Service
@Slf4j
public class OEmbedService {

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    // oEmbed endpoints
    private static final String X_OEMBED_ENDPOINT = "https://publish.twitter.com/oembed";
    private static final String YOUTUBE_OEMBED_ENDPOINT = "https://www.youtube.com/oembed";
    private static final String FACEBOOK_OEMBED_ENDPOINT = "https://graph.facebook.com/v19.0/oembed_post";
    private static final String INSTAGRAM_OEMBED_ENDPOINT = "https://graph.facebook.com/v19.0/instagram_oembed";

    public OEmbedService() {
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Fetches oEmbed data for a social media URL
     * 
     * @param url The social media URL
     * @return OEmbedResponse with HTML and metadata, or null if failed
     */
    public OEmbedResponse fetchOEmbed(String url) {
        if (url == null || url.trim().isEmpty()) {
            log.warn("Cannot fetch oEmbed: URL is null or empty");
            return null;
        }

        SocialMediaUrlUtil.Platform platform = SocialMediaUrlUtil.detectPlatform(url);
        
        try {
            switch (platform) {
                case X_POST:
                    return fetchXOEmbed(url);
                case FACEBOOK_REEL:
                    log.info("Facebook Reel oEmbed requires App Access Token (Phase 2)");
                    return null; // Will implement in Phase 2
                case INSTAGRAM_REEL:
                    log.info("Instagram Reel oEmbed requires App Access Token (Phase 2)");
                    return null; // Will implement in Phase 2
                case YOUTUBE:
                    return fetchYouTubeOEmbed(url);
                default:
                    log.warn("Unsupported platform for oEmbed: {}", platform);
                    return null;
            }
        } catch (Exception e) {
            log.error("Error fetching oEmbed for URL: {}", url, e);
            return null;
        }
    }

    /**
     * Fetches oEmbed data from X (Twitter)
     * No authentication required
     * 
     * API Documentation: https://developer.x.com/en/docs/twitter-for-websites/oembed-api
     */
    private OEmbedResponse fetchXOEmbed(String tweetUrl) {
        try {
            // Normalize URL - X oEmbed requires clean URL
            String normalizedUrl = SocialMediaUrlUtil.normalizeForStorage(tweetUrl);
            
            // Build oEmbed request URL
            String oembedUrl = X_OEMBED_ENDPOINT + 
                "?url=" + URLEncoder.encode(normalizedUrl, StandardCharsets.UTF_8) +
                "&omit_script=true" +  // Don't include Twitter widget script (we'll handle it)
                "&dnt=true";           // Do Not Track

            log.debug("Fetching X oEmbed from: {}", oembedUrl);

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(oembedUrl))
                .timeout(Duration.ofSeconds(10))
                .GET()
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.warn("X oEmbed API returned status {} for URL: {}", response.statusCode(), tweetUrl);
                return null;
            }

            // Parse JSON response
            XOEmbedResponse xResponse = objectMapper.readValue(response.body(), XOEmbedResponse.class);
            
            if (xResponse.getHtml() == null || xResponse.getHtml().isEmpty()) {
                log.warn("X oEmbed response missing HTML for URL: {}", tweetUrl);
                return null;
            }

            // Convert to our standard format
            OEmbedResponse oEmbedResponse = new OEmbedResponse();
            oEmbedResponse.setHtml(xResponse.getHtml());
            oEmbedResponse.setType(xResponse.getType());
            oEmbedResponse.setWidth(xResponse.getWidth());
            oEmbedResponse.setHeight(xResponse.getHeight());
            oEmbedResponse.setTitle(xResponse.getAuthorName() + " on X");
            oEmbedResponse.setAuthorName(xResponse.getAuthorName());
            oEmbedResponse.setAuthorUrl(xResponse.getAuthorUrl());
            oEmbedResponse.setProviderName("X");
            oEmbedResponse.setProviderUrl("https://x.com");
            oEmbedResponse.setUrl(xResponse.getUrl());
            oEmbedResponse.setPlatform(SocialMediaUrlUtil.Platform.X_POST);

            log.info("Successfully fetched X oEmbed for URL: {}", tweetUrl);
            return oEmbedResponse;

        } catch (IOException e) {
            log.error("IO error fetching X oEmbed for URL: {}", tweetUrl, e);
            return null;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while fetching X oEmbed for URL: {}", tweetUrl, e);
            return null;
        } catch (Exception e) {
            log.error("Unexpected error fetching X oEmbed for URL: {}", tweetUrl, e);
            return null;
        }
    }

    /**
     * Fetches oEmbed data from YouTube
     * No authentication required
     *
     * API Documentation: https://oembed.com/
     * YouTube returns: title, author_name, author_url, thumbnail_url, html (iframe), type, etc.
     */
    private OEmbedResponse fetchYouTubeOEmbed(String youtubeUrl) {
        try {
            // Use YouTubeUtil to extract video ID
            String videoId = YouTubeUtil.extractVideoId(youtubeUrl);
            if (videoId == null) {
                log.warn("Could not extract video ID from YouTube URL: {}", youtubeUrl);
                return null;
            }

            // Generate canonical watch URL for oEmbed request
            String canonicalUrl = YouTubeUtil.generateWatchUrl(videoId);

            // Build oEmbed request URL
            String oembedUrl = YOUTUBE_OEMBED_ENDPOINT +
                "?url=" + URLEncoder.encode(canonicalUrl, StandardCharsets.UTF_8) +
                "&format=json";

            log.debug("Fetching YouTube oEmbed from: {}", oembedUrl);

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(oembedUrl))
                .timeout(Duration.ofSeconds(10))
                .GET()
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.warn("YouTube oEmbed API returned status {} for URL: {}", response.statusCode(), youtubeUrl);
                return null;
            }

            // Parse JSON response
            YouTubeOEmbedResponse ytResponse = objectMapper.readValue(response.body(), YouTubeOEmbedResponse.class);

            if (ytResponse.getTitle() == null) {
                log.warn("YouTube oEmbed response missing title for URL: {}", youtubeUrl);
                return null;
            }

            // Store JSON metadata for frontend flexibility (lazy loading, custom UI)
            String thumbnailUrl = ytResponse.getThumbnailUrl() != null
                ? ytResponse.getThumbnailUrl()
                : YouTubeUtil.generateThumbnailUrl(videoId);

            String embedDataJson = String.format(
                "{\"videoId\":\"%s\",\"title\":\"%s\",\"authorName\":\"%s\",\"authorUrl\":\"%s\",\"thumbnailUrl\":\"%s\"}",
                escapeJsonString(videoId),
                escapeJsonString(ytResponse.getTitle()),
                escapeJsonString(ytResponse.getAuthorName() != null ? ytResponse.getAuthorName() : ""),
                escapeJsonString(ytResponse.getAuthorUrl() != null ? ytResponse.getAuthorUrl() : ""),
                escapeJsonString(thumbnailUrl)
            );

            // Convert to our standard format
            OEmbedResponse oEmbedResponse = new OEmbedResponse();
            oEmbedResponse.setHtml(embedDataJson);
            oEmbedResponse.setType(ytResponse.getType());
            oEmbedResponse.setWidth(ytResponse.getWidth());
            oEmbedResponse.setHeight(ytResponse.getHeight());
            oEmbedResponse.setTitle(ytResponse.getTitle());
            oEmbedResponse.setAuthorName(ytResponse.getAuthorName());
            oEmbedResponse.setAuthorUrl(ytResponse.getAuthorUrl());
            oEmbedResponse.setProviderName("YouTube");
            oEmbedResponse.setProviderUrl("https://www.youtube.com");
            oEmbedResponse.setUrl(canonicalUrl);
            oEmbedResponse.setPlatform(SocialMediaUrlUtil.Platform.YOUTUBE);

            log.info("Successfully fetched YouTube oEmbed for URL: {} (title: {})", youtubeUrl, ytResponse.getTitle());
            return oEmbedResponse;

        } catch (IOException e) {
            log.error("IO error fetching YouTube oEmbed for URL: {}", youtubeUrl, e);
            return null;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while fetching YouTube oEmbed for URL: {}", youtubeUrl, e);
            return null;
        } catch (Exception e) {
            log.error("Unexpected error fetching YouTube oEmbed for URL: {}", youtubeUrl, e);
            return null;
        }
    }

    /**
     * Escapes special characters for JSON string values
     */
    private String escapeJsonString(String value) {
        if (value == null) return "";
        return value
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "\\r")
            .replace("\t", "\\t");
    }

    /**
     * Standard oEmbed response format
     */
    @Data
    public static class OEmbedResponse {
        private String html;
        private String type;
        private Integer width;
        private Integer height;
        private String title;
        private String authorName;
        private String authorUrl;
        private String providerName;
        private String providerUrl;
        private String url;
        private SocialMediaUrlUtil.Platform platform;
    }

    /**
     * X (Twitter) oEmbed response format
     * Reference: https://developer.x.com/en/docs/twitter-for-websites/oembed-api
     */
    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class XOEmbedResponse {
        private String html;
        
        @JsonProperty("cache_age")
        private String cacheAge;
        
        private String type;
        private String url;
        private Integer width;
        private Integer height;
        
        @JsonProperty("author_name")
        private String authorName;
        
        @JsonProperty("author_url")
        private String authorUrl;
        
        @JsonProperty("provider_name")
        private String providerName;
        
        @JsonProperty("provider_url")
        private String providerUrl;
    }

    /**
     * YouTube oEmbed response format
     * Reference: https://oembed.com/ and YouTube oEmbed API
     */
    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class YouTubeOEmbedResponse {
        private String title;

        @JsonProperty("author_name")
        private String authorName;

        @JsonProperty("author_url")
        private String authorUrl;

        private String type;  // "video"
        private Integer height;
        private Integer width;
        private String version;

        @JsonProperty("provider_name")
        private String providerName;  // "YouTube"

        @JsonProperty("provider_url")
        private String providerUrl;   // "https://www.youtube.com/"

        @JsonProperty("thumbnail_url")
        private String thumbnailUrl;

        @JsonProperty("thumbnail_width")
        private Integer thumbnailWidth;

        @JsonProperty("thumbnail_height")
        private Integer thumbnailHeight;

        private String html;  // YouTube returns an iframe HTML
    }
}
