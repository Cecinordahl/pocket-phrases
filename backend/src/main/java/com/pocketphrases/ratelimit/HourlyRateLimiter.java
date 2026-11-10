package com.pocketphrases.ratelimit;

import java.time.Clock;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory sliding one-hour window per client, so anonymous users (no
 * accounts) can't run up the Anthropic bill. Resets on restart, which is
 * fine for a single small instance. One instance per feature, see
 * {@link RateLimitConfig}.
 */
public class HourlyRateLimiter {

    private static final long WINDOW_MS = 60 * 60 * 1000L;

    private final int maxPerHour;
    private final Clock clock;
    private final Map<String, Deque<Long>> hits = new ConcurrentHashMap<>();

    public HourlyRateLimiter(int maxPerHour) {
        this(maxPerHour, Clock.systemUTC());
    }

    public HourlyRateLimiter(int maxPerHour, Clock clock) {
        this.maxPerHour = maxPerHour;
        this.clock = clock;
    }

    public int maxPerHour() {
        return maxPerHour;
    }

    /** Records a hit and returns false if this client is over the limit. */
    public boolean tryAcquire(String clientId) {
        long now = clock.millis();
        Deque<Long> times = hits.computeIfAbsent(clientId, k -> new ArrayDeque<>());
        synchronized (times) {
            while (!times.isEmpty() && now - times.peekFirst() > WINDOW_MS) {
                times.pollFirst();
            }
            if (times.size() >= maxPerHour) {
                return false;
            }
            times.addLast(now);
            return true;
        }
    }
}
