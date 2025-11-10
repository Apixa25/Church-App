package com.churchapp.service;

import java.util.Optional;
import java.util.UUID;

import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.churchapp.dto.PublicPostResponse;
import com.churchapp.entity.Post;
import com.churchapp.entity.Post.PostType;
import com.churchapp.repository.PostRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PublicPostService {

    private static final int MAX_PREVIEW_LENGTH = 280;

    private final PostRepository postRepository;

    @Transactional(readOnly = true)
    public Optional<PublicPostResponse> getShareablePost(UUID postId) {
        return postRepository.findById(postId)
            .filter(this::isShareable)
            .map(this::mapToResponse);
    }

    private boolean isShareable(Post post) {
        if (post == null || Boolean.TRUE.equals(post.getIsAnonymous())) {
            return false;
        }
        // Future: respect per-post privacy flags once implemented
        return true;
    }

    private PublicPostResponse mapToResponse(Post post) {
        String authorName = post.getUser() != null && StringUtils.isNotBlank(post.getUser().getName())
            ? post.getUser().getName()
            : "Church Member";
        String authorAvatar = post.getUser() != null ? post.getUser().getProfilePicUrl() : null;

        return PublicPostResponse.builder()
            .id(post.getId())
            .title(resolveTitle(post, authorName))
            .contentPreview(buildPreview(post.getContent()))
            .postType(post.getPostType().name())
            .authorName(authorName)
            .authorAvatarUrl(authorAvatar)
            .heroImageUrl(resolveHeroImage(post))
            .createdAt(post.getCreatedAt())
            .updatedAt(post.getUpdatedAt())
            .shareable(true)
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

    private String resolveTitle(Post post, String authorName) {
        if (post.getPostType() == PostType.ANNOUNCEMENT && StringUtils.isNotBlank(post.getCategory())) {
            return post.getCategory();
        }
        if (post.getPostType() == PostType.TESTIMONY) {
            return "Testimony from " + authorName;
        }
        if (post.getPostType() == PostType.PRAYER) {
            return "Prayer Request";
        }
        if (post.getPostType() == PostType.GENERAL && StringUtils.isNotBlank(post.getCategory())) {
            return "Community Update · " + post.getCategory();
        }
        return "Church Community Update";
    }

    private String resolveHeroImage(Post post) {
        if (post.getMediaUrls() != null && !post.getMediaUrls().isEmpty()) {
            return post.getMediaUrls().get(0);
        }
        // Fallback to a neutral image handled on controller side
        return null;
    }
}
