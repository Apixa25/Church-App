package com.churchapp.service;

import com.churchapp.entity.*;
import com.churchapp.repository.DonationRepository;
import com.churchapp.repository.OrganizationRepository;
import com.churchapp.repository.UserRepository;
import com.stripe.exception.StripeException;
import com.stripe.model.Customer;
import com.stripe.model.PaymentIntent;
import com.stripe.model.PaymentMethod;
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
    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;

    /**
     * Create a payment intent for a one-time donation
     *
     * For multi-tenant support:
     * - Uses provided organizationId (from active context) or falls back to church primary
     * - Routes payment to organization's Stripe Connect account
     * - Uses "destination charges" pattern for Stripe Connect
     */
    public PaymentIntent createPaymentIntent(User user, BigDecimal amount, DonationCategory category,
                                           String purpose, String receiptEmail, UUID organizationId) throws StripeException {
        log.info("Creating payment intent for user {} with amount ${} for organization {}", user.getId(), amount, organizationId);

        // Determine which organization to use
        Organization organization = null;
        if (organizationId != null) {
            // Use provided organizationId (from active context - Church or Family)
            organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new RuntimeException("Organization not found with id: " + organizationId));
            log.info("Using provided organizationId: {} ({})", organization.getName(), organizationId);
        } else if (user.getChurchPrimaryOrganization() != null) {
            // Fallback to church primary for backward compatibility
            organization = user.getChurchPrimaryOrganization();
            log.info("No organizationId provided, using church primary: {} ({})", organization.getName(), organization.getId());
        } else {
            throw new RuntimeException("Cannot create donation without an organization. Please select an organization first.");
        }

        // Check if organization has Stripe Connect account configured
        if (organization.getStripeConnectAccountId() == null || organization.getStripeConnectAccountId().trim().isEmpty()) {
            throw new RuntimeException("Organization " + organization.getName() + " has not configured donation processing. Please contact your church administrator.");
        }

        log.info("Routing donation to organization {} with Stripe Connect account {}",
            organization.getId(), organization.getStripeConnectAccountId());

        // Convert amount to cents (Stripe expects amounts in cents)
        long amountInCents = amount.multiply(BigDecimal.valueOf(100)).longValue();

        // Get or create Stripe customer
        Customer customer = stripeCustomerService.getOrCreateCustomer(user);

        // Build metadata for the payment intent
        Map<String, String> metadata = new HashMap<>();
        metadata.put("user_id", user.getId().toString());
        metadata.put("organization_id", organization.getId().toString());
        metadata.put("organization_name", organization.getName());
        metadata.put("category", category.name());
        metadata.put("church_app", "true");
        metadata.put("donation_type", "one_time");
        if (purpose != null && !purpose.trim().isEmpty()) {
            metadata.put("purpose", purpose.trim().substring(0, Math.min(purpose.trim().length(), 500)));
        }

        // Create payment intent parameters with Stripe Connect
        // Using "destination charges" pattern: payment goes to connected account, platform can take application fee
        PaymentIntentCreateParams.Builder paramsBuilder = PaymentIntentCreateParams.builder()
                .setAmount(amountInCents)
                .setCurrency("usd")
                .setCustomer(customer.getId())
                .setReceiptEmail(receiptEmail != null ? receiptEmail : user.getEmail())
                .setDescription(String.format("%s donation for %s to %s",
                    category.getDisplayName(),
                    user.getName(),
                    organization.getName()))
                .putAllMetadata(metadata)
                .setAutomaticPaymentMethods(
                    PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                        .setEnabled(true)
                        .build()
                )
                // Stripe Connect: Send payment to organization's connected account
                .setTransferData(
                    PaymentIntentCreateParams.TransferData.builder()
                        .setDestination(organization.getStripeConnectAccountId())
                        .build()
                );

        // Optional: Set application fee (platform fee) - e.g., 3% or flat fee
        // Uncomment if you want to charge a platform fee
        // long applicationFeeAmount = (long) (amountInCents * 0.03); // 3% platform fee
        // paramsBuilder.setApplicationFeeAmount(applicationFeeAmount);

        PaymentIntent paymentIntent = PaymentIntent.create(paramsBuilder.build());

        log.info("Created payment intent {} for user {} with amount ${} routed to organization {} ({})",
            paymentIntent.getId(), user.getId(), amount, organization.getName(), organization.getStripeConnectAccountId());

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
        String organizationIdStr = metadata.get("organization_id");

        // Get organization from metadata (for multi-tenant routing)
        Organization organization = null;
        if (organizationIdStr != null) {
            UUID organizationId = UUID.fromString(organizationIdStr);
            organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new RuntimeException("Organization not found with id: " + organizationId));
        } else if (user.getChurchPrimaryOrganization() != null) {
            // Fallback to user's church primary organization if not in metadata
            organization = user.getChurchPrimaryOrganization();
        } else {
            throw new RuntimeException("Cannot create donation record without organization information");
        }

        // Convert amount from cents to dollars
        BigDecimal amount = BigDecimal.valueOf(paymentIntent.getAmount()).divide(BigDecimal.valueOf(100));

        // Get payment method details
        String last4 = null;
        String brand = null;

        // Stripe 24.x: charges are not expanded by default; rely on PaymentMethod if needed
        String pmIdFromIntent = paymentIntent.getPaymentMethod();
        if (pmIdFromIntent != null) {
            try {
                PaymentMethod pm = PaymentMethod.retrieve(pmIdFromIntent);
                if (pm.getCard() != null) {
                    last4 = pm.getCard().getLast4();
                    brand = pm.getCard().getBrand();
                }
            } catch (Exception ignore) {
                // If retrieval fails, proceed without card details
            }
        }

        // Create donation record
        Donation donation = new Donation();
        donation.setUser(user);
        donation.setOrganization(organization); // Multi-tenant: link to organization
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

        log.info("Created donation record {} for payment intent {} with amount ${} for organization {}",
            donation.getId(), paymentIntentId, amount, organization.getName());

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

        // Fetch full user entity with organization relationships
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

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