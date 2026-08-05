import { useEffect, useState } from "react";
import type { Lesson } from "../types/lesson";
import { progressStore } from "../lib/progress";
import { streakStore } from "../lib/streak";
import { AccessDeniedError, fetchPrebuiltLesson, fetchRandomLesson } from "../lib/api";
import { Read } from "../components/Read";
import { Drill } from "../components/Drill";
import { Quiz } from "../components/Quiz";
import { Disclaimer } from "../components/Disclaimer";

type LessonScreenProps = {
  lesson: Lesson;
  onBack: () => void;
  onAccessDenied: () => void;
};

type Tab = "les" | "ov" | "test";

const TABS: { key: Tab; label: string }[] = [
  { key: "les", label: "Les" },
  { key: "ov", label: "Øv" },
  { key: "test", label: "Test" },
];

export function LessonScreen({ lesson: initialLesson, onBack, onAccessDenied }: LessonScreenProps) {
  const [tab, setTab] = useState<Tab>("les");
  const [lesson, setLesson] = useState(initialLesson);
  // Bumped every time the phrase set underneath is swapped out, so Read/Drill/
  // Quiz remount cleanly (fresh internal state) instead of quietly keeping
  // stale progress against phrases that no longer match.
  const [lessonVersion, setLessonVersion] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  useEffect(() => {
    if (tab === "les") {
      progressStore.markRead(lesson.language, lesson.mode);
    }
  }, [tab, lesson.language, lesson.mode]);

  const isEmergency = lesson.mode === "emergency-pharmacy";
  const isGenerated = lesson.mode === "generated";

  // AI-generated lessons have no stored situation text to regenerate a
  // fresh-but-similar variant from, so "prøv med andre fraser" is only
  // offered for prebuilt modes and "Tilfeldig".
  async function runAnotherTest() {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const fresh =
        lesson.mode === "random"
          ? await fetchRandomLesson(lesson.language)
          : await fetchPrebuiltLesson(lesson.language, lesson.mode);
      setLesson(fresh);
      setLessonVersion((v) => v + 1);
    } catch (e) {
      if (e instanceof AccessDeniedError) {
        onAccessDenied();
        return;
      }
      setRefreshError(e instanceof Error ? e.message : "Kunne ikke hente nye fraser. Prøv igjen.");
    } finally {
      setRefreshing(false);
    }
  }

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

      {refreshError && (
        <p style={{ color: "var(--color-warning)" }} role="alert">
          {refreshError}
        </p>
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

      {tab === "les" && <Read key={lessonVersion} phrases={lesson.phrases} />}
      {tab === "ov" && (
        <Drill
          key={lessonVersion}
          phrases={lesson.phrases}
          onComplete={() => progressStore.markDrilled(lesson.language, lesson.mode)}
        />
      )}
      {tab === "test" && (
        <Quiz
          key={lessonVersion}
          phrases={lesson.phrases}
          onComplete={(score) => {
            progressStore.markQuizzed(lesson.language, lesson.mode, score);
            streakStore.recordActivity();
          }}
          onRequestNewSet={isGenerated ? undefined : runAnotherTest}
          requestingNewSet={refreshing}
        />
      )}
    </div>
  );
}
