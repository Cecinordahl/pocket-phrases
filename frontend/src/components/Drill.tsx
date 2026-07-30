import { useMemo, useState } from "react";
import type { Phrase } from "../types/lesson";
import { categoryStyle } from "../lib/categories";
import { iconFor } from "../lib/icons";
import { recordReview, sortByDue } from "../lib/srs";

type DrillProps = {
  phrases: Phrase[];
  onComplete: () => void;
};

export function Drill({ phrases, onComplete }: DrillProps) {
  // Most-overdue-first, computed once per lesson so the order doesn't jump
  // around as reviews are recorded mid-session.
  const ordered = useMemo(() => sortByDue(phrases), [phrases]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [knewCount, setKnewCount] = useState(0);
  const [thinkPhrases, setThinkPhrases] = useState<Phrase[]>([]);
  const [finished, setFinished] = useState(false);

  if (ordered.length === 0) {
    return <p className="text-muted">Ingen fraser å øve på.</p>;
  }

  function restart() {
    setIndex(0);
    setFlipped(false);
    setKnewCount(0);
    setThinkPhrases([]);
    setFinished(false);
  }

  if (finished) {
    return (
      <div>
        <div className="card animate-in">
          <h3>Ferdig!</h3>
          <p>
            Du gikk gjennom {ordered.length} kort — {knewCount} visste du med en gang,{" "}
            {thinkPhrases.length} måtte du tenke litt på.
          </p>
          <button className="button" onClick={restart}>
            Øv på nytt
          </button>
        </div>

        {thinkPhrases.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h3 className="text-muted" style={{ fontSize: "0.95rem" }}>
              Disse måtte du tenke litt på
            </h3>
            <ul
              className="animate-in"
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {thinkPhrases.map((p) => {
                const style = categoryStyle(p.category);
                return (
                  <li
                    key={p.id}
                    className="card"
                    style={{ borderLeft: `4px solid ${style.accent}` }}
                  >
                    <div style={{ fontWeight: 600 }}>{p.target}</div>
                    <div className="text-muted" style={{ fontStyle: "italic" }}>
                      {p.pronunciation}
                    </div>
                    <div style={{ marginTop: 4 }}>{p.native}</div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    );
  }

  const phrase = ordered[index];
  const isLast = index === ordered.length - 1;
  const Icon = iconFor(phrase.icon);
  const style = categoryStyle(phrase.category);

  function rate(remembered: boolean) {
    recordReview(phrase.id, remembered);
    if (remembered) setKnewCount((c) => c + 1);
    else setThinkPhrases((prev) => [...prev, phrase]);

    if (isLast) {
      onComplete();
      setFinished(true);
    } else {
      setIndex((i) => i + 1);
      setFlipped(false);
    }
  }

  return (
    <div>
      <p className="text-muted">
        Kort {index + 1} av {ordered.length}
      </p>
      <button
        className="card"
        onClick={() => setFlipped((f) => !f)}
        style={{
          width: "100%",
          minHeight: 200,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: 10,
          borderTop: `4px solid ${style.accent}`,
        }}
      >
        {!flipped ? (
          <div
            key={`${phrase.id}-front`}
            className="animate-in"
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}
          >
            <Icon aria-hidden="true" size={28} color={style.accent} />
            <h2 style={{ margin: 0 }}>{phrase.target}</h2>
            <span className="text-muted">Trykk for å se svaret</span>
          </div>
        ) : (
          <div
            key={`${phrase.id}-back`}
            className="animate-in"
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}
          >
            {/* Icon placed right next to the translation (proximity),
                rather than in an opposite corner of the card. */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Icon aria-hidden="true" size={28} color={style.accent} />
              <h2 style={{ margin: 0 }}>{phrase.native}</h2>
            </div>
            {/* Written word and its pronunciation always shown together,
                so you can read the actual text while sounding it out. */}
            <div>
              <div style={{ fontWeight: 600, fontSize: "1.1rem" }}>{phrase.target}</div>
              <div className="text-muted" style={{ fontStyle: "italic" }}>
                {phrase.pronunciation}
              </div>
            </div>
          </div>
        )}
      </button>

      {flipped ? (
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button className="button button-secondary" onClick={() => rate(false)}>
            😅 Måtte tenke
          </button>
          <button className="button" onClick={() => rate(true)}>
            ✅ Kunne det
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 16 }}>
          <button className="button button-secondary" onClick={() => setFlipped(true)}>
            Snu kortet
          </button>
        </div>
      )}
    </div>
  );
}
