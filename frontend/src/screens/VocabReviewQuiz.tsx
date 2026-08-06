import { useMemo } from "react";
import type { Language } from "../types/lesson";
import { getUnit, getUnits, toPhrase, unitWords, type VocabReviewScope } from "../lib/frequency";
import { frequencyProgressStore } from "../lib/frequencyProgress";
import { Quiz } from "../components/Quiz";

type VocabReviewQuizProps = {
  language: Language;
  scope: VocabReviewScope;
  onBack: () => void;
};

// Review tests are pure practice — unlike VocabModuleQuiz, finishing one
// (at any score) doesn't unlock or complete anything, so there's no
// onComplete side effect to wire up, and no Read step first since these
// words have already been introduced.
export function VocabReviewQuiz({ language, scope, onBack }: VocabReviewQuizProps) {
  const { title, phrases } = useMemo(() => {
    if (scope.type === "unit") {
      const unit = getUnit(language, scope.unitIndex);
      if (!unit) return { title: "", phrases: [] };
      const words = unitWords(unit);
      return {
        title: `Repetisjon: ord ${words[0].rank}–${words[words.length - 1].rank}`,
        phrases: words.map((w) => toPhrase(w, language)),
      };
    }

    const completedUnits = getUnits(language).filter((u) =>
      frequencyProgressStore.isUnitCompleted(language, u.index),
    );
    const words = completedUnits.flatMap((u) => unitWords(u));
    return {
      title: "Repetisjon: alle ord du har lært",
      phrases: words.map((w) => toPhrase(w, language)),
    };
  }, [language, scope]);

  if (phrases.length === 0) {
    return (
      <div style={{ marginTop: 16 }}>
        <button className="button button-secondary" onClick={onBack}>
          ← Tilbake
        </button>
        <p className="text-muted" style={{ marginTop: 16 }}>
          Ingen ord å repetere ennå.
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 16 }}>
      <button className="button button-secondary" style={{ marginBottom: 16 }} onClick={onBack}>
        ← Tilbake til reisen
      </button>
      <h2>{title}</h2>
      <p className="text-muted">Dette er bare øving — det påvirker ikke fremgangen din.</p>
      <Quiz phrases={phrases} direction="target-to-native" onComplete={() => {}} />
    </div>
  );
}
