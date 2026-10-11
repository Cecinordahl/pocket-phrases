import { useMemo, useState } from "react";
import type { Language } from "../types/lesson";
import { getTopicModule, toTopicPhrase, type TopicId } from "../lib/topicVocab";
import { topicProgressStore } from "../lib/topicVocabProgress";
import { Read } from "../components/Read";
import { Quiz } from "../components/Quiz";

type TopicModuleQuizProps = {
  topic: TopicId;
  language: Language;
  moduleIndex: number;
  onBack: () => void;
  onModuleComplete: () => void;
};

type Phase = "read" | "quiz";

export function TopicModuleQuiz({ topic, language, moduleIndex, onBack, onModuleComplete }: TopicModuleQuizProps) {
  const [phase, setPhase] = useState<Phase>("read");
  const module = useMemo(
    () => getTopicModule(topic, language, moduleIndex),
    [topic, language, moduleIndex],
  );
  const phrases = useMemo(
    () => (module ? module.words.map((w) => toTopicPhrase(w, language, topic)) : []),
    [module, language, topic],
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

  // Same rule as VocabModuleQuiz: only a 100 %-correct run clears the
  // module — anything less leaves the user on Quiz's own retry screen.
  function handleQuizComplete(score: number) {
    if (module && score === phrases.length) {
      topicProgressStore.completeModule(topic, language, moduleIndex);
      onModuleComplete();
    }
  }

  return (
    <div style={{ marginTop: 16 }}>
      <button className="button button-secondary" style={{ marginBottom: 16 }} onClick={onBack}>
        ← Tilbake
      </button>
      <h2>Modul {moduleIndex + 1}</h2>

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
