package com.pocketphrases.roleplay;

import com.pocketphrases.ratelimit.ClientIp;
import com.pocketphrases.ratelimit.HourlyRateLimiter;
import com.pocketphrases.roleplay.RoleplayRequest.Message;
import com.pocketphrases.roleplay.RoleplayRequest.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RoleplayControllerTest {

    private static final RoleplayTurn TURN = new RoleplayTurn("Bonjour !", "Hei!", "", List.of(), false);

    private RoleplayService service;
    private RoleplayController controller;
    private MockHttpServletRequest http;

    @BeforeEach
    void setUp() {
        service = mock(RoleplayService.class);
        when(service.nextTurn(anyString(), anyString(), anyList(), org.mockito.ArgumentMatchers.anyBoolean()))
                .thenReturn(TURN);
        controller = new RoleplayController(service, new HourlyRateLimiter(60));
        http = new MockHttpServletRequest();
    }

    @Test
    void emptyHistoryOpensTheScene() {
        assertEquals(TURN, controller.turn(new RoleplayRequest("fr", "Restaurant", List.of()), http));
    }

    @Test
    void rejectsUnknownLanguage() {
        assertBadRequest(new RoleplayRequest("it", "Restaurant", List.of()));
    }

    @Test
    void rejectsHistoryThatDoesNotEndOnUser() {
        assertBadRequest(new RoleplayRequest("fr", "Restaurant", List.of(new Message(Role.assistant, "Bonjour"))));
    }

    @Test
    void rejectsHistoryStartingWithUser() {
        assertBadRequest(new RoleplayRequest("fr", "Restaurant", List.of(new Message(Role.user, "Bonjour"))));
    }

    @Test
    void rejectsTooLongMessage() {
        List<Message> history = List.of(new Message(Role.assistant, "Bonjour"), new Message(Role.user, "x".repeat(301)));
        assertBadRequest(new RoleplayRequest("fr", "Restaurant", history));
    }

    @Test
    void asksModelToWrapUpOnLastAllowedTurn() {
        controller.turn(new RoleplayRequest("fr", "Restaurant", conversation(RoleplayController.MAX_USER_TURNS)), http);
        verify(service).nextTurn(eq("fr"), eq("Restaurant"), anyList(), eq(true));
    }

    @Test
    void rejectsConversationPastTheTurnLimit() {
        assertBadRequest(new RoleplayRequest("fr", "Restaurant", conversation(RoleplayController.MAX_USER_TURNS + 1)));
    }

    @Test
    void rateLimiterBlocksAfterLimitAndResetsAfterAnHour() {
        MutableClock clock = new MutableClock(Instant.parse("2026-01-01T00:00:00Z"));
        HourlyRateLimiter limiter = new HourlyRateLimiter(60, clock);
        for (int i = 0; i < limiter.maxPerHour(); i++) {
            assertTrue(limiter.tryAcquire("1.2.3.4"));
        }
        assertFalse(limiter.tryAcquire("1.2.3.4"));
        assertTrue(limiter.tryAcquire("5.6.7.8"), "other clients are unaffected");

        clock.now = clock.now.plusSeconds(3601);
        assertTrue(limiter.tryAcquire("1.2.3.4"));
    }

    private static final class MutableClock extends Clock {
        Instant now;

        MutableClock(Instant now) {
            this.now = now;
        }

        @Override
        public ZoneOffset getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }

    @Test
    void keepsExactlyOneCorrectOption() {
        RoleplayTurn twoCorrect = new RoleplayTurn("r", "n", "", List.of(
                new RoleplayTurn.Option("a", "a", false, ""),
                new RoleplayTurn.Option("b", "b", true, ""),
                new RoleplayTurn.Option("c", "c", true, "")), false);
        assertEquals(List.of(false, true, false),
                twoCorrect.withExactlyOneCorrect().options().stream().map(RoleplayTurn.Option::correct).toList());

        RoleplayTurn noneCorrect = new RoleplayTurn("r", "n", "", List.of(
                new RoleplayTurn.Option("a", "a", false, ""),
                new RoleplayTurn.Option("b", "b", false, "")), false);
        assertEquals(List.of(true, false),
                noneCorrect.withExactlyOneCorrect().options().stream().map(RoleplayTurn.Option::correct).toList());
    }

    @Test
    void prefersCloudflareClientIpOverSpoofableForwardedFor() {
        http.addHeader("X-Forwarded-For", "6.6.6.6, 10.0.0.1");
        http.addHeader("CF-Connecting-IP", "1.2.3.4");
        assertEquals("1.2.3.4", ClientIp.of(http));
    }

    /** assistant, user, assistant, user ... ending on the given number of user turns. */
    private static List<Message> conversation(int userTurns) {
        List<Message> history = new ArrayList<>();
        for (int i = 0; i < userTurns; i++) {
            history.add(new Message(Role.assistant, "Bonjour"));
            history.add(new Message(Role.user, "Bonjour"));
        }
        return history;
    }

    private void assertBadRequest(RoleplayRequest request) {
        ResponseStatusException e = assertThrows(ResponseStatusException.class, () -> controller.turn(request, http));
        assertEquals(HttpStatus.BAD_REQUEST, e.getStatusCode());
    }
}
