package com.pocketphrases.generate;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;

import java.util.List;

/**
 * The shape the model is constrained to via structured outputs
 * (output_config.format). Kept separate from {@link com.pocketphrases.lesson.Lesson}
 * because the model only ever produces title + phrases — language and mode
 * are set by the backend, not the model.
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
            @JsonProperty("native") String nativeText
    ) {
    }
}
