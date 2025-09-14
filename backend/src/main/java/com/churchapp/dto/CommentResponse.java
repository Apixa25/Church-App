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
