package com.pocketphrases.ratelimit;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Per-feature limits for the AI endpoints (calls per client IP per hour). */
@Configuration
public class RateLimitConfig {

    @Bean
    public HourlyRateLimiter roleplayRateLimiter() {
        return new HourlyRateLimiter(60);
    }

    /** Lower than roleplay: an image costs more tokens than a chat turn. */
    @Bean
    public HourlyRateLimiter imageLessonRateLimiter() {
        return new HourlyRateLimiter(20);
    }
}
