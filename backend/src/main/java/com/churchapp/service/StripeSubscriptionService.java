package com.churchapp.service;

import com.churchapp.entity.*;
import com.churchapp.repository.DonationSubscriptionRepository;
import com.churchapp.repository.OrganizationRepository;
import com.churchapp.repository.UserOrganizationMembershipRepository;
import com.stripe.exception.StripeException;
import com.stripe.model.*;
import com.stripe.param.*;
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
public class StripeSubscriptionService {

    private final DonationSubscriptionRepository subscriptionRepository;
    private final StripeCustomerService stripeCustomerService;
    private final OrganizationRepository organizationRepository;
    private final UserOrganizationMembershipRepository membershipRepository;

    /**
     * Create a recurring donation subscription
     */
    @Transactional
    public DonationSubscription createSubscription(User user, BigDecimal amount, DonationCategory category,
                                                  RecurringFrequency frequency, String purpose,
                                                  String paymentMethodId, UUID organizationId) throws StripeException {
        log.info("Creating subscription for user {} with amount ${} every {} for organization {}",
            user.getId(), amount, frequency.getDisplayName(), organizationId);

        // Determine which organization to use
        Organization organization = null;
        if (organizationId != null) {
            // Use provided organizationId (from active context - Church or Family)
            organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new RuntimeException("Organization not found with id: " + organizationId));
            log.info("Using provided organizationId: {} ({})", organization.getName(), organizationId);
            
            // Verify user is a member of this organization
            boolean isMember = membershipRepository.existsByUserIdAndOrganizationId(user.getId(), organizationId);
            if (!isMember) {
                throw new RuntimeException("You are not a member of this organization. Please join the organization before creating subscriptions.");
            }
        } else if (user.getChurchPrimaryOrganization() != null) {
            // Fallback to church primary for backward compatibility
            organization = user.getChurchPrimaryOrganization();
            log.info("No organizationId provided, using church primary: {} ({})", organization.getName(), organization.getId());
        } else {
            throw new RuntimeException("Cannot create subscription without an organization. Please select an organization first.");
        }

        // Get or create Stripe customer
        Customer customer = stripeCustomerService.getOrCreateCustomer(user);

        // Attach payment method to customer
        attachPaymentMethodToCustomer(paymentMethodId, customer.getId());

        // Create product for this donation type
        Product product = createOrGetProduct(category);

        // Create price for this amount and frequency
        Price price = createPrice(product.getId(), amount, frequency);

        // Build metadata
        Map<String, String> metadata = new HashMap<>();
        metadata.put("user_id", user.getId().toString());
        metadata.put("organization_id", organization.getId().toString());
        metadata.put("organization_name", organization.getName());
        metadata.put("category", category.name());
        metadata.put("frequency", frequency.name());
        metadata.put("church_app", "true");
        if (purpose != null && !purpose.trim().isEmpty()) {
            metadata.put("purpose", purpose.trim().substring(0, Math.min(purpose.trim().length(), 500)));
        }

        // Create subscription parameters
        SubscriptionCreateParams params = SubscriptionCreateParams.builder()
                .setCustomer(customer.getId())
                .setDefaultPaymentMethod(paymentMethodId)
                .addItem(SubscriptionCreateParams.Item.builder()
                    .setPrice(price.getId())
                    .build())
                .putAllMetadata(metadata)
                .setDescription(String.format("%s %s donation for %s",
                    frequency.getDisplayName(),
                    category.getDisplayName(),
                    user.getName()))
                .build();

        // Create Stripe subscription
        Subscription stripeSubscription = Subscription.create(params);

        // Create our database record
        DonationSubscription subscription = new DonationSubscription();
        subscription.setUser(user);
        subscription.setOrganization(organization); // Multi-tenant: link to organization
        subscription.setStripeSubscriptionId(stripeSubscription.getId());
        subscription.setStripeCustomerId(customer.getId());
        subscription.setStripePriceId(price.getId());
        subscription.setAmount(amount);
        subscription.setFrequency(frequency);
        subscription.setCategory(category);
        subscription.setPurpose(purpose);
        subscription.setStatus(SubscriptionStatus.fromStripeStatus(stripeSubscription.getStatus()));
        subscription.setCurrency("USD");

        // Set period information
        subscription.setCurrentPeriodStart(
            LocalDateTime.ofEpochSecond(stripeSubscription.getCurrentPeriodStart(), 0, ZoneOffset.UTC));
        subscription.setCurrentPeriodEnd(
            LocalDateTime.ofEpochSecond(stripeSubscription.getCurrentPeriodEnd(), 0, ZoneOffset.UTC));
        subscription.setStartedAt(LocalDateTime.now());

        // Get payment method details
        try {
            PaymentMethod paymentMethod = PaymentMethod.retrieve(paymentMethodId);
            if (paymentMethod.getCard() != null) {
                subscription.setPaymentMethodLast4(paymentMethod.getCard().getLast4());
                subscription.setPaymentMethodBrand(paymentMethod.getCard().getBrand());
            }
        } catch (StripeException e) {
            log.warn("Could not retrieve payment method details for {}: {}", paymentMethodId, e.getMessage());
        }

        subscription = subscriptionRepository.save(subscription);

        log.info("Created subscription {} for user {} with Stripe subscription {}",
            subscription.getId(), user.getId(), stripeSubscription.getId());

        return subscription;
    }

    /**
     * Cancel a subscription
     */
    @Transactional
    public DonationSubscription cancelSubscription(String subscriptionId, User user) throws StripeException {
        log.info("Canceling subscription {} for user {}", subscriptionId, user.getId());

        // Find our subscription record
        DonationSubscription subscription = subscriptionRepository.findByStripeSubscriptionId(subscriptionId)
                .orElseThrow(() -> new IllegalArgumentException("Subscription not found: " + subscriptionId));

        // Verify user ownership
        if (!subscription.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("User does not own this subscription");
        }

        // Cancel in Stripe
        Subscription stripeSubscription = Subscription.retrieve(subscriptionId);
        stripeSubscription = stripeSubscription.cancel();

        // Update our record
        subscription.setStatus(SubscriptionStatus.CANCELED);
        subscription.setCanceledAt(LocalDateTime.now());
        subscription.setEndedAt(LocalDateTime.now());

        subscription = subscriptionRepository.save(subscription);

        log.info("Canceled subscription {} for user {}", subscriptionId, user.getId());
        return subscription;
    }

    /**
     * Update subscription payment method
     */
    @Transactional
    public DonationSubscription updatePaymentMethod(String subscriptionId, String newPaymentMethodId,
                                                   User user) throws StripeException {
        log.info("Updating payment method for subscription {} for user {}", subscriptionId, user.getId());

        // Find our subscription record
        DonationSubscription subscription = subscriptionRepository.findByStripeSubscriptionId(subscriptionId)
                .orElseThrow(() -> new IllegalArgumentException("Subscription not found: " + subscriptionId));

        // Verify user ownership
        if (!subscription.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("User does not own this subscription");
        }

        // Attach new payment method to customer
        attachPaymentMethodToCustomer(newPaymentMethodId, subscription.getStripeCustomerId());

        // Update subscription in Stripe
        SubscriptionUpdateParams params = SubscriptionUpdateParams.builder()
                .setDefaultPaymentMethod(newPaymentMethodId)
                .build();

        Subscription stripeSubscription = Subscription.retrieve(subscriptionId);
        stripeSubscription.update(params);

        // Update payment method details in our record
        try {
            PaymentMethod paymentMethod = PaymentMethod.retrieve(newPaymentMethodId);
            if (paymentMethod.getCard() != null) {
                subscription.setPaymentMethodLast4(paymentMethod.getCard().getLast4());
                subscription.setPaymentMethodBrand(paymentMethod.getCard().getBrand());
            }
        } catch (StripeException e) {
            log.warn("Could not retrieve payment method details for {}: {}", newPaymentMethodId, e.getMessage());
        }

        subscription = subscriptionRepository.save(subscription);

        log.info("Updated payment method for subscription {} for user {}", subscriptionId, user.getId());
        return subscription;
    }

    /**
     * Process subscription invoice payment success from webhook
     */
    @Transactional
    public void processSubscriptionPayment(Invoice invoice) throws StripeException {
        log.info("Processing subscription payment for invoice {}", invoice.getId());

        String subscriptionId = invoice.getSubscription();
        if (subscriptionId == null) {
            log.warn("Invoice {} has no subscription ID", invoice.getId());
            return;
        }

        // Find our subscription record
        DonationSubscription subscription = subscriptionRepository.findByStripeSubscriptionId(subscriptionId)
                .orElse(null);

        if (subscription == null) {
            log.warn("No subscription found for Stripe subscription {}", subscriptionId);
            return;
        }

        // Update subscription status and period info
        Subscription stripeSubscription = Subscription.retrieve(subscriptionId);
        subscription.setStatus(SubscriptionStatus.fromStripeStatus(stripeSubscription.getStatus()));
        subscription.setCurrentPeriodStart(
            LocalDateTime.ofEpochSecond(stripeSubscription.getCurrentPeriodStart(), 0, ZoneOffset.UTC));
        subscription.setCurrentPeriodEnd(
            LocalDateTime.ofEpochSecond(stripeSubscription.getCurrentPeriodEnd(), 0, ZoneOffset.UTC));

        // Reset failure count on successful payment
        subscription.setFailureCount(0);
        subscription.setLastFailureReason(null);
        subscription.setLastFailureDate(null);

        subscriptionRepository.save(subscription);

        log.info("Updated subscription {} after successful payment", subscription.getId());
    }

    /**
     * Attach payment method to customer
     */
    private void attachPaymentMethodToCustomer(String paymentMethodId, String customerId) throws StripeException {
        PaymentMethodAttachParams params = PaymentMethodAttachParams.builder()
                .setCustomer(customerId)
                .build();

        PaymentMethod paymentMethod = PaymentMethod.retrieve(paymentMethodId);
        paymentMethod.attach(params);
    }

    /**
     * Create or get product for donation category
     */
    private Product createOrGetProduct(DonationCategory category) throws StripeException {
        String productName = "Church Donations - " + category.getDisplayName();

        // Try to find existing product first
        ProductListParams listParams = ProductListParams.builder()
                .setLimit(100L)
                .build();

        ProductCollection products = Product.list(listParams);
        for (Product product : products.getData()) {
            if (productName.equals(product.getName())) {
                return product;
            }
        }

        // Create new product
        ProductCreateParams params = ProductCreateParams.builder()
                .setName(productName)
                .setDescription("Recurring donations for " + category.getDisplayName())
                .setType(ProductCreateParams.Type.SERVICE)
                .build();

        return Product.create(params);
    }

    /**
     * Create price for product
     */
    private Price createPrice(String productId, BigDecimal amount, RecurringFrequency frequency) throws StripeException {
        long amountInCents = amount.multiply(BigDecimal.valueOf(100)).longValue();

        PriceCreateParams params = PriceCreateParams.builder()
                .setProduct(productId)
                .setCurrency("usd")
                .setUnitAmount(amountInCents)
                .setRecurring(PriceCreateParams.Recurring.builder()
                    .setInterval(PriceCreateParams.Recurring.Interval.valueOf(frequency.getStripeInterval().toUpperCase()))
                    .build())
                .build();

        return Price.create(params);
    }
}