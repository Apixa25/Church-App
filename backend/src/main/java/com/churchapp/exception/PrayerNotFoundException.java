package com.churchapp.exception;

import org.springframework.http.HttpStatus;

/** A prayer request, interaction, or parent comment that does not exist (HTTP 404). */
public class PrayerNotFoundException extends PrayerException {

    public PrayerNotFoundException(String message) {
        super(message, HttpStatus.NOT_FOUND);
    }
}
