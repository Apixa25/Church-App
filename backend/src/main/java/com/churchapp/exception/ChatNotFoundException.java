package com.churchapp.exception;

import org.springframework.http.HttpStatus;

public class ChatNotFoundException extends ChatException {

    public ChatNotFoundException(String message) {
        super(message, HttpStatus.NOT_FOUND);
    }
}
