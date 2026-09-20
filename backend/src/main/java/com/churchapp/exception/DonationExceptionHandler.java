package com.churchapp.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

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

    @ExceptionHandler({MissingRequestHeaderException.class, HttpMessageNotReadableException.class})
    public ResponseEntity<ErrorResponse> handleBadRequestException(Exception e) {
        log.error("Bad request exception: {}", e.getMessage());

        ErrorResponse errorResponse = new ErrorResponse(
            "INVALID_REQUEST",
            "Invalid request parameters",
            e.getMessage(),
            LocalDateTime.now()
        );

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    // ------------------------------------------------------------------------
    // Client errors that Spring MVC / Security raise before a controller runs.
    // Without these, the catch-all below turns a mistyped URL or wrong HTTP verb
    // into a 500 with a stack trace, which hides real server errors in monitoring.
    // ------------------------------------------------------------------------

    @ExceptionHandler({NoResourceFoundException.class, NoHandlerFoundException.class})
    public ResponseEntity<ErrorResponse> handleNotFound(Exception e) {
        log.warn("No route: {}", e.getMessage());

        ErrorResponse errorResponse = new ErrorResponse(
            "NOT_FOUND",
            "The requested resource was not found",
            e.getMessage(),
            LocalDateTime.now()
        );

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethodNotAllowed(HttpRequestMethodNotSupportedException e) {
        log.warn("Method not allowed: {}", e.getMessage());

        ErrorResponse errorResponse = new ErrorResponse(
            "METHOD_NOT_ALLOWED",
            "That action isn't supported on this resource",
            e.getMessage(),
            LocalDateTime.now()
        );

        ResponseEntity.BodyBuilder builder = ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED);
        if (e.getSupportedHttpMethods() != null && !e.getSupportedHttpMethods().isEmpty()) {
            builder.allow(e.getSupportedHttpMethods().toArray(new HttpMethod[0]));
        }
        return builder.body(errorResponse);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException e) {
        log.warn("Access denied: {}", e.getMessage());

        ErrorResponse errorResponse = new ErrorResponse(
            "FORBIDDEN",
            "You don't have permission to do that",
            e.getMessage(),
            LocalDateTime.now()
        );

        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorResponse);
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