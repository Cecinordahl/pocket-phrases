package com.pocketphrases.lesson;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * One phrase in a lesson. The Java field is {@code nativeText} because
 * {@code native} is a reserved word, but it is serialized as "native" so the
 * JSON shape matches the frontend's Lesson type exactly.
 *
 * {@code id} is stable across repeat exposure to the same phrase (seed
 * phrases: "{mode}-{language}-{index}"; AI-generated: derived from the
 * target text) — the frontend's spaced-repetition store keys on it.
 */
public record Phrase(
        String id,
        String target,
        String pronunciation,
        @JsonProperty("native") String nativeText,
        PhraseCategory category,
        PhraseIcon icon
) {
}
