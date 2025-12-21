package com.churchapp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Event class for post comment-related WebSocket notifications
 * Used to broadcast comment notifications to connected clients via /user/queue/events
 * This allows comment notifications to appear in the Event Notification bell
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostCommentNotificationEvent {

    private String eventType; // "post_comment_received"
    private UUID commentId;
    private UUID postId;
    private String postContent; // First 100 chars for context
    private UUID commenterId;
    private String commenterName;
    private String commenterEmail; // For filtering own comments on frontend
    private String commentContent; // First 100 chars
    private UUID parentCommentId; // If reply to comment
    private String timestamp;
    private String actionUrl; // e.g., "/posts/abc-123#comment-xyz"

    /**
     * Static factory method for post comment notifications
     * Truncates content to 100 characters for notification preview
     */
    public static PostCommentNotificationEvent postCommentReceived(
            UUID commentId,
            UUID postId,
            String postContent,
            UUID commenterId,
            String commenterName,
            String commenterEmail,
            String commentContent,
            UUID parentCommentId) {
        return PostCommentNotificationEvent.builder()
                .eventType("post_comment_received")
                .commentId(commentId)
                .postId(postId)
                .postContent(truncate(postContent, 100))
                .commenterId(commenterId)
                .commenterName(commenterName)
                .commenterEmail(commenterEmail)
                .commentContent(truncate(commentContent, 100))
                .parentCommentId(parentCommentId)
                .timestamp(LocalDateTime.now().toString())
                .actionUrl("/posts/" + postId + "#comment-" + commentId)
                .build();
    }

    /**
     * Helper method to truncate text to specified length
     */
    private static String truncate(String text, int maxLength) {
        if (text == null) return "";
        return text.length() > maxLength ? text.substring(0, maxLength) + "..." : text;
    }
}
