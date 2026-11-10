import type { ReactNode } from "react";
import type { Phrase } from "../types/lesson";

type ExampleProps = {
  phrase: Phrase;
  /** Hide the Norwegian translation, e.g. while it would give away a quiz answer. */
  showNative?: boolean;
  align?: "left" | "center";
};

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Shows a single vocab word inside a real sentence ("la maison" → "La maison
// est grande.") with the word itself highlighted, so it's learned in context
// rather than in isolation. Renders nothing for phrases without an example.
export function Example({ phrase, showNative = true, align = "left" }: ExampleProps) {
  if (!phrase.example) return null;

  // Highlight the first whole-word, case-insensitive match of the target.
  const pattern = new RegExp(`(^|[^\\p{L}])(${escapeRegExp(phrase.target)})(?![\\p{L}])`, "iu");
  const match = pattern.exec(phrase.example);
  let sentence: ReactNode = phrase.example;
  if (match) {
    const start = match.index + match[1].length;
    const end = start + match[2].length;
    sentence = (
      <>
        {phrase.example.slice(0, start)}
        <mark style={{ background: "var(--color-surface-muted)", color: "inherit", fontWeight: 700, padding: "0 2px", borderRadius: 4 }}>
          {phrase.example.slice(start, end)}
        </mark>
        {phrase.example.slice(end)}
      </>
    );
  }

  return (
    <div style={{ marginTop: 8, fontSize: "0.92rem", textAlign: align }}>
      <div>💬 {sentence}</div>
      {showNative && phrase.exampleNative && (
        <div className="text-muted" style={{ fontSize: "0.85rem" }}>
          {phrase.exampleNative}
        </div>
      )}
    </div>
  );
}
