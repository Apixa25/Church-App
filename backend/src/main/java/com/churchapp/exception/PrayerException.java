package com.churchapp.exception;

import org.springframework.http.HttpStatus;

/**
 * Base class for prayer-request failures. Carries the HTTP status the REST layer
 * should answer with, so the frontend can tell "doesn't exist" (404) from
 * "not yours / not your church" (403) from "bad input" (400).
 *
 * Mirrors {@link ChatException} so both features speak the same language.
 */
public class PrayerException extends RuntimeException {

    private final HttpStatus status;

    public PrayerException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
