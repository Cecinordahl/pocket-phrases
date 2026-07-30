package com.pocketphrases.lesson;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * One phrase in a lesson. The Java field is {@code nativeText} because
 * {@code native} is a reserved word, but it is serialized as "native" so the
 * JSON shape matches the frontend's Lesson type exactly.
 */
public record Phrase(
        String target,
        String pronunciation,
        @JsonProperty("native") String nativeText
) {
}
