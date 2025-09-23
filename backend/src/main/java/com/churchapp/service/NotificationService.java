package com.churchapp.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    // TODO: Integrate with actual FCM service
    public void sendNotification(String fcmToken, String title, String body, Map<String, String> data) {
        try {
            // Placeholder for FCM integration
            log.info("Sending notification to token: {} with title: {}", fcmToken, title);

            // TODO: Implement actual FCM notification sending
            // FirebaseMessaging.getInstance().send(message);

        } catch (Exception e) {
            log.error("Failed to send notification: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to send notification", e);
        }
    }

    public void sendBulkNotification(java.util.List<String> fcmTokens, String title, String body, Map<String, String> data) {
        try {
            log.info("Sending bulk notification to {} tokens with title: {}", fcmTokens.size(), title);

            // TODO: Implement bulk FCM notification sending
            for (String token : fcmTokens) {
                sendNotification(token, title, body, data);
            }

        } catch (Exception e) {
            log.error("Failed to send bulk notification: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to send bulk notification", e);
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