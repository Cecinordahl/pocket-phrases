import { useEffect, useState } from "react";
import {
  AccessDeniedError,
  fetchModes,
  fetchPrebuiltLesson,
  fetchRandomLesson,
  generateLesson,
} from "../lib/api";
import type { Language, Lesson, ModeInfo } from "../types/lesson";

type ModePickerProps = {
  language: Language;
  onBack: () => void;
  onLessonReady: (lesson: Lesson) => void;
  onAccessDenied: () => void;
};

const MAX_SITUATION_LENGTH = 300;

// Render's free tier sleeps the backend after inactivity — the first
// request after a while can take 10-30s to wake it up. Below this, a plain
// "Laster..." looks broken; only show the explanation once it's actually
// taking a while, so a normal warm-server load never sees it.
const SLOW_LOAD_HINT_MS = 3000;

export function ModePicker({ language, onBack, onLessonReady, onAccessDenied }: ModePickerProps) {
  const [modes, setModes] = useState<ModeInfo[] | null>(null);
  const [situation, setSituation] = useState("");
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slowLoad, setSlowLoad] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlowLoad(true), SLOW_LOAD_HINT_MS);
    fetchModes()
      .then(setModes)
      .catch((e) => {
        if (e instanceof AccessDeniedError) {
          onAccessDenied();
          return;
        }
        setError("Kunne ikke laste modusene. Prøv å laste siden på nytt.");
      })
      .finally(() => clearTimeout(timer));
    return () => clearTimeout(timer);
    // onAccessDenied is stable across renders (defined once in App); omitting
    // it from deps avoids re-fetching modes on every parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(key: string, action: () => Promise<Lesson>) {
    setError(null);
    setLoadingKey(key);
    try {
      const lesson = await action();
      onLessonReady(lesson);
    } catch (e) {
      if (e instanceof AccessDeniedError) {
        onAccessDenied();
        return;
      }
      setError(e instanceof Error ? e.message : "Noe gikk galt. Prøv igjen.");
    } finally {
      setLoadingKey(null);
    }
  }

  function handleGenerate() {
    const trimmed = situation.trim();
    if (!trimmed) return;
    run("generate", () => generateLesson(language, trimmed));
  }

  const busy = loadingKey !== null;

  return (
    <div style={{ marginTop: 24 }}>
      <button className="button-secondary button" style={{ marginBottom: 16 }} onClick={onBack}>
        ← Bytt språk
      </button>
      <h2>Velg situasjon</h2>
      <p className="text-muted">Hva slags situasjon gjør du deg klar for?</p>

      {error && (
        <p style={{ color: "var(--color-warning)" }} role="alert">
          {error}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
        {modes === null && (
          <p className="text-muted">
            {slowLoad
              ? "Vekker serveren — dette kan ta opptil 30 sekunder hvis den har ligget i dvale."
              : "Laster..."}
          </p>
        )}
        {modes?.map((mode) => (
          <button
            key={mode.key}
            className="button button-secondary"
            disabled={busy}
            onClick={() => run(mode.key, () => fetchPrebuiltLesson(language, mode.key))}
          >
            {loadingKey === mode.key ? "Laster..." : mode.title}
          </button>
        ))}

        <button
          className="button"
          disabled={busy}
          onClick={() => run("random", () => fetchRandomLesson(language))}
        >
          {loadingKey === "random" ? "Laster..." : "🎲 Tilfeldig"}
        </button>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h3>Beskriv situasjonen</h3>
        <p className="text-muted">
          Fungerer ikke noen av kategoriene? Beskriv situasjonen din, så lager vi en leksjon.
        </p>
        <p className="text-muted" style={{ fontSize: "0.78rem" }}>
          Teksten du skriver her sendes til Anthropic (tredjepart) for å generere frasene. Ikke
          skriv sensitiv informasjon.
        </p>
        <textarea
          value={situation}
          maxLength={MAX_SITUATION_LENGTH}
          onChange={(e) => setSituation(e.target.value)}
          placeholder="F.eks. «Jeg skal sjekke inn på et hotell og spørre om frokost»"
          rows={3}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 12,
            border: "1px solid var(--color-border)",
            fontSize: "1rem",
            resize: "vertical",
            marginBottom: 10,
          }}
        />
        <button className="button" disabled={busy || !situation.trim()} onClick={handleGenerate}>
          {loadingKey === "generate" ? "Genererer..." : "Lag leksjon"}
        </button>
      </div>
    </div>
  );
}
