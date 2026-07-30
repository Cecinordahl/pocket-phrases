import { useState } from "react";
import type { Phrase } from "../types/lesson";

type DrillProps = {
  phrases: Phrase[];
  onComplete: () => void;
};

export function Drill({ phrases, onComplete }: DrillProps) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (phrases.length === 0) {
    return <p className="text-muted">Ingen fraser å øve på.</p>;
  }

  const phrase = phrases[index];
  const isLast = index === phrases.length - 1;

  function next() {
    if (isLast) {
      onComplete();
      setIndex(0);
      setFlipped(false);
    } else {
      setIndex((i) => i + 1);
      setFlipped(false);
    }
  }

  return (
    <div>
      <p className="text-muted">
        Kort {index + 1} av {phrases.length}
      </p>
      <button
        className="card"
        style={{
          width: "100%",
          minHeight: 160,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: 8,
        }}
        onClick={() => setFlipped((f) => !f)}
      >
        {!flipped ? (
          <>
            <h2 style={{ margin: 0 }}>{phrase.target}</h2>
            <span className="text-muted">Trykk for å se svaret</span>
          </>
        ) : (
          <>
            <h2 style={{ margin: 0 }}>{phrase.native}</h2>
            <span className="text-muted">{phrase.pronunciation}</span>
          </>
        )}
      </button>
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button className="button button-secondary" onClick={() => setFlipped((f) => !f)}>
          Snu
        </button>
        <button className="button" onClick={next}>
          {isLast ? "Ferdig" : "Neste"}
        </button>
      </div>
    </div>
  );
}
