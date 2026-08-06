import { useMemo, useState } from "react";
import type { Language } from "../types/lesson";
import { getModule, toPhrase } from "../lib/frequency";
import { frequencyProgressStore } from "../lib/frequencyProgress";
import { Read } from "../components/Read";
import { Quiz } from "../components/Quiz";

type VocabModuleQuizProps = {
  language: Language;
  moduleIndex: number;
  onBack: () => void;
  onModuleComplete: () => void;
};

type Phase = "read" | "quiz";

export function VocabModuleQuiz({ language, moduleIndex, onBack, onModuleComplete }: VocabModuleQuizProps) {
  const [phase, setPhase] = useState<Phase>("read");
  const module = useMemo(() => getModule(language, moduleIndex), [language, moduleIndex]);
  const phrases = useMemo(
    () => (module ? module.words.map((w) => toPhrase(w, language)) : []),
    [module, language],
  );

  if (!module) {
    return (
      <div style={{ marginTop: 16 }}>
        <button className="button button-secondary" onClick={onBack}>
          ← Tilbake
        </button>
        <p className="text-muted" style={{ marginTop: 16 }}>
          Fant ikke denne modulen.
        </p>
      </div>
    );
  }

  // Only a 100 %-correct run counts as clearing the module — anything less
  // leaves the user on Quiz's own "Ferdig!" screen, where its built-in
  // "Ta testen på nytt" button is the retry path, so nothing extra is
  // needed here for the fail case.
  function handleQuizComplete(score: number) {
    if (module && score === phrases.length) {
      frequencyProgressStore.completeModule(language, moduleIndex);
      onModuleComplete();
    }
  }

  return (
    <div style={{ marginTop: 16 }}>
      <button className="button button-secondary" style={{ marginBottom: 16 }} onClick={onBack}>
        ← Tilbake til reisen
      </button>
      <h2>
        Ord {module.words[0].rank}–{module.words[module.words.length - 1].rank}
      </h2>

      {phase === "read" && (
        <>
          <p className="text-muted">Se gjennom ordene før testen.</p>
          <Read phrases={phrases} />
          <button
            className="button"
            style={{ marginTop: 16, width: "100%" }}
            onClick={() => setPhase("quiz")}
          >
            Jeg er klar for testen
          </button>
        </>
      )}

      {phase === "quiz" && (
        <>
          <p className="text-muted">Du må svare 100 % riktig for å låse opp neste modul.</p>
          <Quiz phrases={phrases} direction="target-to-native" onComplete={handleQuizComplete} />
        </>
      )}
    </div>
  );
}
