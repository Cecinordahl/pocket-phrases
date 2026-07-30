// The one shared lesson shape. Whether a Lesson comes from a seeded phrase
// pool, the Anthropic free-text endpoint, or the Random mix on the backend,
// it always arrives in this shape — the UI (Read/Drill/Quiz) never needs to
// know or care where it came from.
export type Phrase = {
  target: string;
  pronunciation: string;
  native: string;
};

export type Lesson = {
  title: string;
  language: Language;
  mode: string;
  phrases: Phrase[];
};

export type Language = "es" | "fr";

export type ModeInfo = {
  key: string;
  title: string;
};
