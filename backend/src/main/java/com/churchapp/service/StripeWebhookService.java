package com.churchapp.service;

import com.churchapp.entity.DonationSubscription;
import com.churchapp.repository.DonationRepository;
import com.churchapp.repository.DonationSubscriptionRepository;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.*;
import com.stripe.net.Webhook;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Service
@RequiredArgsConstructor
@Slf4j
public class StripeWebhookService {

    @Value("${stripe.webhook.secret}")
    private String webhookSecret;

    private final StripePaymentService stripePaymentService;
    private final StripeSubscriptionService stripeSubscriptionService;
    private final DonationRepository donationRepository;
    private final DonationSubscriptionRepository subscriptionRepository;

    /**
     * Process Stripe webhook event with signature verification
     */
    public void processWebhook(String payload, String sigHeader) throws StripeException {
        Event event;

        try {
            event = Webhook.constructEvent(payload, sigHeader, webhookSecret);
        } catch (SignatureVerificationException e) {
            log.error("Invalid webhook signature: {}", e.getMessage());
            throw new IllegalArgumentException("Invalid webhook signature", e);
        }

        log.info("Processing Stripe webhook event: {} ({})", event.getType(), event.getId());

        // Handle different event types
        switch (event.getType()) {
            case "payment_intent.succeeded":
                handlePaymentIntentSucceeded(event);
                break;
            case "payment_intent.payment_failed":
                handlePaymentIntentFailed(event);
                break;
            case "invoice.payment_succeeded":
                handleInvoicePaymentSucceeded(event);
                break;
            case "invoice.payment_failed":
                handleInvoicePaymentFailed(event);
                break;
            case "customer.subscription.updated":
                handleSubscriptionUpdated(event);
                break;
            case "customer.subscription.deleted":
                handleSubscriptionDeleted(event);
                break;
            case "customer.subscription.created":
                handleSubscriptionCreated(event);
                break;
            default:
                log.info("Unhandled webhook event type: {}", event.getType());
        }
    }

    /**
     * Handle successful payment intent
     */
    @Transactional
    private void handlePaymentIntentSucceeded(Event event) {
        try {
            PaymentIntent paymentIntent = (PaymentIntent) event.getDataObjectDeserializer()
                    .getObject()
                    .orElseThrow(() -> new IllegalStateException("Could not deserialize payment intent"));

            log.info("Processing successful payment intent: {}", paymentIntent.getId());

            // Check if this is a subscription payment (handled differently)
            if (paymentIntent.getInvoice() != null) {
                log.info("Payment intent {} is for subscription invoice, skipping direct processing",
                    paymentIntent.getId());
                return;
            }

            // Process one-time donation
            stripePaymentService.processSuccessfulPayment(paymentIntent);

        } catch (Exception e) {
            log.error("Error processing successful payment intent: {}", e.getMessage(), e);
        }
    }

    /**
     * Handle failed payment intent
     */
    private void handlePaymentIntentFailed(Event event) {
        try {
            PaymentIntent paymentIntent = (PaymentIntent) event.getDataObjectDeserializer()
                    .getObject()
                    .orElseThrow(() -> new IllegalStateException("Could not deserialize payment intent"));

            log.warn("Payment intent failed: {} - {}",
                paymentIntent.getId(),
                paymentIntent.getLastPaymentError() != null
                    ? paymentIntent.getLastPaymentError().getMessage()
                    : "Unknown error");

            // You might want to send notification to user about failed payment
            // or implement retry logic here

        } catch (Exception e) {
            log.error("Error processing failed payment intent: {}", e.getMessage(), e);
        }
    }

    /**
     * Handle successful subscription invoice payment
     */
    @Transactional
    private void handleInvoicePaymentSucceeded(Event event) {
        try {
            Invoice invoice = (Invoice) event.getDataObjectDeserializer()
                    .getObject()
                    .orElseThrow(() -> new IllegalStateException("Could not deserialize invoice"));

            log.info("Processing successful invoice payment: {}", invoice.getId());

            // Process subscription payment
            stripeSubscriptionService.processSubscriptionPayment(invoice);

        } catch (Exception e) {
            log.error("Error processing successful invoice payment: {}", e.getMessage(), e);
        }
    }

    /**
     * Handle failed subscription invoice payment
     */
    @Transactional
    private void handleInvoicePaymentFailed(Event event) {
        try {
            Invoice invoice = (Invoice) event.getDataObjectDeserializer()
                    .getObject()
                    .orElseThrow(() -> new IllegalStateException("Could not deserialize invoice"));

            log.warn("Invoice payment failed: {}", invoice.getId());

            String subscriptionId = invoice.getSubscription();
            if (subscriptionId != null) {
                DonationSubscription subscription = subscriptionRepository
                    .findByStripeSubscriptionId(subscriptionId)
                    .orElse(null);

                if (subscription != null) {
                    // Update failure information
                    subscription.setFailureCount(subscription.getFailureCount() + 1);
                    subscription.setLastFailureReason("Invoice payment failed");
                    subscription.setLastFailureDate(LocalDateTime.now());

                    subscriptionRepository.save(subscription);

                    log.info("Updated failure count for subscription {} to {}",
                        subscription.getId(), subscription.getFailureCount());
                }
            }

        } catch (Exception e) {
            log.error("Error processing failed invoice payment: {}", e.getMessage(), e);
        }
    }

    /**
     * Handle subscription updates
     */
    @Transactional
    private void handleSubscriptionUpdated(Event event) {
        try {
            Subscription stripeSubscription = (Subscription) event.getDataObjectDeserializer()
                    .getObject()
                    .orElseThrow(() -> new IllegalStateException("Could not deserialize subscription"));

            log.info("Processing subscription update: {}", stripeSubscription.getId());

            DonationSubscription subscription = subscriptionRepository
                .findByStripeSubscriptionId(stripeSubscription.getId())
                .orElse(null);

            if (subscription != null) {
                // Update subscription status and period information
                subscription.setStatus(com.churchapp.entity.SubscriptionStatus
                    .fromStripeStatus(stripeSubscription.getStatus()));
                subscription.setCurrentPeriodStart(
                    LocalDateTime.ofEpochSecond(stripeSubscription.getCurrentPeriodStart(), 0, ZoneOffset.UTC));
                subscription.setCurrentPeriodEnd(
                    LocalDateTime.ofEpochSecond(stripeSubscription.getCurrentPeriodEnd(), 0, ZoneOffset.UTC));

                if ("canceled".equals(stripeSubscription.getStatus())) {
                    subscription.setCanceledAt(LocalDateTime.now());
                    subscription.setEndedAt(LocalDateTime.now());
                }

                subscriptionRepository.save(subscription);

                log.info("Updated subscription {} status to {}",
                    subscription.getId(), subscription.getStatus());
            }

        } catch (Exception e) {
            log.error("Error processing subscription update: {}", e.getMessage(), e);
        }
    }

    /**
     * Handle subscription deletion
     */
    @Transactional
    private void handleSubscriptionDeleted(Event event) {
        try {
            Subscription stripeSubscription = (Subscription) event.getDataObjectDeserializer()
                    .getObject()
                    .orElseThrow(() -> new IllegalStateException("Could not deserialize subscription"));

            log.info("Processing subscription deletion: {}", stripeSubscription.getId());

            DonationSubscription subscription = subscriptionRepository
                .findByStripeSubscriptionId(stripeSubscription.getId())
                .orElse(null);

            if (subscription != null) {
                subscription.setStatus(com.churchapp.entity.SubscriptionStatus.CANCELED);
                subscription.setCanceledAt(LocalDateTime.now());
                subscription.setEndedAt(LocalDateTime.now());

                subscriptionRepository.save(subscription);

                log.info("Marked subscription {} as canceled due to deletion", subscription.getId());
            }

        } catch (Exception e) {
            log.error("Error processing subscription deletion: {}", e.getMessage(), e);
        }
    }

    /**
     * Handle subscription creation (for tracking)
     */
    @Transactional
    private void handleSubscriptionCreated(Event event) {
        try {
            Subscription stripeSubscription = (Subscription) event.getDataObjectDeserializer()
                    .getObject()
                    .orElseThrow(() -> new IllegalStateException("Could not deserialize subscription"));

            log.info("Subscription created: {}", stripeSubscription.getId());

            // Usually our subscription is already created by the service,
            // but this webhook can be used for additional tracking or validation

        } catch (Exception e) {
            log.error("Error processing subscription creation: {}", e.getMessage(), e);
        }
    }
}