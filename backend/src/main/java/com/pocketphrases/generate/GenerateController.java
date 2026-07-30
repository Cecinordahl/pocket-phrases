package com.pocketphrases.generate;

import com.pocketphrases.lesson.Lesson;
import com.pocketphrases.phrasepool.PhrasePoolService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Set;

@RestController
@RequestMapping("/api")
public class GenerateController {

    private static final Logger log = LoggerFactory.getLogger(GenerateController.class);
    private static final int MAX_SITUATION_LENGTH = 300;
    private static final String FALLBACK_MODE = "tourist-essentials";
    private static final Set<String> SUPPORTED_LANGUAGES = Set.of("es", "fr", "de");

    private final AnthropicService anthropicService;
    private final PhrasePoolService phrasePoolService;

    public GenerateController(AnthropicService anthropicService, PhrasePoolService phrasePoolService) {
        this.anthropicService = anthropicService;
        this.phrasePoolService = phrasePoolService;
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
}
