package com.churchapp.exception;

import org.springframework.http.HttpStatus;

public class ChatAccessDeniedException extends ChatException {

    public ChatAccessDeniedException(String message) {
        super(message, HttpStatus.FORBIDDEN);
    }
}
