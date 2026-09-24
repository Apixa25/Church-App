package com.churchapp.exception;

import org.springframework.http.HttpStatus;

/**
 * The caller exists and the prayer exists, but the caller may not touch it:
 * wrong church, not the owner, or not a moderator (HTTP 403).
 */
public class PrayerAccessDeniedException extends PrayerException {

    public PrayerAccessDeniedException(String message) {
        super(message, HttpStatus.FORBIDDEN);
    }
}
