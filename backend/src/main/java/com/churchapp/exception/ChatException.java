package com.churchapp.exception;

import org.springframework.http.HttpStatus;

/**
 * Base class for chat/messaging failures. Carries the HTTP status the REST layer should
 * respond with so callers can distinguish "not allowed" from "does not exist" from "bad input".
 */
public class ChatException extends RuntimeException {

    private final HttpStatus status;

    public ChatException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
