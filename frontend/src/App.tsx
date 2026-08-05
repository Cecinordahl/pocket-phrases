import { useState } from "react";
import type { Language, Lesson } from "./types/lesson";
import { LanguagePicker } from "./screens/LanguagePicker";
import { ModePicker } from "./screens/ModePicker";
import { LessonScreen } from "./screens/LessonScreen";
import { EmailGate } from "./screens/EmailGate";
import { VocabJourneyIntro } from "./screens/VocabJourneyIntro";
import { VocabMilestoneMap } from "./screens/VocabMilestoneMap";
import { VocabBatchQuiz } from "./screens/VocabBatchQuiz";
import { frequencyProgressStore } from "./lib/frequencyProgress";

type Screen =
  | { name: "language" }
  | { name: "mode"; language: Language }
  | { name: "lesson"; language: Language; lesson: Lesson }
  // origin tracks whether the intro was reached from ModePicker (first
  // visit) or from the milestone map's "ⓘ" revisit link, so its back
  // button returns to the right place either way.
  | { name: "vocab-intro"; language: Language; origin: "mode" | "map" }
  | { name: "vocab-map"; language: Language }
  | { name: "vocab-batch"; language: Language; batchIndex: number };

function App() {
  const [screen, setScreen] = useState<Screen>({ name: "language" });
  const [accessDenied, setAccessDenied] = useState(false);

  // Only ever triggered by a 403 from the backend's optional whitelist gate.
  if (accessDenied) {
    return <EmailGate onSubmitted={() => setAccessDenied(false)} />;
  }

  if (screen.name === "language") {
    return <LanguagePicker onSelect={(language) => setScreen({ name: "mode", language })} />;
  }

  if (screen.name === "mode") {
    const language = screen.language;
    return (
      <ModePicker
        language={language}
        onBack={() => setScreen({ name: "language" })}
        onLessonReady={(lesson) => setScreen({ name: "lesson", language, lesson })}
        onAccessDenied={() => setAccessDenied(true)}
        onEnterVocabJourney={() =>
          setScreen(
            frequencyProgressStore.hasSeenIntro(language)
              ? { name: "vocab-map", language }
              : { name: "vocab-intro", language, origin: "mode" },
          )
        }
      />
    );
  }

  if (screen.name === "vocab-intro") {
    const language = screen.language;
    return (
      <VocabJourneyIntro
        onBack={() =>
          setScreen(
            screen.origin === "map" ? { name: "vocab-map", language } : { name: "mode", language },
          )
        }
        onContinue={() => {
          frequencyProgressStore.markIntroSeen(language);
          setScreen({ name: "vocab-map", language });
        }}
      />
    );
  }

  if (screen.name === "vocab-map") {
    const language = screen.language;
    return (
      <VocabMilestoneMap
        language={language}
        onBack={() => setScreen({ name: "mode", language })}
        onShowInfo={() => setScreen({ name: "vocab-intro", language, origin: "map" })}
        onOpenBatch={(batchIndex) => setScreen({ name: "vocab-batch", language, batchIndex })}
      />
    );
  }

  if (screen.name === "vocab-batch") {
    const language = screen.language;
    return (
      <VocabBatchQuiz
        language={language}
        batchIndex={screen.batchIndex}
        onBack={() => setScreen({ name: "vocab-map", language })}
        onBatchComplete={() => setScreen({ name: "vocab-map", language })}
      />
    );
  }

  return (
    <LessonScreen
      lesson={screen.lesson}
      onBack={() => setScreen({ name: "mode", language: screen.language })}
      onAccessDenied={() => setAccessDenied(true)}
    />
  );
}

export default App;
