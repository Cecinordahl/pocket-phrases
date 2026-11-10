package com.pocketphrases.roleplay;

import org.springframework.stereotype.Component;

import java.time.Clock;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory sliding-window limit per client IP, so an anonymous user (no
 * accounts) can't run up the Anthropic bill. Resets on restart, which is
 * fine for a single small instance.
 */
@Component
class RoleplayRateLimiter {

    static final int MAX_TURNS_PER_HOUR = 60;
    private static final long WINDOW_MS = 60 * 60 * 1000L;

    private final Map<String, Deque<Long>> hits = new ConcurrentHashMap<>();
    private final Clock clock;

    RoleplayRateLimiter() {
        this(Clock.systemUTC());
    }

    RoleplayRateLimiter(Clock clock) {
        this.clock = clock;
    }

    /** Records a hit and returns false if this client is over the limit. */
    boolean tryAcquire(String clientId) {
        long now = clock.millis();
        Deque<Long> times = hits.computeIfAbsent(clientId, k -> new ArrayDeque<>());
        synchronized (times) {
            while (!times.isEmpty() && now - times.peekFirst() > WINDOW_MS) {
                times.pollFirst();
            }
            if (times.size() >= MAX_TURNS_PER_HOUR) {
                return false;
            }
            times.addLast(now);
            return true;
        }
    }
}
