import { useMemo } from "react";
import type { Language } from "../types/lesson";
import { getTopicModules, TOPICS, type TopicId } from "../lib/topicVocab";
import { topicProgressStore } from "../lib/topicVocabProgress";

type TopicVocabMapProps = {
  topic: TopicId;
  language: Language;
  onBack: () => void;
  onOpenModule: (moduleIndex: number) => void;
  onOpenReview: () => void;
};

export function TopicVocabMap({ topic, language, onBack, onOpenModule, onOpenReview }: TopicVocabMapProps) {
  const modules = useMemo(() => getTopicModules(topic, language), [topic, language]);
  const completedCount = modules.filter((m) =>
    topicProgressStore.isModuleCompleted(topic, language, m.index),
  ).length;

  return (
    <div style={{ marginTop: 16 }}>
      <button className="button button-secondary" style={{ marginBottom: 16 }} onClick={onBack}>
        ← Tilbake
      </button>

      <h2 style={{ margin: 0 }}>{TOPICS[topic].title}</h2>
      <p className="text-muted">{TOPICS[topic].description}</p>

      {completedCount > 0 && (
        <button className="button" style={{ width: "100%", marginTop: 8 }} onClick={onOpenReview}>
          Test alt du har lært
        </button>
      )}

      {modules.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(48px, 1fr))",
            gap: 8,
            marginTop: 16,
          }}
        >
          {modules.map((module, index) => {
            const completed = topicProgressStore.isModuleCompleted(topic, language, module.index);
            const unlocked = topicProgressStore.isModuleUnlocked(topic, language, module.index);
            return (
              <button
                key={module.index}
                className="button button-secondary"
                disabled={!unlocked}
                onClick={() => onOpenModule(module.index)}
                style={{ padding: "8px 4px", fontSize: "0.85rem" }}
              >
                {completed ? "✓" : unlocked ? index + 1 : "🔒"}
              </button>
            );
          })}
        </div>
      )}

      {modules.length === 0 && (
        <p className="text-muted" style={{ marginTop: 16 }}>
          Ingen ord lagt inn ennå for dette språket.
        </p>
      )}
    </div>
  );
}
