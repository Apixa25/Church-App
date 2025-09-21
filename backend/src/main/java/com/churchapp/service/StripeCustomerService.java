package com.churchapp.service;

import com.churchapp.entity.User;
import com.stripe.exception.StripeException;
import com.stripe.model.Customer;
import com.stripe.model.CustomerSearchResult;
import com.stripe.param.CustomerCreateParams;
import com.stripe.param.CustomerSearchParams;
import com.stripe.param.CustomerUpdateParams;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
public class StripeCustomerService {

    /**
     * Get existing Stripe customer or create a new one
     */
    public Customer getOrCreateCustomer(User user) throws StripeException {
        log.info("Getting or creating Stripe customer for user {}", user.getId());

        // First, try to find existing customer by email
        Customer existingCustomer = findCustomerByEmail(user.getEmail());
        if (existingCustomer != null) {
            log.info("Found existing Stripe customer {} for user {}", existingCustomer.getId(), user.getId());
            return existingCustomer;
        }

        // Create new customer
        return createCustomer(user);
    }

    /**
     * Create a new Stripe customer
     */
    public Customer createCustomer(User user) throws StripeException {
        log.info("Creating new Stripe customer for user {}", user.getId());

        Map<String, String> metadata = new HashMap<>();
        metadata.put("user_id", user.getId().toString());
        metadata.put("church_app", "true");

        CustomerCreateParams params = CustomerCreateParams.builder()
                .setEmail(user.getEmail())
                .setName(user.getName())
                .setDescription("Church App User: " + user.getName())
                .putAllMetadata(metadata)
                .build();

        Customer customer = Customer.create(params);

        log.info("Created Stripe customer {} for user {}", customer.getId(), user.getId());
        return customer;
    }

    /**
     * Find customer by email address
     */
    public Customer findCustomerByEmail(String email) throws StripeException {
        log.debug("Searching for Stripe customer with email {}", email);

        CustomerSearchParams searchParams = CustomerSearchParams.builder()
                .setQuery("email:'" + email + "'")
                .setLimit(1L)
                .build();

        CustomerSearchResult searchResult = Customer.search(searchParams);

        if (!searchResult.getData().isEmpty()) {
            Customer customer = searchResult.getData().get(0);
            log.debug("Found Stripe customer {} with email {}", customer.getId(), email);
            return customer;
        }

        log.debug("No Stripe customer found with email {}", email);
        return null;
    }

    /**
     * Update customer information
     */
    public Customer updateCustomer(String customerId, User user) throws StripeException {
        log.info("Updating Stripe customer {} for user {}", customerId, user.getId());

        Map<String, String> metadata = new HashMap<>();
        metadata.put("user_id", user.getId().toString());
        metadata.put("church_app", "true");

        CustomerUpdateParams params = CustomerUpdateParams.builder()
                .setEmail(user.getEmail())
                .setName(user.getName())
                .setDescription("Church App User: " + user.getName())
                .putAllMetadata(metadata)
                .build();

        Customer customer = Customer.retrieve(customerId);
        return customer.update(params);
    }

    /**
     * Get customer by ID
     */
    public Customer getCustomer(String customerId) throws StripeException {
        return Customer.retrieve(customerId);
    }

    /**
     * Delete customer (rarely used - mostly for testing)
     */
    public Customer deleteCustomer(String customerId) throws StripeException {
        log.warn("Deleting Stripe customer {}", customerId);

        Customer customer = Customer.retrieve(customerId);
        return customer.delete();
    }
}