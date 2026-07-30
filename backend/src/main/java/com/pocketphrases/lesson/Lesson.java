package com.pocketphrases.lesson;

import java.util.List;

/**
 * The one shared lesson shape. A Lesson looks identical whether it came from
 * a seeded phrase pool, the Anthropic free-text endpoint, or the Random mix
 * — every source builds this same record, and the frontend only ever
 * renders this one type.
 */
public record Lesson(
        String title,
        String language,
        String mode,
        List<Phrase> phrases
) {
}
