package com.pocketphrases.access;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Optional, off-by-default access gate. When app.access.whitelist-enabled is
 * true, every request must carry an X-User-Email header matching an entry
 * in the Firestore "whitelist" collection. There is no login in v1 — the
 * frontend asks for an email once, stores it locally, and sends it on every
 * API call.
 */
@Component
public class WhitelistFilter extends OncePerRequestFilter {

    private static final String EMAIL_HEADER = "X-User-Email";

    private final AccessProperties accessProperties;
    private final WhitelistService whitelistService;

    public WhitelistFilter(AccessProperties accessProperties, WhitelistService whitelistService) {
        this.accessProperties = accessProperties;
        this.whitelistService = whitelistService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (!accessProperties.whitelistEnabled()) {
            filterChain.doFilter(request, response);
            return;
        }

        String email = request.getHeader(EMAIL_HEADER);
        if (email == null || email.isBlank() || !whitelistService.isAllowed(email)) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Denne appen er foreløpig kun tilgjengelig for inviterte brukere.\"}");
            return;
        }
        filterChain.doFilter(request, response);
    }
}
