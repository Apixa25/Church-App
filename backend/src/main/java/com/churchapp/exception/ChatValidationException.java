package com.churchapp.exception;

import org.springframework.http.HttpStatus;

public class ChatValidationException extends ChatException {

    public ChatValidationException(String message) {
        super(message, HttpStatus.BAD_REQUEST);
    }
}
