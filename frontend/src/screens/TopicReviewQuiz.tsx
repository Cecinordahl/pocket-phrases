import { useMemo } from "react";
import type { Language } from "../types/lesson";
import { getTopicModules, toTopicPhrase, TOPICS, type TopicId } from "../lib/topicVocab";
import { topicProgressStore } from "../lib/topicVocabProgress";
import { Quiz } from "../components/Quiz";

type TopicReviewQuizProps = {
  topic: TopicId;
  language: Language;
  onBack: () => void;
};

// Pure practice over every completed module — doesn't affect progress, same
// as VocabReviewQuiz's "all" scope.
export function TopicReviewQuiz({ topic, language, onBack }: TopicReviewQuizProps) {
  const phrases = useMemo(() => {
    const completedModules = getTopicModules(topic, language).filter((m) =>
      topicProgressStore.isModuleCompleted(topic, language, m.index),
    );
    return completedModules.flatMap((m) => m.words).map((w) => toTopicPhrase(w, language, topic));
  }, [topic, language]);

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
        ← Tilbake
      </button>
      <h2>Repetisjon: {TOPICS[topic].title}</h2>
      <p className="text-muted">Dette er bare øving — det påvirker ikke fremgangen din.</p>
      <Quiz phrases={phrases} direction="target-to-native" onComplete={() => {}} />
    </div>
  );
}
