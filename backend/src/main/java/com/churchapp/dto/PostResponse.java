package com.churchapp.dto;

import com.churchapp.entity.Post;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PostResponse {

    private UUID id;
    private UUID userId;
    private String userName;
    private String userProfilePicUrl;
    private String content;
    private List<String> mediaUrls;
    private List<String> mediaTypes;
    private List<String> thumbnailUrls;
    private UUID parentPostId;
    private UUID quotedPostId;
    private boolean isReply;
    private boolean isQuote;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Post.PostType postType;
    private boolean isAnonymous;
    private String category;
    private String location;
    private int likesCount;
    private int commentsCount;
    private int sharesCount;
    private int bookmarksCount;

    // Social media embed fields
    private String externalUrl;         // Original URL of the shared social media content
    private String externalPlatform;    // Platform type: X_POST, FACEBOOK_REEL, INSTAGRAM_REEL, YOUTUBE
    private String externalEmbedHtml;   // oEmbed HTML response for rendering embedded content

    // Additional computed fields
    private boolean isLikedByCurrentUser;
    private boolean isBookmarkedByCurrentUser;

    // Organization and Group info for post labeling
    private OrganizationInfo organization;
    private GroupInfo group;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrganizationInfo {
        private UUID id;
        private String name;
        private String type;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GroupInfo {
        private UUID id;
        private String name;
    }

    public static PostResponse fromEntity(Post post) {
        PostResponse response = new PostResponse();
        response.setId(post.getId());
        response.setUserId(post.getUser().getId());
        response.setUserName(post.getUser().getName());
        response.setUserProfilePicUrl(post.getUser().getProfilePicUrl());
        response.setContent(post.getContent());
        response.setMediaUrls(post.getMediaUrls());
        response.setMediaTypes(post.getMediaTypes());
        response.setThumbnailUrls(post.getThumbnailUrls());

        if (post.getParentPost() != null) {
            response.setParentPostId(post.getParentPost().getId());
        }
        if (post.getQuotedPost() != null) {
            response.setQuotedPostId(post.getQuotedPost().getId());
        }

        response.setReply(post.getIsReply());
        response.setQuote(post.getIsQuote());
        response.setCreatedAt(post.getCreatedAt());
        response.setUpdatedAt(post.getUpdatedAt());
        response.setPostType(post.getPostType());
        response.setAnonymous(post.getIsAnonymous());
        response.setCategory(post.getCategory());
        response.setLocation(post.getLocation());
        response.setLikesCount(post.getLikesCount());
        response.setCommentsCount(post.getCommentsCount());
        response.setSharesCount(post.getSharesCount());
        response.setBookmarksCount(post.getBookmarksCount());

        // Map social media embed fields if present
        response.setExternalUrl(post.getExternalUrl());
        response.setExternalPlatform(post.getExternalPlatform());
        response.setExternalEmbedHtml(post.getExternalEmbedHtml());

        // Map organization info if present
        if (post.getOrganization() != null) {
            OrganizationInfo orgInfo = new OrganizationInfo();
            orgInfo.setId(post.getOrganization().getId());
            orgInfo.setName(post.getOrganization().getName());
            orgInfo.setType(post.getOrganization().getType().toString());
            response.setOrganization(orgInfo);
        }

        // Map group info if present
        if (post.getGroup() != null) {
            GroupInfo groupInfo = new GroupInfo();
            groupInfo.setId(post.getGroup().getId());
            groupInfo.setName(post.getGroup().getName());
            response.setGroup(groupInfo);
        }

        return response;
    }

    // Helper methods
    public boolean hasMedia() {
        return mediaUrls != null && !mediaUrls.isEmpty();
    }

    public boolean isThreadReply() {
        return parentPostId != null;
    }

    public boolean isQuotePost() {
        return quotedPostId != null;
    }
}
