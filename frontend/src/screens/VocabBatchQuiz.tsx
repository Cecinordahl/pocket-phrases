import { useMemo, useState } from "react";
import type { Language } from "../types/lesson";
import { getBatch, toPhrase } from "../lib/frequency";
import { frequencyProgressStore } from "../lib/frequencyProgress";
import { Read } from "../components/Read";
import { Quiz } from "../components/Quiz";

type VocabBatchQuizProps = {
  language: Language;
  batchIndex: number;
  onBack: () => void;
  onBatchComplete: () => void;
};

type Phase = "read" | "quiz";

export function VocabBatchQuiz({ language, batchIndex, onBack, onBatchComplete }: VocabBatchQuizProps) {
  const [phase, setPhase] = useState<Phase>("read");
  const batch = useMemo(() => getBatch(language, batchIndex), [language, batchIndex]);
  const phrases = useMemo(
    () => (batch ? batch.words.map((w) => toPhrase(w, language)) : []),
    [batch, language],
  );

  if (!batch) {
    return (
      <div style={{ marginTop: 16 }}>
        <button className="button button-secondary" onClick={onBack}>
          ← Tilbake
        </button>
        <p className="text-muted" style={{ marginTop: 16 }}>
          Fant ikke denne økten.
        </p>
      </div>
    );
  }

  // Only a 100 %-correct run counts as clearing the batch — anything less
  // leaves the user on Quiz's own "Ferdig!" screen, where its built-in
  // "Ta testen på nytt" button is the retry path, so nothing extra is
  // needed here for the fail case.
  function handleQuizComplete(score: number) {
    if (batch && score === phrases.length) {
      frequencyProgressStore.completeBatch(language, batchIndex);
      onBatchComplete();
    }
  }

  return (
    <div style={{ marginTop: 16 }}>
      <button className="button button-secondary" style={{ marginBottom: 16 }} onClick={onBack}>
        ← Tilbake til reisen
      </button>
      <h2>
        Ord {batch.words[0].rank}–{batch.words[batch.words.length - 1].rank}
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
          <p className="text-muted">Du må svare 100 % riktig for å låse opp neste økt.</p>
          <Quiz phrases={phrases} direction="target-to-native" onComplete={handleQuizComplete} />
        </>
      )}
    </div>
  );
}
