import { useState } from "react";
import type { Language, Phrase } from "../types/lesson";
import { dueSummary, dueTomorrowCount, getDuePhrases } from "../lib/srs";
import { streakStore } from "../lib/streak";
import { Drill } from "../components/Drill";

type ReviewProps = {
  language: Language;
  onBack: () => void;
};

// One short round at a time — long review queues are where people give up.
const ROUND_SIZE = 10;

// "🔁 Repetisjon": phrases and words from any lesson or vocab module that
// spaced repetition says are due, the ones you got wrong first.
export function Review({ language, onBack }: ReviewProps) {
  const [phrases, setPhrases] = useState<Phrase[]>(() => getDuePhrases(language, ROUND_SIZE));
  const [round, setRound] = useState(0);
  const [finished, setFinished] = useState(false);

  function nextRound() {
    setPhrases(getDuePhrases(language, ROUND_SIZE));
    setRound((r) => r + 1);
    setFinished(false);
  }

  const remaining = finished ? dueSummary(language).due : 0;
  const tomorrow = finished || phrases.length === 0 ? dueTomorrowCount(language) : 0;

  return (
    <div style={{ marginTop: 16 }}>
      <button className="button button-secondary" style={{ marginBottom: 16 }} onClick={onBack}>
        ← Tilbake
      </button>
      <h2>🔁 Repetisjon</h2>

      {phrases.length === 0 ? (
        <div className="card">
          <h3>🎉 Ingenting å repetere akkurat nå</h3>
          <p className="text-muted" style={{ marginBottom: 0 }}>
            {tomorrow > 0
              ? `${tomorrow} ${tomorrow === 1 ? "frase er" : "fraser er"} klar${tomorrow === 1 ? "" : "e"} for repetisjon i morgen.`
              : "Øv på noen situasjoner eller ord, så dukker de opp her når det er tid for å repetere dem."}
          </p>
        </div>
      ) : (
        <>
          <p className="text-muted">
            Fraser og ord fra tidligere leksjoner som er klare for repetisjon — de du bommet på kommer først.
          </p>
          <Drill
            key={round}
            phrases={phrases}
            language={language}
            onComplete={() => {
              streakStore.recordActivity();
              setFinished(true);
            }}
          />
          {finished && (
            <div className="card animate-in" style={{ marginTop: 16 }}>
              {remaining > 0 ? (
                <>
                  <p style={{ marginTop: 0 }}>Du har {remaining} til som er klare.</p>
                  <button className="button" style={{ width: "100%" }} onClick={nextRound}>
                    Repeter {Math.min(remaining, ROUND_SIZE)} til
                  </button>
                </>
              ) : (
                <p style={{ margin: 0 }}>
                  ✅ Alt er repetert for i dag.
                  {tomorrow > 0 && ` ${tomorrow} kommer tilbake i morgen.`}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
