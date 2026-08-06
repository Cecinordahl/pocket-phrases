import { useState } from "react";
import type { Language } from "../types/lesson";
import { streakStore } from "../lib/streak";

type LanguagePickerProps = {
  onSelect: (language: Language) => void;
};

const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: "es", label: "Spansk", flag: "🇪🇸" },
  { code: "fr", label: "Fransk", flag: "🇫🇷" },
  { code: "de", label: "Tysk", flag: "🇩🇪" },
];

// Shown once, before the user has ever started a streak — a nudge to begin,
// not just a rule explanation.
const STREAK_PITCH_TEXT =
  "Fullfør en test i dag for å starte streaken din — og se hvor lenge du klarer å holde den gående!";
// Shown afterward as an on-demand reminder of the rule (via the ⓘ toggle,
// or when a streak has broken and needs restarting).
const STREAK_RULE_TEXT = "Fullfør minst én test hver dag for å holde streaken i live.";

export function LanguagePicker({ onSelect }: LanguagePickerProps) {
  const { currentStreak, longestStreak } = streakStore.get();
  const [showInfo, setShowInfo] = useState(false);
  const everHadStreak = longestStreak > 0;

  return (
    <div style={{ marginTop: 48 }}>
      <h1>Pocket Phrases</h1>
      <p className="text-muted">Velg språket du vil øve på.</p>

      {/* Before the user has ever earned a streak, pitch starting one today
          rather than just explaining the rule — there's nothing to nudge
          toward with a bare counter otherwise. Once they have streak
          history, switch to the counter (or a "broken" nudge) with an
          on-demand ⓘ instead, so returning users aren't shown the same
          pitch every visit. */}
      {!everHadStreak && (
        <p className="text-muted" style={{ marginTop: -4 }}>
          🔥 {STREAK_PITCH_TEXT}
        </p>
      )}
      {everHadStreak && (
        <div style={{ marginTop: -4 }}>
          <p style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
            {currentStreak > 0
              ? `🔥 ${currentStreak} ${currentStreak === 1 ? "dag" : "dager"} på rad`
              : "Streaken din er brutt"}
            <button
              aria-label="Hvordan fungerer streak?"
              aria-expanded={showInfo}
              onClick={() => setShowInfo((s) => !s)}
              style={{
                background: "none",
                border: "1px solid var(--color-border)",
                borderRadius: "50%",
                width: 20,
                height: 20,
                lineHeight: 1,
                padding: 0,
                fontSize: "0.75rem",
                color: "var(--color-text-muted)",
              }}
            >
              ⓘ
            </button>
          </p>
          {showInfo && (
            <p className="text-muted animate-in" style={{ marginTop: 6, marginBottom: 0 }}>
              {STREAK_RULE_TEXT}
            </p>
          )}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            className="button"
            onClick={() => onSelect(lang.code)}
          >
            <span aria-hidden="true">{lang.flag}</span>
            {lang.label}
          </button>
        ))}
      </div>
      <p className="text-muted" style={{ marginTop: 24 }}>
        Flere språk kommer.
      </p>
    </div>
  );
}
