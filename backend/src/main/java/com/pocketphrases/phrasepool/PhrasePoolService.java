package com.pocketphrases.phrasepool;

import com.pocketphrases.lesson.Lesson;
import com.pocketphrases.lesson.Phrase;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Serves prebuilt lessons out of pools loaded once from a local JSON seed
 * file (src/main/resources/seed/phrase-pools.json) rather than Firestore.
 *
 * Judgment call: for v1 this keeps local dev and the free Render tier free
 * of an extra Firestore round-trip for content that barely changes. The
 * pools rarely change, so re-deploying to update them is an acceptable
 * trade for now. If pools need to be editable without a redeploy, swap this
 * class for a Firestore-backed implementation behind the same method
 * signatures (getLesson / getRandomLesson / listModes) — nothing above this
 * service needs to change.
 */
@Service
public class PhrasePoolService {

    private static final int SAMPLE_SIZE = 6;
    private static final String RANDOM_TITLE = "Tilfeldig";

    private final Map<String, Map<String, PhrasePool>> poolsByLanguage;

    public PhrasePoolService(ObjectMapper objectMapper) {
        this.poolsByLanguage = loadPools(objectMapper);
    }

    private Map<String, Map<String, PhrasePool>> loadPools(ObjectMapper objectMapper) {
        try (InputStream in = new ClassPathResource("seed/phrase-pools.json").getInputStream()) {
            return objectMapper.readValue(in, new TypeReference<>() {
            });
        } catch (IOException e) {
            throw new IllegalStateException("Failed to load seed/phrase-pools.json", e);
        }
    }

    public List<ModeInfo> listModes() {
        Map<String, PhrasePool> anyLanguage = poolsByLanguage.values().iterator().next();
        return anyLanguage.entrySet().stream()
                .map(entry -> new ModeInfo(entry.getKey(), entry.getValue().title()))
                .toList();
    }

    public Lesson getLesson(String language, String mode) {
        PhrasePool pool = poolFor(language, mode);
        List<Phrase> sample = sample(pool.phrases(), SAMPLE_SIZE);
        return new Lesson(pool.title(), language, mode, sample);
    }

    public Lesson getRandomLesson(String language) {
        Map<String, PhrasePool> modes = poolsByLanguage.get(language);
        if (modes == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Ukjent språk: " + language);
        }
        List<Phrase> allPhrases = new ArrayList<>();
        modes.values().forEach(pool -> allPhrases.addAll(pool.phrases()));
        List<Phrase> sample = sample(allPhrases, SAMPLE_SIZE);
        return new Lesson(RANDOM_TITLE, language, "random", sample);
    }

    private PhrasePool poolFor(String language, String mode) {
        Map<String, PhrasePool> modes = poolsByLanguage.get(language);
        if (modes == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Ukjent språk: " + language);
        }
        PhrasePool pool = modes.get(mode);
        if (pool == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Ukjent modus: " + mode);
        }
        return pool;
    }

    private List<Phrase> sample(List<Phrase> source, int count) {
        List<Phrase> shuffled = new ArrayList<>(source);
        Collections.shuffle(shuffled);
        return shuffled.subList(0, Math.min(count, shuffled.size()));
    }
}
