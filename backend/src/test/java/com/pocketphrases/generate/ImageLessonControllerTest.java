package com.pocketphrases.generate;

import com.anthropic.models.messages.Base64ImageSource;
import com.pocketphrases.lesson.Lesson;
import com.pocketphrases.phrasepool.PhrasePoolService;
import com.pocketphrases.ratelimit.HourlyRateLimiter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.server.ResponseStatusException;

import java.util.Base64;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ImageLessonControllerTest {

    private static final String IMAGE = Base64.getEncoder().encodeToString(new byte[]{1, 2, 3});
    private static final Lesson LESSON = new Lesson("Menyen", "fr", "generated", List.of());

    private AnthropicService anthropic;
    private GenerateController controller;
    private final MockHttpServletRequest http = new MockHttpServletRequest();

    @BeforeEach
    void setUp() {
        anthropic = mock(AnthropicService.class);
        when(anthropic.generateLessonFromImage(anyString(), any(), anyString())).thenReturn(LESSON);
        controller = new GenerateController(anthropic, mock(PhrasePoolService.class), new HourlyRateLimiter(2));
    }

    @Test
    void returnsLessonForValidJpeg() {
        assertEquals(LESSON, controller.fromImage(new ImageLessonRequest("fr", IMAGE, "image/jpeg"), http));
    }

    @Test
    void rejectsUnsupportedMediaType() {
        assertStatus(HttpStatus.BAD_REQUEST, new ImageLessonRequest("fr", IMAGE, "image/heic"));
    }

    @Test
    void rejectsInvalidBase64() {
        assertStatus(HttpStatus.BAD_REQUEST, new ImageLessonRequest("fr", "not base64!!", "image/jpeg"));
    }

    @Test
    void rejectsTooLargeImage() {
        String huge = "A".repeat(GenerateController.MAX_IMAGE_BASE64_LENGTH + 4);
        assertStatus(HttpStatus.CONTENT_TOO_LARGE, new ImageLessonRequest("fr", huge, "image/jpeg"));
    }

    @Test
    void rateLimitsPerClient() {
        ImageLessonRequest request = new ImageLessonRequest("fr", IMAGE, "image/jpeg");
        controller.fromImage(request, http);
        controller.fromImage(request, http);
        assertStatus(HttpStatus.TOO_MANY_REQUESTS, request);
    }

    @Test
    void anthropicFailureIsServiceUnavailable() {
        when(anthropic.generateLessonFromImage(anyString(), eq(Base64ImageSource.MediaType.IMAGE_PNG), anyString()))
                .thenThrow(new RuntimeException("boom"));
        assertStatus(HttpStatus.SERVICE_UNAVAILABLE, new ImageLessonRequest("fr", IMAGE, "image/png"));
    }

    private void assertStatus(HttpStatus status, ImageLessonRequest request) {
        ResponseStatusException e = assertThrows(ResponseStatusException.class, () -> controller.fromImage(request, http));
        assertEquals(status, e.getStatusCode());
    }
}
