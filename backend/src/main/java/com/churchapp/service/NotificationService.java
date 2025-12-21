package com.churchapp.service;

import com.churchapp.dto.PostCommentNotificationEvent;
import com.churchapp.entity.Post;
import com.churchapp.entity.PostComment;
import com.churchapp.entity.User;
import com.churchapp.repository.PostCommentRepository;
import com.churchapp.repository.PostRepository;
import com.churchapp.repository.UserRepository;
import com.google.firebase.messaging.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final PostCommentRepository postCommentRepository;

    /**
     * Send a push notification to a single device
     * @param fcmToken The Firebase Cloud Messaging token for the device
     * @param title Notification title
     * @param body Notification body text
     * @param data Optional data payload
     */
    public void sendNotification(String fcmToken, String title, String body, Map<String, String> data) {
        try {
            if (fcmToken == null || fcmToken.trim().isEmpty()) {
                log.warn("Cannot send notification: FCM token is null or empty");
                return;
            }

            log.info("Sending notification to token: {} with title: {}",
                fcmToken.substring(0, Math.min(10, fcmToken.length())) + "...", title);

            // Build notification
            Notification notification = Notification.builder()
                    .setTitle(title)
                    .setBody(body)
                    .build();

            // Build message
            Message.Builder messageBuilder = Message.builder()
                    .setToken(fcmToken)
                    .setNotification(notification);

            // Add custom data if provided
            if (data != null && !data.isEmpty()) {
                messageBuilder.putAllData(data);
            }

            // Configure platform-specific options
            messageBuilder.setAndroidConfig(AndroidConfig.builder()
                    .setPriority(AndroidConfig.Priority.HIGH)
                    .setNotification(AndroidNotification.builder()
                            .setColor("#4A90E2") // TheGathering brand color
                            .setSound("default")
                            .build())
                    .build());

            messageBuilder.setApnsConfig(ApnsConfig.builder()
                    .setAps(Aps.builder()
                            .setBadge(1)
                            .setSound("default")
                            .build())
                    .build());

            Message message = messageBuilder.build();

            // Send message
            String response = FirebaseMessaging.getInstance().send(message);
            log.info("Successfully sent notification. Message ID: {}", response);

        } catch (FirebaseMessagingException e) {
            log.error("Failed to send notification to token {}: {}",
                fcmToken.substring(0, Math.min(10, fcmToken.length())) + "...",
                e.getMessage(), e);

            // Handle specific error codes
            if (e.getMessagingErrorCode() == MessagingErrorCode.INVALID_ARGUMENT) {
                log.error("Invalid FCM token: {}", fcmToken);
            } else if (e.getMessagingErrorCode() == MessagingErrorCode.UNREGISTERED) {
                log.error("FCM token is no longer registered: {}", fcmToken);
                // TODO: Remove invalid token from database
            }
        } catch (Exception e) {
            log.error("Unexpected error sending notification: {}", e.getMessage(), e);
        }
    }

    /**
     * Send a push notification to multiple devices (bulk send)
     * Uses Firebase Multicast for efficient batch sending (up to 500 tokens per batch)
     * @param fcmTokens List of FCM tokens
     * @param title Notification title
     * @param body Notification body text
     * @param data Optional data payload
     */
    public void sendBulkNotification(java.util.List<String> fcmTokens, String title, String body, Map<String, String> data) {
        try {
            if (fcmTokens == null || fcmTokens.isEmpty()) {
                log.warn("Cannot send bulk notification: token list is null or empty");
                return;
            }

            log.info("Sending bulk notification to {} tokens with title: {}", fcmTokens.size(), title);

            // Build notification
            Notification notification = Notification.builder()
                    .setTitle(title)
                    .setBody(body)
                    .build();

            // Build multicast message
            MulticastMessage.Builder messageBuilder = MulticastMessage.builder()
                    .addAllTokens(fcmTokens)
                    .setNotification(notification);

            // Add custom data if provided
            if (data != null && !data.isEmpty()) {
                messageBuilder.putAllData(data);
            }

            // Configure platform-specific options
            messageBuilder.setAndroidConfig(AndroidConfig.builder()
                    .setPriority(AndroidConfig.Priority.HIGH)
                    .setNotification(AndroidNotification.builder()
                            .setColor("#4A90E2")
                            .setSound("default")
                            .build())
                    .build());

            messageBuilder.setApnsConfig(ApnsConfig.builder()
                    .setAps(Aps.builder()
                            .setBadge(1)
                            .setSound("default")
                            .build())
                    .build());

            MulticastMessage message = messageBuilder.build();

            // Send multicast message
            BatchResponse response = FirebaseMessaging.getInstance().sendEachForMulticast(message);
            log.info("Bulk notification sent. Success: {}, Failure: {}",
                    response.getSuccessCount(), response.getFailureCount());

            // Log any failures
            if (response.getFailureCount() > 0) {
                for (int i = 0; i < response.getResponses().size(); i++) {
                    SendResponse sendResponse = response.getResponses().get(i);
                    if (!sendResponse.isSuccessful()) {
                        log.error("Failed to send to token {}: {}",
                                fcmTokens.get(i).substring(0, Math.min(10, fcmTokens.get(i).length())) + "...",
                                sendResponse.getException().getMessage());
                    }
                }
            }

        } catch (FirebaseMessagingException e) {
            log.error("Failed to send bulk notification: {}", e.getMessage(), e);
        } catch (Exception e) {
            log.error("Unexpected error sending bulk notification: {}", e.getMessage(), e);
        }
    }

    // Lightweight placeholders to satisfy controller calls; wire to real logic later
    public void notifyPostLike(UUID postId, UUID actorUserId) {
        log.debug("notifyPostLike: postId={} actorUserId={}", postId, actorUserId);
    }

    /**
     * Send real-time + push notifications when someone comments on a post
     * Follows the same pattern as ChatService.notifyChatMessageReceived()
     *
     * @param postId ID of the post that was commented on
     * @param actorUserId ID of the user who made the comment
     * @param content Content of the comment
     */
    public void notifyPostComment(UUID postId, UUID actorUserId, String content) {
        try {
            // Get post and comment details
            Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post not found: " + postId));

            User commenter = userRepository.findById(actorUserId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + actorUserId));

            // Get post author (the person who should be notified)
            User postAuthor = post.getUser();

            // Don't notify if commenting on own post
            if (postAuthor.getId().equals(commenter.getId())) {
                log.debug("Skipping notification - user commented on own post");
                return;
            }

            // Get the most recent comment by this user on this post
            // (This is a workaround since we don't pass the comment ID)
            List<PostComment> recentComments = postCommentRepository
                .findTopByPostIdAndUserIdOrderByCreatedAtDesc(postId, actorUserId);

            if (recentComments.isEmpty()) {
                log.warn("Could not find comment for notification - postId: {}, userId: {}", postId, actorUserId);
                return;
            }

            PostComment comment = recentComments.get(0);

            // Create WebSocket notification event
            PostCommentNotificationEvent wsEvent = PostCommentNotificationEvent.postCommentReceived(
                comment.getId(),
                postId,
                post.getContent(),
                commenter.getId(),
                commenter.getName(),
                commenter.getEmail(),
                content,
                comment.getParentComment() != null ? comment.getParentComment().getId() : null
            );

            // Send WebSocket notification to post author
            // Frontend subscribes to /user/queue/events via useEventNotifications hook
            messagingTemplate.convertAndSendToUser(
                postAuthor.getEmail(),  // Principal name (email)
                "/queue/events",        // Same queue as chat/event notifications
                wsEvent
            );

            log.info("📤 Sent comment notification WebSocket to {} for post {}", postAuthor.getEmail(), postId);

            // Send Firebase push notification (if FCM token exists)
            if (postAuthor.getFcmToken() != null && !postAuthor.getFcmToken().trim().isEmpty()) {
                String pushTitle = "💬 " + commenter.getName() + " commented on your post";
                String pushBody = content.length() > 100 ? content.substring(0, 100) + "..." : content;

                Map<String, String> data = new HashMap<>();
                data.put("type", "post_comment");
                data.put("postId", postId.toString());
                data.put("commentId", comment.getId().toString());
                data.put("commenterId", commenter.getId().toString());
                data.put("actionUrl", "/posts/" + postId + "#comment-" + comment.getId());

                sendNotification(postAuthor.getFcmToken(), pushTitle, pushBody, data);
                log.info("🔔 Sent Firebase push notification to {}", postAuthor.getEmail());
            }

        } catch (Exception e) {
            log.error("❌ Error sending comment notification for post {}: {}", postId, e.getMessage(), e);
            // Don't throw - notification failure shouldn't break comment creation
        }
    }

    public void notifyPostShare(UUID postId, UUID actorUserId) {
        log.debug("notifyPostShare: postId={} actorUserId={}", postId, actorUserId);
    }
}