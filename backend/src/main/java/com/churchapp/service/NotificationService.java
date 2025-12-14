package com.churchapp.service;

import com.google.firebase.messaging.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

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
    public void notifyPostLike(java.util.UUID postId, java.util.UUID actorUserId) {
        log.debug("notifyPostLike: postId={} actorUserId={}", postId, actorUserId);
    }

    public void notifyPostComment(java.util.UUID postId, java.util.UUID actorUserId, String content) {
        log.debug("notifyPostComment: postId={} actorUserId={} contentLen={}", postId, actorUserId,
            content == null ? 0 : content.length());
    }

    public void notifyPostShare(java.util.UUID postId, java.util.UUID actorUserId) {
        log.debug("notifyPostShare: postId={} actorUserId={}", postId, actorUserId);
    }
}