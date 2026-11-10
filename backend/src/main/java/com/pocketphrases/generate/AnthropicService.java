package com.pocketphrases.generate;

import com.anthropic.client.AnthropicClient;
import com.anthropic.models.messages.Base64ImageSource;
import com.anthropic.models.messages.ContentBlockParam;
import com.anthropic.models.messages.ImageBlockParam;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.StructuredMessageCreateParams;
import com.anthropic.models.messages.TextBlockParam;
import com.pocketphrases.lesson.Lesson;
import com.pocketphrases.lesson.Phrase;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Calls the Anthropic API (Claude Haiku 5.5) to turn a free-text situation
 * description into a Lesson. The client (and its API key) comes from
 * {@link AnthropicConfig}.
 *
 * Structured outputs (output_config.format, derived from GeneratedLesson)
 * guarantee the model returns valid JSON matching the expected shape rather
 * than relying on prompt instructions alone — this is the "strict JSON
 * only" requirement, enforced by the API rather than by string parsing.
 */
@Service
public class AnthropicService {

    private static final String MODEL = AnthropicConfig.MODEL;
    // Haiku 5.5 thinks by default and thinking counts toward max_tokens,
    // so leave headroom above the ~1500 tokens the JSON lesson itself needs.
    private static final long MAX_TOKENS = 4000L;
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

    private static final String IMAGE_SYSTEM_PROMPT = """
            Du hjelper en norsk turist som har tatt et bilde på reise — typisk en meny, et skilt, en billettautomat,
            en plakat eller en informasjonstavle.
            Les det som står på bildet og lag 6 til 10 nyttige fraser på målspråket ut fra det:
            - Oversett de viktigste ordene/uttrykkene som faktisk står på bildet (f.eks. retter, advarsler, åpningstider).
            - Lag også fraser turisten kan bruke i situasjonen (f.eks. bestille en rett fra menyen, spørre om noe på skiltet).
            Hvis teksten på bildet er på et annet språk enn målspråket, lag likevel frasene på målspråket ut fra innholdet.
            Hvis bildet ikke har lesbar tekst, lag fraser om det som vises.
            Uttalen skal være en enkel fonetisk skrivemåte som en norsktalende kan lese direkte, ikke IPA.
            "native" skal være frasens betydning på norsk bokmål.
            Velg den kategorien og det ikonet som passer best for hver frase — bruk ANNET/GENERAL kun hvis
            ingenting annet passer.
            Gi en kort, beskrivende tittel på norsk bokmål ut fra bildet, f.eks. «Menyen på kafeen».
            """;

    private final AnthropicClient client;

    public AnthropicService(AnthropicClient client) {
        this.client = client;
    }

    public Lesson generateLesson(String situation, String language) {
        StructuredMessageCreateParams<GeneratedLesson> params = MessageCreateParams.builder()
                .model(MODEL)
                .maxTokens(MAX_TOKENS)
                .system(SYSTEM_PROMPT)
                .outputConfig(GeneratedLesson.class)
                .addUserMessage("Målspråk: %s. Situasjon: %s".formatted(language, situation))
                .build();

        return toLesson(call(params), language);
    }

    /** Turns a photo of a menu/sign into a lesson. mediaType is a validated image/* type. */
    public Lesson generateLessonFromImage(String imageBase64, Base64ImageSource.MediaType mediaType, String language) {
        ContentBlockParam image = ContentBlockParam.ofImage(ImageBlockParam.builder()
                .source(Base64ImageSource.builder().data(imageBase64).mediaType(mediaType).build())
                .build());
        ContentBlockParam text = ContentBlockParam.ofText(TextBlockParam.builder()
                .text("Målspråk: %s.".formatted(language))
                .build());

        StructuredMessageCreateParams<GeneratedLesson> params = MessageCreateParams.builder()
                .model(MODEL)
                .maxTokens(MAX_TOKENS)
                .system(IMAGE_SYSTEM_PROMPT)
                .outputConfig(GeneratedLesson.class)
                .addUserMessageOfBlockParams(List.of(image, text))
                .build();

        return toLesson(call(params), language);
    }

    private GeneratedLesson call(StructuredMessageCreateParams<GeneratedLesson> params) {
        return client.messages().create(params).content().stream()
                .flatMap(block -> block.text().stream())
                .map(text -> text.text())
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Tomt svar fra Anthropic"));
    }

    private Lesson toLesson(GeneratedLesson generated, String language) {
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
