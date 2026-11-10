package com.pocketphrases.roleplay;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api")
public class RoleplayController {

    private static final Logger log = LoggerFactory.getLogger(RoleplayController.class);

    /** User messages per conversation; the model is told to wrap up on the last one. */
    static final int MAX_USER_TURNS = 8;
    private static final int MAX_MESSAGE_LENGTH = 300;
    private static final int MAX_SCENARIO_LENGTH = 100;
    private static final Set<String> SUPPORTED_LANGUAGES = Set.of("es", "fr", "de");

    private final RoleplayService roleplayService;
    private final RoleplayRateLimiter rateLimiter;

    public RoleplayController(RoleplayService roleplayService, RoleplayRateLimiter rateLimiter) {
        this.roleplayService = roleplayService;
        this.rateLimiter = rateLimiter;
    }

    @PostMapping("/roleplay/turn")
    public RoleplayTurn turn(@RequestBody RoleplayRequest request, HttpServletRequest http) {
        List<RoleplayRequest.Message> history = request.history() == null ? List.of() : request.history();
        validate(request, history);

        if (!rateLimiter.tryAcquire(clientId(http))) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Du har øvd mye den siste timen — ta en pause og prøv igjen litt senere.");
        }

        long userTurns = history.stream().filter(m -> m.role() == RoleplayRequest.Role.user).count();
        try {
            return roleplayService.nextTurn(request.language(), request.scenario().trim(), history,
                    userTurns >= MAX_USER_TURNS);
        } catch (Exception e) {
            log.warn("Rollespill-kall til Anthropic feilet", e);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Fikk ikke svar akkurat nå. Prøv igjen.");
        }
    }

    private void validate(RoleplayRequest request, List<RoleplayRequest.Message> history) {
        if (!SUPPORTED_LANGUAGES.contains(request.language())) {
            throw bad("Ukjent språk");
        }
        if (request.scenario() == null || request.scenario().isBlank()
                || request.scenario().length() > MAX_SCENARIO_LENGTH) {
            throw bad("Ugyldig situasjon");
        }
        long userTurns = history.stream().filter(m -> m != null && m.role() == RoleplayRequest.Role.user).count();
        if (userTurns > MAX_USER_TURNS) {
            throw bad("Samtalen er ferdig — start en ny for å øve mer.");
        }
        for (int i = 0; i < history.size(); i++) {
            RoleplayRequest.Message m = history.get(i);
            if (m == null || m.role() == null || m.text() == null || m.text().isBlank()
                    || m.text().length() > MAX_MESSAGE_LENGTH) {
                throw bad("Ugyldig melding (maks %d tegn)".formatted(MAX_MESSAGE_LENGTH));
            }
            // Must alternate assistant/user, starting with the assistant's opening line, and end on the user.
            RoleplayRequest.Role expected = i % 2 == 0 ? RoleplayRequest.Role.assistant : RoleplayRequest.Role.user;
            if (m.role() != expected) {
                throw bad("Ugyldig samtalerekkefølge");
            }
        }
        if (!history.isEmpty() && history.get(history.size() - 1).role() != RoleplayRequest.Role.user) {
            throw bad("Ugyldig samtalerekkefølge");
        }
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    /** Render sits behind a proxy, so the real client IP is the first X-Forwarded-For entry. */
    private static String clientId(HttpServletRequest http) {
        String forwarded = http.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return http.getRemoteAddr();
    }
}
