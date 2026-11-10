package com.pocketphrases.ratelimit;

import jakarta.servlet.http.HttpServletRequest;

public final class ClientIp {

    private ClientIp() {
    }

    /**
     * The app runs behind a Cloudflare tunnel, which always overwrites
     * CF-Connecting-IP with the real client IP — unlike X-Forwarded-For, whose
     * first entry a client can spoof to dodge rate limits.
     */
    public static String of(HttpServletRequest http) {
        String cloudflare = http.getHeader("CF-Connecting-IP");
        if (cloudflare != null && !cloudflare.isBlank()) {
            return cloudflare.trim();
        }
        String forwarded = http.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return http.getRemoteAddr();
    }
}
