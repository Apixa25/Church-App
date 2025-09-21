package com.churchapp.exception;

/**
 * Custom exception for subscription-related errors
 */
public class SubscriptionException extends RuntimeException {

    private final String errorCode;
    private final String userMessage;

    public SubscriptionException(String message) {
        super(message);
        this.errorCode = "SUBSCRIPTION_ERROR";
        this.userMessage = "Subscription processing failed. Please try again.";
    }

    public SubscriptionException(String message, Throwable cause) {
        super(message, cause);
        this.errorCode = "SUBSCRIPTION_ERROR";
        this.userMessage = "Subscription processing failed. Please try again.";
    }

    public SubscriptionException(String errorCode, String message, String userMessage) {
        super(message);
        this.errorCode = errorCode;
        this.userMessage = userMessage;
    }

    public SubscriptionException(String errorCode, String message, String userMessage, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
        this.userMessage = userMessage;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public String getUserMessage() {
        return userMessage;
    }
}