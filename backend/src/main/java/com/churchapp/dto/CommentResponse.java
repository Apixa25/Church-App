package com.churchapp.dto;

import com.churchapp.entity.PostComment;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CommentResponse {

    private UUID id;
    private UUID postId;
    private UUID userId;
    private String userName;
    private String userProfilePicUrl;
    private UUID parentCommentId;
    private String content;
    private List<String> mediaUrls;
    private List<String> mediaTypes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private boolean isAnonymous;
    private int likesCount;

    // Additional computed fields
    private boolean isLikedByCurrentUser;
    private int repliesCount;

    // Post preview info (for comments received view)
    private String postContent;
    private String postType;

    public static CommentResponse fromEntity(PostComment comment) {
        CommentResponse response = new CommentResponse();
        response.setId(comment.getId());
        response.setPostId(comment.getPost().getId());
        response.setUserId(comment.getUser().getId());
        response.setUserName(comment.getUser().getName());
        response.setUserProfilePicUrl(comment.getUser().getProfilePicUrl());
        response.setParentCommentId(comment.getParentComment() != null ?
            comment.getParentComment().getId() : null);
        response.setContent(comment.getContent());
        response.setMediaUrls(comment.getMediaUrls());
        response.setMediaTypes(comment.getMediaTypes());
        response.setCreatedAt(comment.getCreatedAt());
        response.setUpdatedAt(comment.getUpdatedAt());
        response.setAnonymous(comment.getIsAnonymous());
        response.setLikesCount(comment.getLikesCount());

        // Add post preview info
        if (comment.getPost() != null) {
            String content = comment.getPost().getContent();
            // Truncate to 100 chars for preview
            response.setPostContent(content != null && content.length() > 100
                ? content.substring(0, 100) + "..."
                : content);
            response.setPostType(comment.getPost().getPostType() != null
                ? comment.getPost().getPostType().name()
                : "GENERAL");
        }

        return response;
    }

    // Helper methods
    public boolean hasMedia() {
        return mediaUrls != null && !mediaUrls.isEmpty();
    }

    public boolean isReply() {
        return parentCommentId != null;
    }
}
