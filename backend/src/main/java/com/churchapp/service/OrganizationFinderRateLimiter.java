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
 * Per-user sliding-window budget for *AI-assisted* organization searches. The rule-based
 * fast path is free and never counted; only requests that would actually call OpenAI consume
 * budget. Kept separate from {@link FeedScopeRateLimiter} so exploring churches can't lock a
 * user out of changing their feed (and vice versa).
 *
 * In-memory (per instance) - same trade-off as the feed limiter.
 */
@Service
@Slf4j
public class OrganizationFinderRateLimiter {

    private static final Duration WINDOW = Duration.ofHours(1);

    private final int limitPerHour;
    private final Map<UUID, Deque<Instant>> attempts = new ConcurrentHashMap<>();

    public OrganizationFinderRateLimiter(
            @Value("${organizations.finder.ai-rate-limit-per-hour:30}") int limitPerHour) {
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
                log.info("⏳ Organization finder AI rate limit hit for user {}", userId);
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
