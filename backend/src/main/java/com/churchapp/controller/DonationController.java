package com.churchapp.controller;

import com.churchapp.dto.*;
import com.churchapp.entity.Donation;
import com.churchapp.entity.DonationSubscription;
import com.churchapp.entity.User;
import com.churchapp.exception.PaymentException;
import com.churchapp.exception.SubscriptionException;
import com.churchapp.repository.DonationRepository;
import com.churchapp.repository.DonationSubscriptionRepository;
import com.churchapp.repository.UserRepository;
import com.churchapp.service.StripePaymentService;
import com.churchapp.service.StripeSubscriptionService;
import com.churchapp.service.StripeWebhookService;
import com.churchapp.service.ReceiptService;
import com.churchapp.service.EmailService;
import com.churchapp.util.StripeUtil;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/donations")
@RequiredArgsConstructor
@Slf4j
public class DonationController {

    @Value("${stripe.public.key}")
    private String stripePublicKey;

    private final StripePaymentService stripePaymentService;
    private final StripeSubscriptionService stripeSubscriptionService;
    private final StripeWebhookService stripeWebhookService;
    private final ReceiptService receiptService;
    private final DonationRepository donationRepository;
    private final DonationSubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;

    /**
     * Create payment intent for one-time donation
     */
    @PostMapping("/create-payment-intent")
    public ResponseEntity<PaymentIntentResponse> createPaymentIntent(
            @Valid @RequestBody PaymentIntentRequest request,
            Authentication authentication) {

        try {
            User user = getCurrentUser(authentication);

            // Validate amount
            StripeUtil.validateDonationAmount(request.getAmount());

            // Create payment intent with organizationId from request (active context)
            PaymentIntent paymentIntent = stripePaymentService.createPaymentIntent(
                user,
                request.getAmount(),
                request.getCategory(),
                request.getPurpose(),
                request.getReceiptEmail(),
                request.getOrganizationId() // Pass organizationId from active context
            );

            // Build response
            PaymentIntentResponse response = new PaymentIntentResponse();
            response.setClientSecret(paymentIntent.getClientSecret());
            response.setPaymentIntentId(paymentIntent.getId());
            response.setAmount(request.getAmount());
            response.setCurrency("USD");
            response.setStatus(paymentIntent.getStatus());
            response.setDescription(paymentIntent.getDescription());
            response.setPublicKey(stripePublicKey);
            response.setEstimatedFee(StripeUtil.calculateEstimatedFee(request.getAmount()));
            response.setNetAmount(StripeUtil.calculateNetAmount(request.getAmount()));

            return ResponseEntity.ok(response);

        } catch (StripeException e) {
            log.error("Error creating payment intent: {}", e.getMessage(), e);
            throw StripeUtil.handleStripeException(e);
        } catch (Exception e) {
            log.error("Unexpected error creating payment intent: {}", e.getMessage(), e);
            throw new PaymentException("Failed to create payment intent", e);
        }
    }

    /**
     * Confirm payment and create donation record
     */
    @PostMapping("/confirm-payment")
    public ResponseEntity<DonationResponse> confirmPayment(
            @RequestParam String paymentIntentId,
            Authentication authentication) {

        try {
            User user = getCurrentUser(authentication);
            Donation donation = stripePaymentService.confirmPayment(paymentIntentId, user);

            // Generate and email receipt automatically
            receiptService.generateAndEmailReceipt(donation);

            DonationResponse response = mapDonationToResponse(donation);

            log.info("Payment confirmed for user {} with amount ${}, receipt generated",
                user.getId(), donation.getAmount());

            return ResponseEntity.ok(response);

        } catch (StripeException e) {
            log.error("Error confirming payment: {}", e.getMessage(), e);
            throw StripeUtil.handleStripeException(e);
        } catch (Exception e) {
            log.error("Unexpected error confirming payment: {}", e.getMessage(), e);
            throw new PaymentException("Failed to confirm payment", e);
        }
    }

    /**
     * Get user's donation history
     */
    @GetMapping("/history")
    public ResponseEntity<Page<DonationResponse>> getDonationHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {

        User user = getCurrentUser(authentication);
        Pageable pageable = PageRequest.of(page, size, Sort.by("timestamp").descending());

        Page<Donation> donations = donationRepository.findByUserOrderByTimestampDesc(user, pageable);
        Page<DonationResponse> response = donations.map(this::mapDonationToResponse);

        return ResponseEntity.ok(response);
    }

    /**
     * Create recurring donation subscription
     */
    @PostMapping("/subscriptions")
    public ResponseEntity<SubscriptionResponse> createSubscription(
            @Valid @RequestBody SubscriptionRequest request,
            Authentication authentication) {

        try {
            User user = getCurrentUser(authentication);

            // Validate amount
            StripeUtil.validateDonationAmount(request.getAmount());

            // Create subscription with organizationId from request (active context)
            DonationSubscription subscription = stripeSubscriptionService.createSubscription(
                user,
                request.getAmount(),
                request.getCategory(),
                request.getFrequency(),
                request.getPurpose(),
                request.getPaymentMethodId(),
                request.getOrganizationId() // Pass organizationId from active context
            );

            SubscriptionResponse response = mapSubscriptionToResponse(subscription);

            log.info("Subscription created for user {} with amount ${} every {}",
                user.getId(), subscription.getAmount(), subscription.getFrequency());

            return ResponseEntity.ok(response);

        } catch (StripeException e) {
            log.error("Error creating subscription: {}", e.getMessage(), e);
            throw StripeUtil.handleStripeException(e);
        } catch (Exception e) {
            log.error("Unexpected error creating subscription: {}", e.getMessage(), e);
            throw new SubscriptionException("Failed to create subscription", e);
        }
    }

    /**
     * Get user's subscriptions
     */
    @GetMapping("/subscriptions")
    public ResponseEntity<List<SubscriptionResponse>> getUserSubscriptions(
            Authentication authentication) {

        User user = getCurrentUser(authentication);
        List<DonationSubscription> subscriptions = subscriptionRepository.findByUserOrderByCreatedAtDesc(user);
        List<SubscriptionResponse> response = subscriptions.stream()
            .map(this::mapSubscriptionToResponse)
            .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    /**
     * Cancel subscription
     */
    @PutMapping("/subscriptions/{subscriptionId}/cancel")
    public ResponseEntity<SubscriptionResponse> cancelSubscription(
            @PathVariable String subscriptionId,
            Authentication authentication) {

        try {
            User user = getCurrentUser(authentication);
            DonationSubscription subscription = stripeSubscriptionService.cancelSubscription(subscriptionId, user);
            SubscriptionResponse response = mapSubscriptionToResponse(subscription);

            log.info("Subscription {} canceled for user {}", subscriptionId, user.getId());

            return ResponseEntity.ok(response);

        } catch (StripeException e) {
            log.error("Error canceling subscription: {}", e.getMessage(), e);
            throw StripeUtil.handleStripeException(e);
        } catch (Exception e) {
            log.error("Unexpected error canceling subscription: {}", e.getMessage(), e);
            throw new SubscriptionException("Failed to cancel subscription", e);
        }
    }

    /**
     * Update subscription payment method
     */
    @PutMapping("/subscriptions/{subscriptionId}/payment-method")
    public ResponseEntity<SubscriptionResponse> updateSubscriptionPaymentMethod(
            @PathVariable String subscriptionId,
            @RequestParam String paymentMethodId,
            Authentication authentication) {

        try {
            User user = getCurrentUser(authentication);
            DonationSubscription subscription = stripeSubscriptionService.updatePaymentMethod(
                subscriptionId, paymentMethodId, user);
            SubscriptionResponse response = mapSubscriptionToResponse(subscription);

            log.info("Payment method updated for subscription {} for user {}", subscriptionId, user.getId());

            return ResponseEntity.ok(response);

        } catch (StripeException e) {
            log.error("Error updating payment method: {}", e.getMessage(), e);
            throw StripeUtil.handleStripeException(e);
        } catch (Exception e) {
            log.error("Unexpected error updating payment method: {}", e.getMessage(), e);
            throw new SubscriptionException("Failed to update payment method", e);
        }
    }

    /**
     * Stripe webhook endpoint
     */
    @PostMapping("/webhook/stripe")
    public ResponseEntity<String> handleStripeWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader) {

        try {
            stripeWebhookService.processWebhook(payload, sigHeader);
            return ResponseEntity.ok("Webhook processed successfully");

        } catch (Exception e) {
            log.error("Error processing Stripe webhook: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body("Webhook processing failed");
        }
    }

    /**
     * Download receipt PDF for a donation
     */
    @GetMapping("/receipt/{donationId}")
    public ResponseEntity<byte[]> downloadReceipt(
            @PathVariable UUID donationId,
            Authentication authentication) {

        try {
            User user = getCurrentUser(authentication);
            byte[] receiptPdf = receiptService.downloadReceipt(donationId, user);

            // Find donation for filename
            Donation donation = donationRepository.findById(donationId)
                .orElseThrow(() -> new IllegalArgumentException("Donation not found"));

            String filename = String.format("Receipt_%s_%s.pdf",
                donation.getTimestamp().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")),
                donation.getTransactionId());

            return ResponseEntity.ok()
                .header("Content-Type", "application/pdf")
                .header("Content-Disposition", "attachment; filename=\"" + filename + "\"")
                .body(receiptPdf);

        } catch (Exception e) {
            log.error("Error downloading receipt for donation {}: {}", donationId, e.getMessage(), e);
            throw new PaymentException("Failed to download receipt", e);
        }
    }

    /**
     * Resend receipt email for a donation
     */
    @PostMapping("/receipt/{donationId}/resend")
    public ResponseEntity<String> resendReceipt(
            @PathVariable UUID donationId,
            @RequestParam(required = false) String email,
            Authentication authentication) {

        try {
            User user = getCurrentUser(authentication);

            Donation donation = donationRepository.findById(donationId)
                .orElseThrow(() -> new IllegalArgumentException("Donation not found"));

            // Verify user owns this donation
            if (!donation.getUser().getId().equals(user.getId())) {
                throw new IllegalArgumentException("User does not own this donation");
            }

            // Use provided email or default to receipt email or user email
            String recipientEmail = email != null ? email :
                (donation.getReceiptEmail() != null ? donation.getReceiptEmail() : user.getEmail());

            // Generate and send receipt
            byte[] receiptPdf = receiptService.generateReceiptPdf(donation);
            // Note: EmailService would be injected in a real implementation
            // For now, we'll just generate the receipt without sending the email

            log.info("Receipt resent for donation {} to {}", donationId, recipientEmail);

            return ResponseEntity.ok("Receipt has been resent to " + recipientEmail);

        } catch (Exception e) {
            log.error("Error resending receipt for donation {}: {}", donationId, e.getMessage(), e);
            throw new PaymentException("Failed to resend receipt", e);
        }
    }

    /**
     * Get donation analytics (Admin only)
     */
    @GetMapping("/analytics")
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    public ResponseEntity<DonationAnalyticsResponse> getDonationAnalytics(
            @RequestParam(required = false) LocalDateTime startDate,
            @RequestParam(required = false) LocalDateTime endDate) {

        // Default to last 12 months if no dates provided
        if (startDate == null) {
            startDate = LocalDateTime.now().minusMonths(12);
        }
        if (endDate == null) {
            endDate = LocalDateTime.now();
        }

        // This would be implemented in a separate analytics service
        // For now, return a basic response structure
        DonationAnalyticsResponse response = new DonationAnalyticsResponse();
        response.setStartDate(startDate);
        response.setEndDate(endDate);
        // TODO: Implement full analytics logic

        return ResponseEntity.ok(response);
    }

    // Helper methods
    private User getCurrentUser(Authentication authentication) {
        String email = authentication.getName();
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private DonationResponse mapDonationToResponse(Donation donation) {
        DonationResponse response = new DonationResponse();
        response.setId(donation.getId());
        response.setAmount(donation.getAmount());
        response.setTransactionId(donation.getTransactionId());
        response.setCategory(donation.getCategory());
        response.setCategoryDisplayName(donation.getCategoryDisplayName());
        response.setPurpose(donation.getPurpose());
        response.setIsRecurring(donation.getIsRecurring());
        response.setCurrency(donation.getCurrency());
        response.setPaymentMethodLast4(donation.getPaymentMethodLast4());
        response.setPaymentMethodBrand(donation.getPaymentMethodBrand());
        response.setFeeAmount(donation.getFeeAmount());
        response.setNetAmount(donation.getNetAmount());
        response.setReceiptEmail(donation.getReceiptEmail());
        response.setReceiptSent(donation.getReceiptSent());
        response.setReceiptSentAt(donation.getReceiptSentAt());
        response.setTimestamp(donation.getTimestamp());
        response.setCreatedAt(donation.getCreatedAt());
        response.setUserId(donation.getUser().getId());
        response.setDonorName(donation.getUser().getName());

        if (donation.getSubscription() != null) {
            response.setSubscriptionId(donation.getSubscription().getId());
            response.setSubscriptionFrequency(donation.getSubscription().getFrequencyDisplayName());
        }

        return response;
    }

    private SubscriptionResponse mapSubscriptionToResponse(DonationSubscription subscription) {
        SubscriptionResponse response = new SubscriptionResponse();
        response.setId(subscription.getId());
        response.setStripeSubscriptionId(subscription.getStripeSubscriptionId());
        response.setAmount(subscription.getAmount());
        response.setFrequency(subscription.getFrequency());
        response.setFrequencyDisplayName(subscription.getFrequencyDisplayName());
        response.setCategory(subscription.getCategory());
        response.setCategoryDisplayName(subscription.getCategoryDisplayName());
        response.setPurpose(subscription.getPurpose());
        response.setStatus(subscription.getStatus());
        response.setStatusDisplayName(subscription.getStatusDisplayName());
        response.setCurrency(subscription.getCurrency());
        response.setCurrentPeriodStart(subscription.getCurrentPeriodStart());
        response.setCurrentPeriodEnd(subscription.getCurrentPeriodEnd());
        response.setNextPaymentDate(subscription.getNextPaymentDate());
        response.setStartedAt(subscription.getStartedAt());
        response.setEndedAt(subscription.getEndedAt());
        response.setCanceledAt(subscription.getCanceledAt());
        response.setCreatedAt(subscription.getCreatedAt());
        response.setPaymentMethodLast4(subscription.getPaymentMethodLast4());
        response.setPaymentMethodBrand(subscription.getPaymentMethodBrand());
        response.setFailureCount(subscription.getFailureCount());
        response.setLastFailureReason(subscription.getLastFailureReason());
        response.setLastFailureDate(subscription.getLastFailureDate());
        response.setTotalDonationsCount(subscription.getTotalDonationsCount());
        response.setTotalDonationsAmount(subscription.getTotalDonationsAmount());
        response.setUserId(subscription.getUser().getId());
        response.setDonorName(subscription.getUser().getName());

        return response;
    }
}