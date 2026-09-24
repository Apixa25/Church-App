package com.churchapp.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Tracks which users currently hold an open WebSocket session.
 *
 * A user may have several tabs/devices, so presence is keyed by user (email principal)
 * with a set of session ids. Presence is per JVM: when the app scales past one instance,
 * move this map into Redis and keep the same API.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ChatPresenceService {

    private final SimpMessagingTemplate messagingTemplate;

    private final Map<String, Set<String>> sessionsByUser = new ConcurrentHashMap<>();
    private final Map<String, String> userBySession = new ConcurrentHashMap<>();

    @EventListener
    public void onConnected(SessionConnectedEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal principal = event.getUser() != null ? event.getUser() : accessor.getUser();
        String sessionId = accessor.getSessionId();
        if (principal == null || principal.getName() == null || sessionId == null) {
            return;
        }

        String email = principal.getName();
        boolean wasOffline = !isOnline(email);
        sessionsByUser.computeIfAbsent(email, k -> ConcurrentHashMap.newKeySet()).add(sessionId);
        userBySession.put(sessionId, email);

        if (wasOffline) {
            broadcastPresence(email, true);
        }
    }

    @EventListener
    public void onDisconnected(SessionDisconnectEvent event) {
        String sessionId = event.getSessionId();
        String email = userBySession.remove(sessionId);
        if (email == null) {
            return;
        }

        Set<String> sessions = sessionsByUser.get(email);
        if (sessions != null) {
            sessions.remove(sessionId);
            if (sessions.isEmpty()) {
                sessionsByUser.remove(email);
                broadcastPresence(email, false);
            }
        }
    }

    public boolean isOnline(String email) {
        Set<String> sessions = email != null ? sessionsByUser.get(email) : null;
        return sessions != null && !sessions.isEmpty();
    }

    public Set<String> getOnlineUserEmails() {
        return Collections.unmodifiableSet(sessionsByUser.keySet());
    }

    private void broadcastPresence(String email, boolean online) {
        try {
            Map<String, Object> presence = new HashMap<>();
            presence.put("type", "presence_update");
            presence.put("userEmail", email);
            presence.put("status", online ? "online" : "offline");
            presence.put("timestamp", LocalDateTime.now());
            messagingTemplate.convertAndSend("/topic/presence", presence);
        } catch (Exception e) {
            log.debug("Failed to broadcast presence for {}: {}", email, e.getMessage());
        }
    }
}
