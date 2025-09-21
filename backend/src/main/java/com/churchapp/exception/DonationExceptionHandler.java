package com.churchapp.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class DonationExceptionHandler {

    @ExceptionHandler(PaymentException.class)
    public ResponseEntity<ErrorResponse> handlePaymentException(PaymentException e) {
        log.error("Payment exception: {} - {}", e.getErrorCode(), e.getMessage());

        ErrorResponse errorResponse = new ErrorResponse(
            e.getErrorCode(),
            e.getUserMessage(),
            e.getMessage(),
            LocalDateTime.now()
        );

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    @ExceptionHandler(SubscriptionException.class)
    public ResponseEntity<ErrorResponse> handleSubscriptionException(SubscriptionException e) {
        log.error("Subscription exception: {} - {}", e.getErrorCode(), e.getMessage());

        ErrorResponse errorResponse = new ErrorResponse(
            e.getErrorCode(),
            e.getUserMessage(),
            e.getMessage(),
            LocalDateTime.now()
        );

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ValidationErrorResponse> handleValidationException(MethodArgumentNotValidException e) {
        log.error("Validation exception: {}", e.getMessage());

        Map<String, String> errors = new HashMap<>();
        e.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });

        ValidationErrorResponse errorResponse = new ValidationErrorResponse(
            "VALIDATION_ERROR",
            "Please check your input and try again",
            errors,
            LocalDateTime.now()
        );

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgumentException(IllegalArgumentException e) {
        log.error("Illegal argument exception: {}", e.getMessage());

        ErrorResponse errorResponse = new ErrorResponse(
            "INVALID_REQUEST",
            "Invalid request parameters",
            e.getMessage(),
            LocalDateTime.now()
        );

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception e) {
        log.error("Unexpected exception: {}", e.getMessage(), e);

        ErrorResponse errorResponse = new ErrorResponse(
            "INTERNAL_ERROR",
            "An unexpected error occurred. Please try again later.",
            "Internal server error",
            LocalDateTime.now()
        );

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
    }

    // Error response DTOs
    public static class ErrorResponse {
        private String errorCode;
        private String userMessage;
        private String developerMessage;
        private LocalDateTime timestamp;

        public ErrorResponse(String errorCode, String userMessage, String developerMessage, LocalDateTime timestamp) {
            this.errorCode = errorCode;
            this.userMessage = userMessage;
            this.developerMessage = developerMessage;
            this.timestamp = timestamp;
        }

        // Getters
        public String getErrorCode() { return errorCode; }
        public String getUserMessage() { return userMessage; }
        public String getDeveloperMessage() { return developerMessage; }
        public LocalDateTime getTimestamp() { return timestamp; }
    }

    public static class ValidationErrorResponse {
        private String errorCode;
        private String userMessage;
        private Map<String, String> fieldErrors;
        private LocalDateTime timestamp;

        public ValidationErrorResponse(String errorCode, String userMessage, Map<String, String> fieldErrors, LocalDateTime timestamp) {
            this.errorCode = errorCode;
            this.userMessage = userMessage;
            this.fieldErrors = fieldErrors;
            this.timestamp = timestamp;
        }

        // Getters
        public String getErrorCode() { return errorCode; }
        public String getUserMessage() { return userMessage; }
        public Map<String, String> getFieldErrors() { return fieldErrors; }
        public LocalDateTime getTimestamp() { return timestamp; }
    }
}