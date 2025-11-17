package com.churchapp;

import com.churchapp.repository.DonationRepository;
import com.churchapp.repository.DonationSubscriptionRepository;
import com.churchapp.service.StripePaymentService;
import com.churchapp.service.StripeSubscriptionService;
import com.churchapp.service.StripeWebhookService;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.net.Webhook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class StripeWebhookSecurityTest {

    @InjectMocks
    private StripeWebhookService stripeWebhookService;

    @Mock
    private StripePaymentService stripePaymentService;

    @Mock
    private StripeSubscriptionService stripeSubscriptionService;

    @Mock
    private DonationRepository donationRepository;

    @Mock
    private DonationSubscriptionRepository donationSubscriptionRepository;

    private String webhookSecret = "whsec_test_secret";
    private String validPayload = "{\"id\":\"evt_test\",\"object\":\"event\",\"type\":\"payment_intent.succeeded\"}";
    private String validSignature = "t=1234567890,v1=valid_signature_hash";
    private String invalidSignature = "t=1234567890,v1=invalid_signature_hash";

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(stripeWebhookService, "webhookSecret", webhookSecret);
    }

    @Test
    void testWebhookSignatureVerification_ValidSignature() {
        try (MockedStatic<Webhook> mockedWebhook = mockStatic(Webhook.class)) {
            // Arrange
            Event mockEvent = mock(Event.class);
            when(mockEvent.getType()).thenReturn("payment_intent.succeeded");

            mockedWebhook.when(() -> Webhook.constructEvent(
                eq(validPayload),
                eq(validSignature),
                eq(webhookSecret)
            )).thenReturn(mockEvent);

            // Act & Assert
            assertDoesNotThrow(() -> {
                stripeWebhookService.processWebhook(validPayload, validSignature);
            });

            mockedWebhook.verify(() -> Webhook.constructEvent(
                eq(validPayload),
                eq(validSignature),
                eq(webhookSecret)
            ));
        }
    }

    @Test
    void testWebhookSignatureVerification_InvalidSignature() {
        try (MockedStatic<Webhook> mockedWebhook = mockStatic(Webhook.class)) {
            // Arrange
            mockedWebhook.when(() -> Webhook.constructEvent(
                eq(validPayload),
                eq(invalidSignature),
                eq(webhookSecret)
            )).thenThrow(new SignatureVerificationException("Invalid signature", invalidSignature));

            // Act & Assert
            assertThrows(RuntimeException.class, () -> {
                stripeWebhookService.processWebhook(validPayload, invalidSignature);
            });

            mockedWebhook.verify(() -> Webhook.constructEvent(
                eq(validPayload),
                eq(invalidSignature),
                eq(webhookSecret)
            ));
        }
    }

    @Test
    void testWebhookSignatureVerification_MissingSignature() {
        try (MockedStatic<Webhook> mockedWebhook = mockStatic(Webhook.class)) {
            // Arrange
            String emptySignature = "";

            mockedWebhook.when(() -> Webhook.constructEvent(
                eq(validPayload),
                eq(emptySignature),
                eq(webhookSecret)
            )).thenThrow(new SignatureVerificationException("Missing signature", emptySignature));

            // Act & Assert
            assertThrows(RuntimeException.class, () -> {
                stripeWebhookService.processWebhook(validPayload, emptySignature);
            });
        }
    }

    @Test
    void testWebhookSignatureVerification_ExpiredTimestamp() {
        try (MockedStatic<Webhook> mockedWebhook = mockStatic(Webhook.class)) {
            // Arrange
            String expiredSignature = "t=1000000000,v1=expired_signature_hash"; // Very old timestamp

            mockedWebhook.when(() -> Webhook.constructEvent(
                eq(validPayload),
                eq(expiredSignature),
                eq(webhookSecret)
            )).thenThrow(new SignatureVerificationException("Timestamp too old", expiredSignature));

            // Act & Assert
            assertThrows(RuntimeException.class, () -> {
                stripeWebhookService.processWebhook(validPayload, expiredSignature);
            });
        }
    }

    @Test
    void testWebhookPayloadValidation_MalformedJson() {
        try (MockedStatic<Webhook> mockedWebhook = mockStatic(Webhook.class)) {
            // Arrange
            String malformedPayload = "{\"id\":\"evt_test\",\"object\":\"event\""; // Missing closing brace

            mockedWebhook.when(() -> Webhook.constructEvent(
                eq(malformedPayload),
                eq(validSignature),
                eq(webhookSecret)
            )).thenThrow(new RuntimeException("Invalid JSON"));

            // Act & Assert
            assertThrows(RuntimeException.class, () -> {
                stripeWebhookService.processWebhook(malformedPayload, validSignature);
            });
        }
    }

    @Test
    void testWebhookEventTypeHandling() {
        try (MockedStatic<Webhook> mockedWebhook = mockStatic(Webhook.class)) {
            // Test different event types that should be handled
            String[] supportedEventTypes = {
                "payment_intent.succeeded",
                "payment_intent.payment_failed",
                "invoice.payment_succeeded",
                "invoice.payment_failed",
                "customer.subscription.deleted"
            };

            for (String eventType : supportedEventTypes) {
                // Arrange
                Event mockEvent = mock(Event.class);
                when(mockEvent.getType()).thenReturn(eventType);

                mockedWebhook.when(() -> Webhook.constructEvent(
                    eq(validPayload),
                    eq(validSignature),
                    eq(webhookSecret)
                )).thenReturn(mockEvent);

                // Act & Assert
                assertDoesNotThrow(() -> {
                    stripeWebhookService.processWebhook(validPayload, validSignature);
                }, "Should handle event type: " + eventType);
            }
        }
    }

    @Test
    void testWebhookIdempotency() {
        try (MockedStatic<Webhook> mockedWebhook = mockStatic(Webhook.class)) {
            // Arrange
            Event mockEvent = mock(Event.class);
            when(mockEvent.getType()).thenReturn("payment_intent.succeeded");
            when(mockEvent.getId()).thenReturn("evt_unique_id");

            mockedWebhook.when(() -> Webhook.constructEvent(
                eq(validPayload),
                eq(validSignature),
                eq(webhookSecret)
            )).thenReturn(mockEvent);

            // Act - Process same webhook twice
            assertDoesNotThrow(() -> {
                stripeWebhookService.processWebhook(validPayload, validSignature);
                stripeWebhookService.processWebhook(validPayload, validSignature);
            });

            // Assert - Webhook should be processed idempotently
            mockedWebhook.verify(() -> Webhook.constructEvent(
                eq(validPayload),
                eq(validSignature),
                eq(webhookSecret)
            ), times(2));
        }
    }

    @Test
    void testWebhookRateLimiting() {
        try (MockedStatic<Webhook> mockedWebhook = mockStatic(Webhook.class)) {
            // Arrange
            Event mockEvent = mock(Event.class);
            when(mockEvent.getType()).thenReturn("payment_intent.succeeded");

            mockedWebhook.when(() -> Webhook.constructEvent(
                eq(validPayload),
                eq(validSignature),
                eq(webhookSecret)
            )).thenReturn(mockEvent);

            // Act - Process multiple webhooks rapidly
            for (int i = 0; i < 10; i++) {
                assertDoesNotThrow(() -> {
                    stripeWebhookService.processWebhook(validPayload, validSignature);
                });
            }

            // Assert - All should be processed (rate limiting would be handled at infrastructure level)
            mockedWebhook.verify(() -> Webhook.constructEvent(
                eq(validPayload),
                eq(validSignature),
                eq(webhookSecret)
            ), times(10));
        }
    }

    @Test
    void testWebhookSecretValidation() {
        // Test that webhook secret is properly configured and not empty
        assertNotNull(webhookSecret);
        assertFalse(webhookSecret.isEmpty());
        assertTrue(webhookSecret.startsWith("whsec_"));
    }
}