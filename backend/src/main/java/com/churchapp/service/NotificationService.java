package com.churchapp.service;

import com.churchapp.entity.Post;
import com.churchapp.entity.PostComment;
import com.churchapp.entity.User;
import com.churchapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final UserRepository userRepository;

    public enum NotificationType {
        POST_LIKE,
        POST_COMMENT,
        POST_SHARE,
        COMMENT_REPLY,
        POST_MENTION,
        COMMENT_MENTION,
        NEW_FOLLOWER
    }

    /**
     * Notify user about a post like
     */
    public void notifyPostLike(UUID postId, UUID likerUserId) {
        // Find post owner
        // In a real implementation, you'd have a Post repository method to find post with user
        // For now, we'll log the notification
        log.info("Notification: User {} liked post {}", likerUserId, postId);
    }

    /**
     * Notify user about a new comment on their post
     */
    public void notifyPostComment(UUID postId, UUID commenterUserId, String commentContent) {
        log.info("Notification: User {} commented on post {}: {}", commenterUserId, postId,
                commentContent.substring(0, Math.min(50, commentContent.length())));
    }

    /**
     * Notify user about a reply to their comment
     */
    public void notifyCommentReply(UUID commentId, UUID replierUserId, String replyContent) {
        log.info("Notification: User {} replied to comment {}: {}", replierUserId, commentId,
                replyContent.substring(0, Math.min(50, replyContent.length())));
    }

    /**
     * Notify mentioned users in posts
     */
    public void notifyPostMentions(UUID postId, String content) {
        // Extract @mentions from content
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("@(\\w+)");
        java.util.regex.Matcher matcher = pattern.matcher(content);

        while (matcher.find()) {
            String username = matcher.group(1);
            log.info("Notification: Post {} mentioned @{}", postId, username);
        }
    }

    /**
     * Notify mentioned users in comments
     */
    public void notifyCommentMentions(UUID commentId, String content) {
        // Extract @mentions from content
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("@(\\w+)");
        java.util.regex.Matcher matcher = pattern.matcher(content);

        while (matcher.find()) {
            String username = matcher.group(1);
            log.info("Notification: Comment {} mentioned @{}", commentId, username);
        }
    }

    /**
     * Notify user about a new follower
     */
    public void notifyNewFollower(UUID followedUserId, UUID followerUserId) {
        log.info("Notification: User {} started following user {}", followerUserId, followedUserId);
    }

    /**
     * Notify user about post share
     */
    public void notifyPostShare(UUID postId, UUID sharerUserId) {
        log.info("Notification: User {} shared post {}", sharerUserId, postId);
    }

    /**
     * Send push notification (placeholder for future implementation)
     */
    private void sendPushNotification(UUID userId, String title, String message, String actionUrl) {
        // In a real implementation, this would integrate with FCM/APNs
        log.info("Push notification for user {}: {} - {}", userId, title, message);
    }

    /**
     * Send email notification (placeholder for future implementation)
     */
    private void sendEmailNotification(String email, String subject, String message) {
        // In a real implementation, this would integrate with email service
        log.info("Email notification to {}: {}", email, subject);
    }

    /**
     * Check if user has notifications enabled
     */
    private boolean areNotificationsEnabled(UUID userId, NotificationType type) {
        // In a real implementation, this would check user preferences
        return true; // Default to enabled
    }

    /**
     * Process notification based on user preferences
     */
    private void processNotification(UUID userId, NotificationType type, String title,
                                   String message, String actionUrl) {
        if (!areNotificationsEnabled(userId, type)) {
            return;
        }

        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            log.warn("Cannot send notification: user {} not found", userId);
            return;
        }

        // Send push notification
        sendPushNotification(userId, title, message, actionUrl);

        // Send email for important notifications
        if (type == NotificationType.NEW_FOLLOWER || type == NotificationType.POST_MENTION) {
            sendEmailNotification(user.getEmail(), title, message);
        }
    }

    /**
     * Batch process notifications (for performance)
     */
    public void processPendingNotifications() {
        // In a real implementation, this would process queued notifications
        log.info("Processing pending notifications...");
    }

    /**
     * Clean up old notifications
     */
    public void cleanupOldNotifications() {
        // In a real implementation, this would delete old notifications
        log.info("Cleaning up old notifications...");
    }

    /**
     * Get notification preferences for user
     */
    public NotificationPreferences getUserNotificationPreferences(UUID userId) {
        // In a real implementation, this would fetch from database
        return new NotificationPreferences(true, true, true, true, true);
    }

    /**
     * Update notification preferences for user
     */
    public void updateUserNotificationPreferences(UUID userId, NotificationPreferences preferences) {
        // In a real implementation, this would save to database
        log.info("Updated notification preferences for user {}", userId);
    }

    /**
     * Notification preferences data class
     */
    public static class NotificationPreferences {
        private boolean likesEnabled;
        private boolean commentsEnabled;
        private boolean sharesEnabled;
        private boolean mentionsEnabled;
        private boolean followersEnabled;

        public NotificationPreferences(boolean likesEnabled, boolean commentsEnabled,
                                    boolean sharesEnabled, boolean mentionsEnabled,
                                    boolean followersEnabled) {
            this.likesEnabled = likesEnabled;
            this.commentsEnabled = commentsEnabled;
            this.sharesEnabled = sharesEnabled;
            this.mentionsEnabled = mentionsEnabled;
            this.followersEnabled = followersEnabled;
        }

        // Getters
        public boolean isLikesEnabled() { return likesEnabled; }
        public boolean isCommentsEnabled() { return commentsEnabled; }
        public boolean isSharesEnabled() { return sharesEnabled; }
        public boolean isMentionsEnabled() { return mentionsEnabled; }
        public boolean isFollowersEnabled() { return followersEnabled; }

        // Setters
        public void setLikesEnabled(boolean likesEnabled) { this.likesEnabled = likesEnabled; }
        public void setCommentsEnabled(boolean commentsEnabled) { this.commentsEnabled = commentsEnabled; }
        public void setSharesEnabled(boolean sharesEnabled) { this.sharesEnabled = sharesEnabled; }
        public void setMentionsEnabled(boolean mentionsEnabled) { this.mentionsEnabled = mentionsEnabled; }
        public void setFollowersEnabled(boolean followersEnabled) { this.followersEnabled = followersEnabled; }
    }
}
