package com.churchapp.service;

import com.churchapp.entity.*;
import com.churchapp.repository.DonationRepository;
import com.stripe.exception.StripeException;
import com.stripe.model.Customer;
import com.stripe.model.PaymentIntent;
import com.stripe.model.PaymentMethod;
import com.stripe.param.CustomerCreateParams;
import com.stripe.param.PaymentIntentConfirmParams;
import com.stripe.param.PaymentIntentCreateParams;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class StripePaymentService {

    private final DonationRepository donationRepository;
    private final StripeCustomerService stripeCustomerService;

    /**
     * Create a payment intent for a one-time donation
     */
    public PaymentIntent createPaymentIntent(User user, BigDecimal amount, DonationCategory category,
                                           String purpose, String receiptEmail) throws StripeException {
        log.info("Creating payment intent for user {} with amount ${}", user.getId(), amount);

        // Convert amount to cents (Stripe expects amounts in cents)
        long amountInCents = amount.multiply(BigDecimal.valueOf(100)).longValue();

        // Get or create Stripe customer
        Customer customer = stripeCustomerService.getOrCreateCustomer(user);

        // Build metadata for the payment intent
        Map<String, String> metadata = new HashMap<>();
        metadata.put("user_id", user.getId().toString());
        metadata.put("category", category.name());
        metadata.put("church_app", "true");
        metadata.put("donation_type", "one_time");
        if (purpose != null && !purpose.trim().isEmpty()) {
            metadata.put("purpose", purpose.trim().substring(0, Math.min(purpose.trim().length(), 500)));
        }

        // Create payment intent parameters
        PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                .setAmount(amountInCents)
                .setCurrency("usd")
                .setCustomer(customer.getId())
                .setReceiptEmail(receiptEmail != null ? receiptEmail : user.getEmail())
                .setDescription(String.format("%s donation for %s",
                    category.getDisplayName(),
                    user.getName()))
                .putAllMetadata(metadata)
                .setAutomaticPaymentMethods(
                    PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                        .setEnabled(true)
                        .build()
                )
                .build();

        PaymentIntent paymentIntent = PaymentIntent.create(params);

        log.info("Created payment intent {} for user {} with amount ${}",
            paymentIntent.getId(), user.getId(), amount);

        return paymentIntent;
    }

    /**
     * Confirm a payment intent and create donation record
     */
    @Transactional
    public Donation confirmPayment(String paymentIntentId, User user) throws StripeException {
        log.info("Confirming payment intent {} for user {}", paymentIntentId, user.getId());

        // Retrieve and confirm payment intent
        PaymentIntent paymentIntent = PaymentIntent.retrieve(paymentIntentId);

        if (!"succeeded".equals(paymentIntent.getStatus())) {
            log.warn("Payment intent {} has status: {}", paymentIntentId, paymentIntent.getStatus());
            throw new IllegalStateException("Payment intent not in succeeded status: " + paymentIntent.getStatus());
        }

        // Check if donation already exists
        if (donationRepository.findByStripePaymentIntentId(paymentIntentId).isPresent()) {
            log.warn("Donation already exists for payment intent {}", paymentIntentId);
            throw new IllegalStateException("Donation already processed for this payment intent");
        }

        // Extract metadata
        Map<String, String> metadata = paymentIntent.getMetadata();
        String categoryStr = metadata.get("category");
        String purpose = metadata.get("purpose");

        // Convert amount from cents to dollars
        BigDecimal amount = BigDecimal.valueOf(paymentIntent.getAmount()).divide(BigDecimal.valueOf(100));

        // Get payment method details
        String paymentMethodId = null;
        String last4 = null;
        String brand = null;

        if (paymentIntent.getCharges() != null && !paymentIntent.getCharges().getData().isEmpty()) {
            var charge = paymentIntent.getCharges().getData().get(0);
            paymentMethodId = charge.getPaymentMethod();
            if (charge.getPaymentMethodDetails() != null &&
                charge.getPaymentMethodDetails().getCard() != null) {
                last4 = charge.getPaymentMethodDetails().getCard().getLast4();
                brand = charge.getPaymentMethodDetails().getCard().getBrand();
            }
        }

        // Create donation record
        Donation donation = new Donation();
        donation.setUser(user);
        donation.setAmount(amount);
        donation.setTransactionId(generateTransactionId());
        donation.setStripePaymentIntentId(paymentIntentId);
        donation.setCategory(DonationCategory.valueOf(categoryStr));
        donation.setPurpose(purpose);
        donation.setIsRecurring(false);
        donation.setCurrency(paymentIntent.getCurrency().toUpperCase());
        donation.setPaymentMethodLast4(last4);
        donation.setPaymentMethodBrand(brand);
        donation.setReceiptEmail(paymentIntent.getReceiptEmail());
        donation.setReceiptSent(false);
        donation.setTimestamp(LocalDateTime.ofEpochSecond(paymentIntent.getCreated(), 0, ZoneOffset.UTC));

        // Calculate fees (approximate - Stripe's actual fees may vary)
        BigDecimal feeAmount = calculateStripeFee(amount);
        donation.setFeeAmount(feeAmount);
        donation.setNetAmount(amount.subtract(feeAmount));

        // Save donation
        donation = donationRepository.save(donation);

        log.info("Created donation record {} for payment intent {} with amount ${}",
            donation.getId(), paymentIntentId, amount);

        return donation;
    }

    /**
     * Process a successful payment from webhook
     */
    @Transactional
    public Donation processSuccessfulPayment(PaymentIntent paymentIntent) throws StripeException {
        log.info("Processing successful payment from webhook for payment intent {}", paymentIntent.getId());

        // Extract user ID from metadata
        Map<String, String> metadata = paymentIntent.getMetadata();
        String userIdStr = metadata.get("user_id");

        if (userIdStr == null) {
            log.error("No user_id found in payment intent metadata: {}", paymentIntent.getId());
            throw new IllegalStateException("No user_id found in payment intent metadata");
        }

        UUID userId = UUID.fromString(userIdStr);

        // Check if donation already exists
        if (donationRepository.findByStripePaymentIntentId(paymentIntent.getId()).isPresent()) {
            log.info("Donation already exists for payment intent {}", paymentIntent.getId());
            return donationRepository.findByStripePaymentIntentId(paymentIntent.getId()).get();
        }

        // Create user object (you might want to fetch from database for validation)
        User user = new User();
        user.setId(userId);

        return confirmPayment(paymentIntent.getId(), user);
    }

    /**
     * Calculate approximate Stripe processing fee
     */
    private BigDecimal calculateStripeFee(BigDecimal amount) {
        // Stripe fee: 2.9% + $0.30 for cards
        BigDecimal percentageFee = amount.multiply(BigDecimal.valueOf(0.029));
        BigDecimal fixedFee = BigDecimal.valueOf(0.30);
        return percentageFee.add(fixedFee);
    }

    /**
     * Generate unique transaction ID
     */
    private String generateTransactionId() {
        return "TXN_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    /**
     * Retrieve payment intent by ID
     */
    public PaymentIntent getPaymentIntent(String paymentIntentId) throws StripeException {
        return PaymentIntent.retrieve(paymentIntentId);
    }

    /**
     * Cancel a payment intent
     */
    public PaymentIntent cancelPaymentIntent(String paymentIntentId) throws StripeException {
        log.info("Canceling payment intent {}", paymentIntentId);

        PaymentIntent paymentIntent = PaymentIntent.retrieve(paymentIntentId);
        return paymentIntent.cancel();
    }
}