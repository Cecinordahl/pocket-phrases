import type { Phrase } from "../types/lesson";

type ReadProps = {
  phrases: Phrase[];
};

export function Read({ phrases }: ReadProps) {
  return (
    <ul
      style={{
        listStyle: "none",
        padding: 0,
        margin: 0,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {phrases.map((phrase, i) => (
        <li key={i} className="card">
          <div style={{ fontWeight: 600, fontSize: "1.05rem" }}>{phrase.target}</div>
          <div className="text-muted" style={{ fontStyle: "italic" }}>
            {phrase.pronunciation}
          </div>
          <div>{phrase.native}</div>
        </li>
      ))}
    </ul>
  );
}
