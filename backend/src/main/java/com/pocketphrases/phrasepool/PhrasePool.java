package com.pocketphrases.phrasepool;

import com.pocketphrases.lesson.Phrase;

import java.util.List;

/** Raw pool of phrases for one (language, mode) pair, as stored in the seed JSON. */
public record PhrasePool(String title, List<Phrase> phrases) {
}
