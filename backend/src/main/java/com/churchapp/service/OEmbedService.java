package com.churchapp.service;

import com.churchapp.util.SocialMediaUrlUtil;
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
                    // YouTube uses iframe embeds, not oEmbed API
                    // Can generate embed URL directly
                    return null;
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
}
