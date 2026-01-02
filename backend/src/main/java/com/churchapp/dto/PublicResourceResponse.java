package com.churchapp.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import lombok.Builder;
import lombok.Value;

/**
 * DTO for public resource data (no authentication required).
 * Used for shareable link preview pages.
 */
@Value
@Builder
public class PublicResourceResponse {
    UUID id;
    String title;
    String descriptionPreview;
    String category;
    String categoryLabel;

    // File info
    String fileName;
    String fileUrl;
    Long fileSize;
    String fileType;

    // Uploader info
    String uploaderName;
    String uploaderAvatarUrl;

    // YouTube info (if applicable)
    String youtubeUrl;
    String youtubeVideoId;
    String youtubeThumbnailUrl;
    String youtubeTitle;
    String youtubeDuration;
    String youtubeChannel;

    // Metadata
    Integer downloadCount;
    Integer shareCount;
    LocalDateTime createdAt;

    // For hero image in social previews
    String heroImageUrl;
}
