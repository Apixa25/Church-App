package com.churchapp.controller;

import com.churchapp.service.MediaConvertWebhookService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller for media-related endpoints
 * 
 * Includes webhook endpoint for MediaConvert job completion notifications
 * Following the same pattern as DonationController's Stripe webhook
 */
@RestController
@RequestMapping("/media")  // With context-path=/api, full path is /api/media/webhook/mediaconvert
@RequiredArgsConstructor
@Slf4j
public class MediaController {

    private final MediaConvertWebhookService mediaConvertWebhookService;

    /**
     * MediaConvert job completion webhook endpoint
     * 
     * Receives SNS notifications when MediaConvert jobs complete.
     * This is the industry-standard approach used by X.com, Instagram, etc.
     * 
     * SNS sends messages with specific headers:
     * - x-amz-sns-message-type: "SubscriptionConfirmation" or "Notification"
     * 
     * @param messageType SNS message type header
     * @param payload SNS message body (JSON)
     * @return Success response
     */
    @PostMapping("/webhook/mediaconvert")
    public ResponseEntity<String> handleMediaConvertWebhook(
            @RequestHeader(value = "x-amz-sns-message-type", required = false) String messageType,
            @RequestBody String payload) {

        try {
            log.info("🔔 Received MediaConvert webhook - Type: {}, Payload length: {}", messageType, payload != null ? payload.length() : 0);

            // If message type is not in header, try to parse from payload
            if (messageType == null || messageType.isEmpty()) {
                // SNS sometimes sends message type in the payload
                // We'll let the service handle it
                messageType = "Notification"; // Default to notification
                log.info("🔔 Message type not in header, defaulting to: {}", messageType);
            }

            mediaConvertWebhookService.processWebhook(messageType, payload);
            log.info("✅ MediaConvert webhook processed successfully");
            return ResponseEntity.ok("Webhook processed successfully");

        } catch (Exception e) {
            log.error("❌ Error processing MediaConvert webhook: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body("Webhook processing failed: " + e.getMessage());
        }
    }
}

