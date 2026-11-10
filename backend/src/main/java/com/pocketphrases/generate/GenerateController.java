package com.pocketphrases.generate;

import com.anthropic.models.messages.Base64ImageSource;
import com.pocketphrases.lesson.Lesson;
import com.pocketphrases.phrasepool.PhrasePoolService;
import com.pocketphrases.ratelimit.ClientIp;
import com.pocketphrases.ratelimit.HourlyRateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Base64;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api")
public class GenerateController {

    private static final Logger log = LoggerFactory.getLogger(GenerateController.class);
    private static final int MAX_SITUATION_LENGTH = 300;
    private static final String FALLBACK_MODE = "tourist-essentials";
    private static final Set<String> SUPPORTED_LANGUAGES = Set.of("es", "fr", "de");

    /** ~5 MB of image data; the frontend downsizes photos well below this before upload. */
    static final int MAX_IMAGE_BASE64_LENGTH = 7_000_000;
    private static final Map<String, Base64ImageSource.MediaType> IMAGE_TYPES = Map.of(
            "image/jpeg", Base64ImageSource.MediaType.IMAGE_JPEG,
            "image/png", Base64ImageSource.MediaType.IMAGE_PNG,
            "image/webp", Base64ImageSource.MediaType.IMAGE_WEBP);

    private final AnthropicService anthropicService;
    private final PhrasePoolService phrasePoolService;
    private final HourlyRateLimiter imageRateLimiter;

    public GenerateController(AnthropicService anthropicService, PhrasePoolService phrasePoolService,
                              @Qualifier("imageLessonRateLimiter") HourlyRateLimiter imageRateLimiter) {
        this.anthropicService = anthropicService;
        this.phrasePoolService = phrasePoolService;
        this.imageRateLimiter = imageRateLimiter;
    }

    @PostMapping("/lessons/generate")
    public Lesson generate(@RequestBody GenerateRequest request) {
        if (request.situation() == null || request.situation().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Beskriv situasjonen din");
        }
        if (request.situation().length() > MAX_SITUATION_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Beskrivelsen er for lang (maks %d tegn)".formatted(MAX_SITUATION_LENGTH));
        }
        if (!SUPPORTED_LANGUAGES.contains(request.language())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ukjent språk");
        }

        try {
            return anthropicService.generateLesson(request.situation(), request.language());
        } catch (Exception e) {
            // Safe fallback: if the model call fails or returns something that
            // doesn't parse, serve a prebuilt lesson rather than an error page.
            log.warn("Kunne ikke generere leksjon fra Anthropic, faller tilbake til forhåndsbygd innhold", e);
            return phrasePoolService.getLesson(request.language(), FALLBACK_MODE);
        }
    }

    @PostMapping("/lessons/from-image")
    public Lesson fromImage(@RequestBody ImageLessonRequest request, HttpServletRequest http) {
        if (!SUPPORTED_LANGUAGES.contains(request.language())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ukjent språk");
        }
        Base64ImageSource.MediaType mediaType = IMAGE_TYPES.get(request.mediaType());
        if (mediaType == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bildet må være JPEG, PNG eller WebP");
        }
        String data = request.imageBase64();
        if (data == null || data.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mangler bilde");
        }
        if (data.length() > MAX_IMAGE_BASE64_LENGTH) {
            throw new ResponseStatusException(HttpStatus.CONTENT_TOO_LARGE, "Bildet er for stort");
        }
        try {
            Base64.getDecoder().decode(data);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ugyldig bilde");
        }

        if (!imageRateLimiter.tryAcquire(ClientIp.of(http))) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Du har laget mange bildeleksjoner den siste timen — prøv igjen litt senere.");
        }

        try {
            return anthropicService.generateLessonFromImage(data, mediaType, request.language());
        } catch (Exception e) {
            // No prebuilt fallback here: an unrelated lesson would be confusing
            // when the user expects phrases from their own photo.
            log.warn("Kunne ikke lage leksjon fra bilde", e);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Klarte ikke å lese bildet akkurat nå. Prøv igjen, gjerne med et skarpere bilde.");
        }
    }
}
