package com.churchapp.controller;

import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.apache.commons.text.StringEscapeUtils;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.churchapp.dto.PublicResourceResponse;
import com.churchapp.service.PublicResourceService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Controller for public (unauthenticated) resource access.
 * Provides shareable link preview functionality.
 */
@RestController
@RequestMapping("/public/resources")
@RequiredArgsConstructor
@Slf4j
public class PublicResourceController {

    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ISO_DATE_TIME;

    private final PublicResourceService publicResourceService;

    /**
     * Get public resource data as JSON (for frontend preview page).
     */
    @GetMapping("/{resourceId}")
    @PreAuthorize("permitAll()")
    public ResponseEntity<?> getPublicResource(@PathVariable UUID resourceId) {
        Optional<PublicResourceResponse> resource = publicResourceService.getShareableResource(resourceId);
        if (resource.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("message", "Resource not found or not available"));
        }
        return ResponseEntity.ok(resource.get());
    }

    /**
     * Render HTML preview page with Open Graph meta tags for social sharing.
     */
    @GetMapping(value = "/{resourceId}/preview", produces = MediaType.TEXT_HTML_VALUE)
    @PreAuthorize("permitAll()")
    public ResponseEntity<String> renderSharePreview(@PathVariable UUID resourceId, HttpServletRequest request) {
        Optional<PublicResourceResponse> resource = publicResourceService.getShareableResource(resourceId);
        if (resource.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(buildNotFoundPage());
        }

        PublicResourceResponse data = resource.get();
        String baseUrl = resolveBaseUrl(request);
        String html = buildSharePage(data, baseUrl);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(new MediaType("text", "html", StandardCharsets.UTF_8));
        return new ResponseEntity<>(html, headers, HttpStatus.OK);
    }

    private String buildSharePage(PublicResourceResponse resource, String baseUrl) {
        String canonicalUrl = baseUrl + "/public/resources/" + resource.getId() + "/preview";
        String appUrl = baseUrl + "/resources/" + resource.getId();
        String escapedTitle = StringEscapeUtils.escapeHtml4(resource.getTitle());
        String escapedPreview = StringEscapeUtils.escapeHtml4(resource.getDescriptionPreview());
        String escapedCategory = StringEscapeUtils.escapeHtml4(resource.getCategoryLabel());
        String escapedUploader = StringEscapeUtils.escapeHtml4(resource.getUploaderName());
        String imageUrl = resolveHeroImage(resource, baseUrl);
        String fileTypeIcon = getFileTypeIcon(resource.getFileType());
        String fileSizeFormatted = formatFileSize(resource.getFileSize());

        // Build download section HTML
        String downloadSection = "";
        if (resource.getFileUrl() != null && !resource.getFileUrl().isEmpty()) {
            downloadSection = """
                <a class="download-btn" href="%s" target="_blank" rel="noopener">
                  ⬇️ Download %s
                </a>
                """.formatted(resource.getFileUrl(), fileSizeFormatted.isEmpty() ? "File" : "(" + fileSizeFormatted + ")");
        }

        // Build YouTube section HTML
        String youtubeSection = "";
        if (resource.getYoutubeVideoId() != null && !resource.getYoutubeVideoId().isEmpty()) {
            youtubeSection = """
                <a class="youtube-btn" href="%s" target="_blank" rel="noopener">
                  ▶️ Watch on YouTube
                </a>
                """.formatted(resource.getYoutubeUrl());
        }

        return """
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="utf-8"/>
              <title>%s · Church App Resources</title>
              <meta name="viewport" content="width=device-width, initial-scale=1"/>
              <meta property="og:type" content="article"/>
              <meta property="og:title" content="%s"/>
              <meta property="og:description" content="%s"/>
              <meta property="og:image" content="%s"/>
              <meta property="og:url" content="%s"/>
              <meta property="article:author" content="%s"/>
              <meta property="article:published_time" content="%s"/>
              <meta name="twitter:card" content="summary_large_image"/>
              <meta name="twitter:title" content="%s"/>
              <meta name="twitter:description" content="%s"/>
              <meta name="twitter:image" content="%s"/>
              <link rel="canonical" href="%s"/>
              <style>
                * { box-sizing: border-box; }
                body { font-family: 'Segoe UI', system-ui, sans-serif; margin:0; background: linear-gradient(135deg, #0f172a, #1e293b 55%%, #111827); color:#f8fafc; min-height: 100vh; }
                .wrap { display:flex; flex-direction:column; align-items:center; gap:24px; padding:48px 16px; text-align:center; max-width: 800px; margin: 0 auto; }
                img.hero { max-width:640px; width:100%%; border-radius:18px; box-shadow:0 24px 80px rgba(15,23,42,0.45); object-fit: cover; max-height: 400px; }
                .file-icon { font-size: 80px; padding: 40px; background: rgba(30, 41, 59, 0.8); border-radius: 18px; box-shadow: 0 24px 80px rgba(15,23,42,0.45); }
                .category { display: inline-block; padding: 6px 16px; background: rgba(56, 189, 248, 0.2); color: #38bdf8; border-radius: 999px; font-size: 0.9rem; font-weight: 500; }
                h1 { font-size: clamp(1.75rem, 4vw, 2.5rem); margin: 8px 0 0 0; line-height: 1.3; }
                p.desc { font-size: clamp(1rem, 2vw, 1.2rem); max-width:640px; line-height:1.6; opacity:0.85; margin: 0; }
                .meta { display:flex; flex-direction:column; gap:8px; opacity:0.7; font-size: 0.95rem; }
                .stats { display: flex; gap: 24px; justify-content: center; font-size: 0.9rem; opacity: 0.8; }
                .stats span { display: flex; align-items: center; gap: 6px; }
                .actions { display: flex; flex-direction: column; gap: 12px; width: 100%%; max-width: 320px; }
                a.cta { display:inline-flex; align-items:center; justify-content: center; gap:8px; padding:14px 28px; background: linear-gradient(135deg, #38bdf8, #0ea5e9); color:#0f172a;
                        border-radius:12px; font-weight:600; text-decoration:none; transition:transform 150ms ease, box-shadow 150ms ease; }
                a.cta:hover { transform:translateY(-2px); box-shadow:0 18px 40px rgba(56,189,248,0.35); }
                a.download-btn { display:inline-flex; align-items:center; justify-content: center; gap:8px; padding:12px 24px; background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3);
                        border-radius:12px; font-weight:500; text-decoration:none; transition:all 150ms ease; }
                a.download-btn:hover { background: rgba(16, 185, 129, 0.25); transform:translateY(-2px); }
                a.youtube-btn { display:inline-flex; align-items:center; justify-content: center; gap:8px; padding:12px 24px; background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3);
                        border-radius:12px; font-weight:500; text-decoration:none; transition:all 150ms ease; }
                a.youtube-btn:hover { background: rgba(239, 68, 68, 0.25); transform:translateY(-2px); }
              </style>
            </head>
            <body>
              <div class="wrap">
                %s
                <span class="category">%s</span>
                <h1>%s</h1>
                <p class="desc">%s</p>
                <div class="meta">
                  <span>Shared by %s</span>
                  <span>%s</span>
                </div>
                <div class="stats">
                  <span>⬇️ %d downloads</span>
                  <span>🔗 %d shares</span>
                </div>
                <div class="actions">
                  %s
                  %s
                  <a class="cta" href="%s">Open in Church App →</a>
                </div>
              </div>
            </body>
            </html>
            """.formatted(
                escapedTitle,
                escapedTitle,
                escapedPreview,
                imageUrl,
                canonicalUrl,
                escapedUploader,
                resource.getCreatedAt() != null ? ISO_FORMATTER.format(resource.getCreatedAt()) : "",
                escapedTitle,
                escapedPreview,
                imageUrl,
                canonicalUrl,
                buildHeroSection(resource, imageUrl, fileTypeIcon),
                escapedCategory,
                escapedTitle,
                escapedPreview,
                escapedUploader,
                resource.getCreatedAt() != null ? formatDate(resource) : "",
                resource.getDownloadCount() != null ? resource.getDownloadCount() : 0,
                resource.getShareCount() != null ? resource.getShareCount() : 0,
                downloadSection,
                youtubeSection,
                appUrl
            );
    }

    private String buildHeroSection(PublicResourceResponse resource, String imageUrl, String fileTypeIcon) {
        // If YouTube video, show thumbnail
        if (resource.getYoutubeThumbnailUrl() != null && !resource.getYoutubeThumbnailUrl().isEmpty()) {
            return "<img class=\"hero\" src=\"" + resource.getYoutubeThumbnailUrl() + "\" alt=\"Video thumbnail\"/>";
        }
        // If image file, show the image
        if (resource.getFileType() != null && resource.getFileType().startsWith("image/") && resource.getFileUrl() != null) {
            return "<img class=\"hero\" src=\"" + resource.getFileUrl() + "\" alt=\"Resource image\"/>";
        }
        // Otherwise show file type icon
        return "<div class=\"file-icon\">" + fileTypeIcon + "</div>";
    }

    private String resolveBaseUrl(HttpServletRequest request) {
        String scheme = request.getScheme();
        String serverName = request.getServerName();
        int serverPort = request.getServerPort();

        StringBuilder builder = new StringBuilder();
        builder.append(scheme).append("://").append(serverName);
        if ((scheme.equals("http") && serverPort != 80) ||
            (scheme.equals("https") && serverPort != 443)) {
            builder.append(':').append(serverPort);
        }
        return builder.toString();
    }

    private String buildNotFoundPage() {
        return """
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="utf-8"/>
              <title>Resource not available · Church App</title>
              <meta name="viewport" content="width=device-width, initial-scale=1"/>
              <style>
                body { font-family: 'Segoe UI', sans-serif; margin:0; background:#111827; color:#f9fafb; display:flex; align-items:center; justify-content:center; height:100vh; }
                .card { max-width:420px; padding:40px; border-radius:18px; background:rgba(30,41,59,0.85); box-shadow:0 36px 80px rgba(15,23,42,0.35); text-align:center; }
                .card h1 { margin-bottom:16px; font-size:1.9rem; }
                .card p { opacity:0.8; line-height:1.6; }
              </style>
            </head>
            <body>
              <div class="card">
                <h1>📚 Resource not available</h1>
                <p>This shared link may have expired or the resource is no longer publicly available.</p>
              </div>
            </body>
            </html>
            """;
    }

    private String resolveHeroImage(PublicResourceResponse resource, String baseUrl) {
        if (resource.getYoutubeThumbnailUrl() != null && !resource.getYoutubeThumbnailUrl().isEmpty()) {
            return resource.getYoutubeThumbnailUrl();
        }
        if (resource.getFileType() != null && resource.getFileType().startsWith("image/") && resource.getFileUrl() != null) {
            return resource.getFileUrl();
        }
        if (resource.getHeroImageUrl() != null) {
            if (resource.getHeroImageUrl().startsWith("http")) {
                return resource.getHeroImageUrl();
            }
            return baseUrl + resource.getHeroImageUrl();
        }
        return baseUrl + "/dashboard-banner.jpg";
    }

    private String getFileTypeIcon(String fileType) {
        if (fileType == null) {
            return "📄";
        }
        if (fileType.startsWith("image/")) {
            return "🖼️";
        }
        if (fileType.startsWith("video/") || fileType.equals("video/youtube")) {
            return "🎬";
        }
        if (fileType.startsWith("audio/")) {
            return "🎵";
        }
        if (fileType.contains("pdf")) {
            return "📕";
        }
        if (fileType.contains("word") || fileType.contains("document")) {
            return "📝";
        }
        if (fileType.contains("sheet") || fileType.contains("excel")) {
            return "📊";
        }
        if (fileType.contains("presentation") || fileType.contains("powerpoint")) {
            return "📽️";
        }
        return "📄";
    }

    private String formatFileSize(Long bytes) {
        if (bytes == null || bytes == 0) {
            return "";
        }
        if (bytes < 1024) {
            return bytes + " B";
        }
        if (bytes < 1024 * 1024) {
            return String.format("%.1f KB", bytes / 1024.0);
        }
        if (bytes < 1024 * 1024 * 1024) {
            return String.format("%.1f MB", bytes / (1024.0 * 1024));
        }
        return String.format("%.2f GB", bytes / (1024.0 * 1024 * 1024));
    }

    private String formatDate(PublicResourceResponse resource) {
        if (resource.getCreatedAt() == null) {
            return "";
        }
        return resource.getCreatedAt().format(DateTimeFormatter.ofPattern("MMMM d, yyyy"));
    }
}
