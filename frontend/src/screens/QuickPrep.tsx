import { useEffect, useState } from "react";
import type { Language, ModeInfo, Phrase } from "../types/lesson";
import { AccessDeniedError, fetchModes, fetchPrebuiltLesson } from "../lib/api";
import { sortByDue } from "../lib/srs";
import { award } from "../lib/rewards";
import { Drill } from "../components/Drill";

type QuickPrepProps = {
  language: Language;
  onBack: () => void;
  onAccessDenied: () => void;
};

// "Her og nå" — a ~2 minute refresh for a situation you're in (or about to be in):
// only the handful of phrases you're most likely to need, then a big,
// glanceable cheat sheet to keep on screen while you're actually there.
const QUICK_PREP_SIZE = 5;

type Step =
  | { name: "pick" }
  | { name: "drill"; title: string; phrases: Phrase[] }
  | { name: "ready"; title: string; phrases: Phrase[] };

export function QuickPrep({ language, onBack, onAccessDenied }: QuickPrepProps) {
  const [modes, setModes] = useState<ModeInfo[] | null>(null);
  const [step, setStep] = useState<Step>({ name: "pick" });
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchModes()
      .then(setModes)
      .catch((e) => {
        if (e instanceof AccessDeniedError) {
          onAccessDenied();
          return;
        }
        setError("Kunne ikke laste situasjonene. Prøv igjen.");
      });
    // onAccessDenied is stable (defined once in App).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start(mode: ModeInfo) {
    setError(null);
    setLoadingKey(mode.key);
    try {
      const lesson = await fetchPrebuiltLesson(language, mode.key);
      // Most-overdue first, so phrases you've struggled with get priority.
      const phrases = sortByDue(lesson.phrases).slice(0, QUICK_PREP_SIZE);
      setStep({ name: "drill", title: mode.title, phrases });
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

  if (step.name === "drill") {
    return (
      <div style={{ marginTop: 16 }}>
        <button className="button button-secondary" style={{ marginBottom: 16 }} onClick={() => setStep({ name: "pick" })}>
          ← Velg annen situasjon
        </button>
        <h2>⚡ {step.title}</h2>
        <p className="text-muted">{QUICK_PREP_SIZE} fraser — rask oppfriskning.</p>
        <Drill
          phrases={step.phrases}
          language={language}
          onComplete={() => {
            award({ kind: "quick-prep" }, language);
            setStep({ name: "ready", title: step.title, phrases: step.phrases });
          }}
        />
      </div>
    );
  }

  if (step.name === "ready") {
    return (
      <div style={{ marginTop: 16 }}>
        <button className="button button-secondary" style={{ marginBottom: 16 }} onClick={onBack}>
          ← Tilbake
        </button>
        <h2>💪 Du er klar!</h2>
        <p className="text-muted">Ha denne oppe mens du er der — trykk ikke, bare se.</p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {step.phrases.map((p) => (
            <li key={p.id} className="card animate-in">
              <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>{p.target}</div>
              <div className="text-muted" style={{ fontSize: "1rem" }}>{p.pronunciation}</div>
              <div style={{ fontSize: "0.9rem", marginTop: 4 }}>{p.native}</div>
            </li>
          ))}
        </ul>
        <button
          className="button button-secondary"
          style={{ marginTop: 16, width: "100%" }}
          onClick={() => setStep({ name: "drill", title: step.title, phrases: step.phrases })}
        >
          Øv én gang til
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 16 }}>
      <button className="button button-secondary" style={{ marginBottom: 16 }} onClick={onBack}>
        ← Tilbake
      </button>
      <h2>⚡ Her og nå</h2>
      <p className="text-muted">Hva skal du gjøre nå? Vi frisker opp de {QUICK_PREP_SIZE} viktigste frasene.</p>

      {error && (
        <p style={{ color: "var(--color-warning)" }} role="alert">
          {error}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
        {modes === null && !error && <p className="text-muted">Laster...</p>}
        {modes?.map((mode) => (
          <button
            key={mode.key}
            className="button button-secondary"
            disabled={loadingKey !== null}
            onClick={() => start(mode)}
          >
            {loadingKey === mode.key ? "Laster..." : mode.title}
          </button>
        ))}
      </div>
    </div>
  );
}
