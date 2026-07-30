import { useEffect, useState } from "react";
import type { Lesson } from "../types/lesson";
import { progressStore } from "../lib/progress";
import { Read } from "../components/Read";
import { Drill } from "../components/Drill";
import { Quiz } from "../components/Quiz";
import { Disclaimer } from "../components/Disclaimer";

type LessonScreenProps = {
  lesson: Lesson;
  onBack: () => void;
};

type Tab = "les" | "ov" | "test";

const TABS: { key: Tab; label: string }[] = [
  { key: "les", label: "Les" },
  { key: "ov", label: "Øv" },
  { key: "test", label: "Test" },
];

export function LessonScreen({ lesson, onBack }: LessonScreenProps) {
  const [tab, setTab] = useState<Tab>("les");

  useEffect(() => {
    if (tab === "les") {
      progressStore.markRead(lesson.language, lesson.mode);
    }
  }, [tab, lesson.language, lesson.mode]);

  const isEmergency = lesson.mode === "emergency-pharmacy";
  const isGenerated = lesson.mode === "generated";

  return (
    <div style={{ marginTop: 16 }}>
      <button className="button button-secondary" style={{ marginBottom: 16 }} onClick={onBack}>
        ← Ny situasjon
      </button>
      <h2>{lesson.title}</h2>

      {(isEmergency || isGenerated) && (
        <Disclaimer>
          {isEmergency
            ? "Disse frasene er et læringshjelpemiddel og kan inneholde feil. Ikke stol på dem i en reell nødsituasjon — ring nødnummer eller kontakt helsepersonell."
            : "Denne leksjonen er generert av KI og kan inneholde feil. Sjekk viktige fraser mot en pålitelig kilde før du stoler på dem."}
        </Disclaimer>
      )}

      <div role="tablist" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className="button"
            style={{
              background: tab === t.key ? "var(--color-primary)" : "var(--color-surface)",
              color: tab === t.key ? "white" : "var(--color-text)",
              border: "1px solid var(--color-border)",
            }}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "les" && <Read phrases={lesson.phrases} />}
      {tab === "ov" && (
        <Drill
          phrases={lesson.phrases}
          onComplete={() => progressStore.markDrilled(lesson.language, lesson.mode)}
        />
      )}
      {tab === "test" && (
        <Quiz
          phrases={lesson.phrases}
          onComplete={(score) => progressStore.markQuizzed(lesson.language, lesson.mode, score)}
        />
      )}
    </div>
  );
}
