package com.pocketphrases.generate;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.pocketphrases.lesson.PhraseCategory;
import com.pocketphrases.lesson.PhraseIcon;

import java.util.List;

/**
 * The shape the model is constrained to via structured outputs
 * (output_config.format). Kept separate from {@link com.pocketphrases.lesson.Lesson}
 * because the model only ever produces title + phrases — language, mode,
 * and phrase id are set by the backend, not the model. category/icon reuse
 * the same closed enums as the seed data so the frontend's color/icon
 * lookups never see an unrecognized value.
 */
record GeneratedLesson(
        @JsonPropertyDescription("Short Norwegian Bokmål title for this situation, e.g. 'På sykehuset'")
        String title,
        @JsonPropertyDescription("6 to 10 useful phrases for this situation")
        List<GeneratedPhrase> phrases
) {
    record GeneratedPhrase(
            @JsonPropertyDescription("The phrase in the target language")
            String target,
            @JsonPropertyDescription("Simple phonetic pronunciation hint readable by a Norwegian speaker, not IPA")
            String pronunciation,
            @JsonPropertyDescription("The Norwegian Bokmål meaning of the phrase")
            @JsonProperty("native") String nativeText,
            @JsonPropertyDescription("Best-fitting theme for this phrase, used only for a UI accent color")
            PhraseCategory category,
            @JsonPropertyDescription("Best-fitting icon for this phrase's intent; use GENERAL if nothing else fits")
            PhraseIcon icon
    ) {
    }
}
