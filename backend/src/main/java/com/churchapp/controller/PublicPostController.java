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

import com.churchapp.dto.PublicPostResponse;
import com.churchapp.service.PublicPostService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/public")
@RequiredArgsConstructor
@Slf4j
public class PublicPostController {

    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ISO_DATE_TIME;

    private final PublicPostService publicPostService;

    @GetMapping("/posts/{postId}")
    @PreAuthorize("permitAll()")
    public ResponseEntity<?> getPublicPost(@PathVariable UUID postId) {
        Optional<PublicPostResponse> post = publicPostService.getShareablePost(postId);
        if (post.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("message", "Post not found or not shareable"));
        }
        return ResponseEntity.ok(post.get());
    }

    @GetMapping(value = "/posts/{postId}/preview", produces = MediaType.TEXT_HTML_VALUE)
    @PreAuthorize("permitAll()")
    public ResponseEntity<String> renderSharePreview(@PathVariable UUID postId, HttpServletRequest request) {
        Optional<PublicPostResponse> post = publicPostService.getShareablePost(postId);
        if (post.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(buildNotFoundPage());
        }

        PublicPostResponse data = post.get();
        String baseUrl = resolveBaseUrl(request);
        String html = buildSharePage(data, baseUrl);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(new MediaType("text", "html", StandardCharsets.UTF_8));
        return new ResponseEntity<>(html, headers, HttpStatus.OK);
    }

    private String buildSharePage(PublicPostResponse post, String baseUrl) {
        String canonicalUrl = baseUrl + "/posts/" + post.getId();
        String escapedTitle = StringEscapeUtils.escapeHtml4(post.getTitle());
        String escapedPreview = StringEscapeUtils.escapeHtml4(post.getContentPreview());
        String escapedAuthor = StringEscapeUtils.escapeHtml4(post.getAuthorName());
        String imageUrl = resolveHeroImage(post, baseUrl);

        return """
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="utf-8"/>
              <title>%s · Church App</title>
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
                body { font-family: 'Segoe UI', sans-serif; margin:0; background:#0f172a; color:#f8fafc; }
                .wrap { display:flex; flex-direction:column; align-items:center; gap:24px; padding:48px 16px; text-align:center; }
                img.hero { max-width:640px; width:100%%; border-radius:18px; box-shadow:0 24px 80px rgba(15,23,42,0.45); }
                h1 { font-size: clamp(2rem, 4vw, 3rem); margin:0; }
                p.desc { font-size: clamp(1rem, 2vw, 1.35rem); max-width:640px; line-height:1.6; opacity:0.9; }
                .meta { display:flex; flex-direction:column; gap:8px; opacity:0.8; }
                a.cta { display:inline-flex; align-items:center; gap:8px; padding:14px 28px; background:#38bdf8; color:#0f172a;
                        border-radius:999px; font-weight:600; text-decoration:none; transition:transform 150ms ease, box-shadow 150ms ease; }
                a.cta:hover { transform:translateY(-3px); box-shadow:0 18px 40px rgba(56,189,248,0.35); }
              </style>
            </head>
            <body>
              <div class="wrap">
                <img class="hero" src="%s" alt="Shared post visual"/>
                <h1>%s</h1>
                <p class="desc">%s</p>
                <div class="meta">
                  <span>Shared by %s</span>
                  <span>%s</span>
                </div>
                <a class="cta" href="%s">Open in Church App →</a>
              </div>
            </body>
            </html>
            """.formatted(
                escapedTitle,
                escapedTitle,
                escapedPreview,
                imageUrl,
                canonicalUrl,
                escapedAuthor,
                post.getCreatedAt() != null ? ISO_FORMATTER.format(post.getCreatedAt()) : "",
                escapedTitle,
                escapedPreview,
                imageUrl,
                canonicalUrl,
                imageUrl,
                escapedTitle,
                escapedPreview,
                escapedAuthor,
                post.getCreatedAt() != null ? ISO_FORMATTER.format(post.getCreatedAt()) : "",
                canonicalUrl
            );
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
              <title>Post not available · Church App</title>
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
                <h1>🙈 Post not available</h1>
                <p>This shared link may have expired or belongs to private content inside the Church App.</p>
              </div>
            </body>
            </html>
            """;
    }

    private String resolveHeroImage(PublicPostResponse post, String baseUrl) {
        if (post.getHeroImageUrl() != null) {
            if (post.getHeroImageUrl().startsWith("http")) {
                return post.getHeroImageUrl();
            }
            return baseUrl + post.getHeroImageUrl();
        }
        return baseUrl + "/dashboard-banner.jpg";
    }
}

