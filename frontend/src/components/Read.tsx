import { useState } from "react";
import type { Phrase } from "../types/lesson";
import { categoryStyle } from "../lib/categories";

type ReadProps = {
  phrases: Phrase[];
};

export function Read({ phrases }: ReadProps) {
  // Hidden by default — tapping to reveal is active recall, which beats
  // passively reading the translation straight away.
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <ul
      style={{
        listStyle: "none",
        padding: 0,
        margin: 0,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {phrases.map((phrase) => {
        const style = categoryStyle(phrase.category);
        const isRevealed = revealed.has(phrase.id);
        return (
          <li key={phrase.id} style={{ display: "flex", gap: 10 }}>
            <div
              aria-hidden="true"
              style={{
                width: 4,
                borderRadius: 4,
                background: style.accent,
                flexShrink: 0,
              }}
            />
            <button
              className="card"
              onClick={() => toggle(phrase.id)}
              aria-expanded={isRevealed}
              style={{
                flex: 1,
                textAlign: "left",
                display: "block",
                width: "100%",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: "1.05rem" }}>{phrase.target}</div>
              <div className="text-muted" style={{ fontStyle: "italic" }}>
                {phrase.pronunciation}
              </div>
              {isRevealed ? (
                <div style={{ marginTop: 6 }}>{phrase.native}</div>
              ) : (
                <div className="text-muted" style={{ marginTop: 6 }}>
                  Trykk for å se betydningen
                </div>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
