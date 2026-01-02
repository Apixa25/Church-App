package com.churchapp.service;

import java.util.Optional;
import java.util.UUID;

import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.churchapp.dto.PublicResourceResponse;
import com.churchapp.entity.Resource;
import com.churchapp.entity.Resource.ResourceCategory;
import com.churchapp.repository.ResourceRepository;

import lombok.RequiredArgsConstructor;

/**
 * Service for handling public (unauthenticated) resource access.
 * Used for shareable link preview pages.
 */
@Service
@RequiredArgsConstructor
public class PublicResourceService {

    private static final int MAX_PREVIEW_LENGTH = 280;

    private final ResourceRepository resourceRepository;

    @Transactional(readOnly = true)
    public Optional<PublicResourceResponse> getShareableResource(UUID resourceId) {
        return resourceRepository.findById(resourceId)
            .filter(this::isShareable)
            .map(this::mapToResponse);
    }

    private boolean isShareable(Resource resource) {
        // Only approved resources can be shared publicly
        return resource != null && Boolean.TRUE.equals(resource.getIsApproved());
    }

    private PublicResourceResponse mapToResponse(Resource resource) {
        String uploaderName = resource.getUploadedBy() != null
            && StringUtils.isNotBlank(resource.getUploadedBy().getName())
            ? resource.getUploadedBy().getName()
            : "Church Member";
        String uploaderAvatar = resource.getUploadedBy() != null
            ? resource.getUploadedBy().getProfilePicUrl()
            : null;

        return PublicResourceResponse.builder()
            .id(resource.getId())
            .title(resource.getTitle())
            .descriptionPreview(buildPreview(resource.getDescription()))
            .category(resource.getCategory().name())
            .categoryLabel(getCategoryLabel(resource.getCategory()))
            .fileName(resource.getFileName())
            .fileUrl(resource.getFileUrl())
            .fileSize(resource.getFileSize())
            .fileType(resource.getFileType())
            .uploaderName(uploaderName)
            .uploaderAvatarUrl(uploaderAvatar)
            .youtubeUrl(resource.getYoutubeUrl())
            .youtubeVideoId(resource.getYoutubeVideoId())
            .youtubeThumbnailUrl(resource.getYoutubeThumbnailUrl())
            .youtubeTitle(resource.getYoutubeTitle())
            .youtubeDuration(resource.getYoutubeDuration())
            .youtubeChannel(resource.getYoutubeChannel())
            .downloadCount(resource.getDownloadCount())
            .shareCount(resource.getShareCount())
            .createdAt(resource.getCreatedAt())
            .heroImageUrl(resolveHeroImage(resource))
            .build();
    }

    private String buildPreview(String content) {
        if (StringUtils.isBlank(content)) {
            return "";
        }
        String normalized = content.replaceAll("\\s+", " ").trim();
        if (normalized.length() <= MAX_PREVIEW_LENGTH) {
            return normalized;
        }
        return normalized.substring(0, MAX_PREVIEW_LENGTH - 1).trim() + "…";
    }

    private String resolveHeroImage(Resource resource) {
        // Use YouTube thumbnail if available
        if (StringUtils.isNotBlank(resource.getYoutubeThumbnailUrl())) {
            return resource.getYoutubeThumbnailUrl();
        }
        // For image files, use the file URL
        if (resource.getFileType() != null && resource.getFileType().startsWith("image/")) {
            return resource.getFileUrl();
        }
        // Fallback handled on controller side
        return null;
    }

    private String getCategoryLabel(ResourceCategory category) {
        if (category == null) {
            return "General";
        }
        return switch (category) {
            case GENERAL -> "General";
            case BIBLE_STUDY -> "Bible Study";
            case DEVOTIONAL -> "Devotional";
            case SERMON -> "Sermon";
            case WORSHIP -> "Worship";
            case PRAYER -> "Prayer";
            case YOUTH -> "Youth";
            case CHILDREN -> "Children";
            case MENS_MINISTRY -> "Men's Ministry";
            case WOMENS_MINISTRY -> "Women's Ministry";
            case SMALL_GROUPS -> "Small Groups";
            case MINISTRY_RESOURCES -> "Ministry Resources";
            case ANNOUNCEMENTS -> "Announcements";
            case FORMS -> "Forms";
            case POLICIES -> "Policies";
            case TRAINING -> "Training";
            case MUSIC -> "Music";
            case AUDIO -> "Audio";
            case VIDEO -> "Video";
            case DOCUMENTS -> "Documents";
            case IMAGES -> "Images";
            case OTHER -> "Other";
        };
    }
}
