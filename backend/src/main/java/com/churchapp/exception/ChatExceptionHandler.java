package com.churchapp.exception;

import com.churchapp.controller.ChatController;
import com.churchapp.controller.ChatDirectoryController;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Maps chat exceptions to proper HTTP semantics (403 / 404 / 400) with the same
 * {@code { "error": "..." }} body shape the chat frontend already expects.
 * Scoped to the chat controllers so other features keep their existing behavior.
 */
@RestControllerAdvice(assignableTypes = {ChatController.class, ChatDirectoryController.class})
@Slf4j
public class ChatExceptionHandler {

    @ExceptionHandler(ChatException.class)
    public ResponseEntity<Map<String, Object>> handleChatException(ChatException e) {
        HttpStatus status = e.getStatus() != null ? e.getStatus() : HttpStatus.BAD_REQUEST;
        if (status.is5xxServerError()) {
            log.error("Chat error: {}", e.getMessage(), e);
        } else {
            log.debug("Chat request rejected ({}): {}", status.value(), e.getMessage());
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("error", e.getMessage());
        body.put("status", status.value());
        body.put("timestamp", LocalDateTime.now());
        return ResponseEntity.status(status).body(body);
    }
}
