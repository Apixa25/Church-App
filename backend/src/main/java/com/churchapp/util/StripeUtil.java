package com.churchapp.util;

import com.churchapp.entity.DonationCategory;
import com.churchapp.entity.RecurringFrequency;
import com.churchapp.exception.PaymentException;
import com.stripe.exception.StripeException;
import com.stripe.model.StripeError;
import lombok.extern.slf4j.Slf4j;

import java.math.BigDecimal;

/**
 * Utility class for common Stripe operations and error handling
 */
@Slf4j
public class StripeUtil {

    // Minimum donation amount ($1.00)
    public static final BigDecimal MIN_DONATION_AMOUNT = BigDecimal.valueOf(1.00);

    // Maximum donation amount ($10,000.00)
    public static final BigDecimal MAX_DONATION_AMOUNT = BigDecimal.valueOf(10000.00);

    /**
     * Validate donation amount
     */
    public static void validateDonationAmount(BigDecimal amount) {
        if (amount == null) {
            throw new PaymentException("INVALID_AMOUNT", "Donation amount is required",
                "Please enter a donation amount");
        }

        if (amount.compareTo(MIN_DONATION_AMOUNT) < 0) {
            throw new PaymentException("AMOUNT_TOO_SMALL",
                "Donation amount is too small: " + amount,
                "Minimum donation amount is $" + MIN_DONATION_AMOUNT);
        }

        if (amount.compareTo(MAX_DONATION_AMOUNT) > 0) {
            throw new PaymentException("AMOUNT_TOO_LARGE",
                "Donation amount is too large: " + amount,
                "Maximum donation amount is $" + MAX_DONATION_AMOUNT);
        }

        // Check for reasonable decimal places (max 2)
        if (amount.scale() > 2) {
            throw new PaymentException("INVALID_AMOUNT_PRECISION",
                "Donation amount has too many decimal places",
                "Please enter amount in dollars and cents only");
        }
    }

    /**
     * Convert amount to Stripe cents format
     */
    public static long amountToCents(BigDecimal amount) {
        validateDonationAmount(amount);
        return amount.multiply(BigDecimal.valueOf(100)).longValue();
    }

    /**
     * Convert Stripe cents to BigDecimal amount
     */
    public static BigDecimal centsToAmount(long cents) {
        return BigDecimal.valueOf(cents).divide(BigDecimal.valueOf(100));
    }

    /**
     * Handle Stripe exceptions and convert to user-friendly messages
     */
    public static PaymentException handleStripeException(StripeException e) {
        log.error("Stripe exception: {} - {}", e.getCode(), e.getMessage(), e);

        StripeError stripeError = e.getStripeError();
        String errorCode = stripeError != null ? stripeError.getCode() : e.getCode();
        String userMessage = getUserFriendlyErrorMessage(errorCode);

        return new PaymentException(errorCode, e.getMessage(), userMessage, e);
    }

    /**
     * Get user-friendly error message based on Stripe error code
     */
    private static String getUserFriendlyErrorMessage(String errorCode) {
        if (errorCode == null) {
            return "Payment processing failed. Please try again.";
        }

        switch (errorCode) {
            case "card_declined":
                return "Your card was declined. Please try a different payment method.";
            case "insufficient_funds":
                return "Insufficient funds. Please try a different payment method.";
            case "incorrect_cvc":
                return "Your card's security code is incorrect. Please check and try again.";
            case "expired_card":
                return "Your card has expired. Please try a different payment method.";
            case "processing_error":
                return "An error occurred while processing your payment. Please try again.";
            case "incorrect_number":
                return "Your card number is incorrect. Please check and try again.";
            case "invalid_expiry_month":
            case "invalid_expiry_year":
                return "Your card's expiration date is invalid. Please check and try again.";
            case "postal_code_fail":
                return "Your postal code failed validation. Please check and try again.";
            case "authentication_required":
                return "Your payment requires additional authentication. Please complete the verification.";
            case "payment_intent_authentication_failure":
                return "Payment authentication failed. Please try again.";
            case "amount_too_large":
                return "The payment amount is too large. Please contact us for assistance.";
            case "amount_too_small":
                return "The payment amount is too small. Minimum donation is $" + MIN_DONATION_AMOUNT + ".";
            case "subscription_creation_failed":
                return "Unable to create recurring donation. Please try again.";
            case "invoice_payment_failed":
                return "Your recurring donation payment failed. Please update your payment method.";
            default:
                return "Payment processing failed. Please try again or contact support.";
        }
    }

    /**
     * Generate description for payment intent
     */
    public static String generatePaymentDescription(DonationCategory category, String userName) {
        return String.format("%s donation for %s", category.getDisplayName(), userName);
    }

    /**
     * Generate description for subscription
     */
    public static String generateSubscriptionDescription(DonationCategory category,
                                                       RecurringFrequency frequency,
                                                       String userName) {
        return String.format("%s %s donation for %s",
            frequency.getDisplayName(),
            category.getDisplayName(),
            userName);
    }

    /**
     * Validate email format (basic validation)
     */
    public static boolean isValidEmail(String email) {
        return email != null &&
               email.contains("@") &&
               email.contains(".") &&
               email.length() > 5 &&
               email.length() < 255;
    }

    /**
     * Calculate estimated processing fee for display purposes
     */
    public static BigDecimal calculateEstimatedFee(BigDecimal amount) {
        // Stripe fee: 2.9% + $0.30 for cards
        BigDecimal percentageFee = amount.multiply(BigDecimal.valueOf(0.029));
        BigDecimal fixedFee = BigDecimal.valueOf(0.30);
        return percentageFee.add(fixedFee).setScale(2, BigDecimal.ROUND_HALF_UP);
    }

    /**
     * Calculate net amount after fees
     */
    public static BigDecimal calculateNetAmount(BigDecimal amount) {
        return amount.subtract(calculateEstimatedFee(amount)).setScale(2, BigDecimal.ROUND_HALF_UP);
    }

    /**
     * Sanitize metadata value for Stripe (max 500 characters)
     */
    public static String sanitizeMetadata(String value) {
        if (value == null) {
            return null;
        }

        String sanitized = value.trim();
        if (sanitized.length() > 500) {
            sanitized = sanitized.substring(0, 500);
        }

        return sanitized;
    }
}