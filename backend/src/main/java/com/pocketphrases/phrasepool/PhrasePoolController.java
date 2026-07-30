package com.pocketphrases.phrasepool;

import com.pocketphrases.lesson.Lesson;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
public class PhrasePoolController {

    private final PhrasePoolService phrasePoolService;

    public PhrasePoolController(PhrasePoolService phrasePoolService) {
        this.phrasePoolService = phrasePoolService;
    }

    @GetMapping("/modes")
    public List<ModeInfo> modes() {
        return phrasePoolService.listModes();
    }

    @GetMapping("/lessons/prebuilt")
    public Lesson prebuilt(@RequestParam String language, @RequestParam String mode) {
        return phrasePoolService.getLesson(language, mode);
    }

    @GetMapping("/lessons/random")
    public Lesson random(@RequestParam String language) {
        return phrasePoolService.getRandomLesson(language);
    }
}
