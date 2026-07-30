package com.pocketphrases.generate;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.StructuredMessageCreateParams;
import com.pocketphrases.lesson.Lesson;
import com.pocketphrases.lesson.Phrase;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Calls the Anthropic API (Claude Haiku) to turn a free-text situation
 * description into a Lesson. The API key is read from an environment
 * variable (spring.config "anthropic.api-key" -> ANTHROPIC_API_KEY) and
 * never appears in frontend code or the repo.
 *
 * Structured outputs (output_config.format, derived from GeneratedLesson)
 * guarantee the model returns valid JSON matching the expected shape rather
 * than relying on prompt instructions alone — this is the "strict JSON
 * only" requirement, enforced by the API rather than by string parsing.
 */
@Service
public class AnthropicService {

    private static final String MODEL = "claude-haiku-4-5";
    private static final long MAX_TOKENS = 1500L;
    private static final int MAX_PHRASES = 20;

    private static final String SYSTEM_PROMPT = """
            Du hjelper en norsk turist med å lære nyttige fraser for en gitt reisesituasjon.
            Returner 6 til 10 fraser på målspråket som er relevante for situasjonen brukeren beskriver.
            Uttalen skal være en enkel fonetisk skrivemåte som en norsktalende kan lese direkte, ikke IPA.
            "native" skal være frasens betydning på norsk bokmål.
            Velg den kategorien og det ikonet som passer best for hver frase — bruk ANNET/GENERAL kun hvis
            ingenting annet passer.
            Gi et kort, beskrivende tittel på norsk bokmål for situasjonen.
            """;

    private final AnthropicClient client;

    public AnthropicService(@Value("${anthropic.api-key:}") String apiKey) {
        this.client = AnthropicOkHttpClient.builder().apiKey(apiKey).build();
    }

    public Lesson generateLesson(String situation, String language) {
        StructuredMessageCreateParams<GeneratedLesson> params = MessageCreateParams.builder()
                .model(MODEL)
                .maxTokens(MAX_TOKENS)
                .system(SYSTEM_PROMPT)
                .outputConfig(GeneratedLesson.class)
                .addUserMessage("Målspråk: %s. Situasjon: %s".formatted(language, situation))
                .build();

        GeneratedLesson generated = client.messages().create(params).content().stream()
                .flatMap(block -> block.text().stream())
                .map(text -> text.text())
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Tomt svar fra Anthropic"));

        List<Phrase> phrases = generated.phrases().stream()
                .limit(MAX_PHRASES)
                .map(p -> new Phrase(
                        generatedPhraseId(p.target()),
                        p.target(),
                        p.pronunciation(),
                        p.nativeText(),
                        p.category(),
                        p.icon()))
                .toList();

        return new Lesson(generated.title(), language, "generated", phrases);
    }

    /** Stable across repeats of the same generated phrase text within a session. */
    private String generatedPhraseId(String target) {
        return "generated-" + Integer.toHexString(target.hashCode());
    }
}
