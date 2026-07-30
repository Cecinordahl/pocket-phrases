import type { PhraseCategory } from "../types/lesson";

// Category colors are purely thematic accents (dots/bars, icon tint) — kept
// deliberately far from the sacred red/green feedback colors defined in
// index.css (--color-correct / --color-wrong), which must never be reused
// for anything else so they keep a single, unambiguous meaning.
type CategoryStyle = {
  label: string;
  accent: string;
  tint: string;
};

const CATEGORY_STYLES: Record<PhraseCategory, CategoryStyle> = {
  reise: { label: "Reise", accent: "#2563eb", tint: "#eff6ff" },
  mat: { label: "Mat", accent: "#ea580c", tint: "#fff7ed" },
  sosialt: { label: "Sosialt", accent: "#9333ea", tint: "#faf5ff" },
  transport: { label: "Transport", accent: "#0d9488", tint: "#f0fdfa" },
  nodsituasjon: { label: "Nødsituasjon", accent: "#be185d", tint: "#fdf2f8" },
  handel: { label: "Handel", accent: "#b45309", tint: "#fffbeb" },
  hoflighet: { label: "Høflighet", accent: "#4338ca", tint: "#eef2ff" },
  annet: { label: "Annet", accent: "#475569", tint: "#f8fafc" },
};

export function categoryStyle(category: PhraseCategory): CategoryStyle {
  return CATEGORY_STYLES[category] ?? CATEGORY_STYLES.annet;
}
