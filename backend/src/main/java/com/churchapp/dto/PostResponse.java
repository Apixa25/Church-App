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

    // Additional computed fields
    private boolean isLikedByCurrentUser;
    private boolean isBookmarkedByCurrentUser;

    public static PostResponse fromEntity(Post post) {
        PostResponse response = new PostResponse();
        response.setId(post.getId());
        response.setUserId(post.getUser().getId());
        response.setUserName(post.getUser().getName());
        response.setUserProfilePicUrl(post.getUser().getProfilePicUrl());
        response.setContent(post.getContent());
        response.setMediaUrls(post.getMediaUrls());
        response.setMediaTypes(post.getMediaTypes());

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
