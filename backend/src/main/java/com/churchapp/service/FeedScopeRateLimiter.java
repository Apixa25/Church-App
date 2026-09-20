package com.churchapp.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Per-user sliding-window limit on natural-language parses. Protects the OpenAI
 * bill from a runaway client or a user mashing the button.
 *
 * In-memory and therefore per-instance; on a multi-instance Elastic Beanstalk
 * environment the effective limit is (instances x limit), which is acceptable
 * for a cost guardrail. Swap for a Redis-backed limiter if that ever matters.
 */
@Service
@Slf4j
public class FeedScopeRateLimiter {

    private static final Duration WINDOW = Duration.ofHours(1);

    private final int limitPerHour;
    private final Map<UUID, Deque<Instant>> attempts = new ConcurrentHashMap<>();

    public FeedScopeRateLimiter(@Value("${feed.scope.parse.rate-limit-per-hour:20}") int limitPerHour) {
        this.limitPerHour = limitPerHour;
    }

    /** Records an attempt and returns true if the user is still within their limit. */
    public boolean tryAcquire(UUID userId) {
        if (limitPerHour <= 0) {
            return true;
        }
        Instant now = Instant.now();
        Deque<Instant> window = attempts.computeIfAbsent(userId, k -> new ArrayDeque<>());
        synchronized (window) {
            Instant cutoff = now.minus(WINDOW);
            while (!window.isEmpty() && window.peekFirst().isBefore(cutoff)) {
                window.pollFirst();
            }
            if (window.size() >= limitPerHour) {
                log.info("⏳ Feed scope parse rate limit hit for user {}", userId);
                return false;
            }
            window.addLast(now);
            return true;
        }
    }

    public int getLimitPerHour() {
        return limitPerHour;
    }
}
