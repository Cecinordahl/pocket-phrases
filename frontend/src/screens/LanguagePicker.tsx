import type { Language } from "../types/lesson";

type LanguagePickerProps = {
  onSelect: (language: Language) => void;
};

const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: "es", label: "Spansk", flag: "🇪🇸" },
  { code: "fr", label: "Fransk", flag: "🇫🇷" },
  { code: "de", label: "Tysk", flag: "🇩🇪" },
];

export function LanguagePicker({ onSelect }: LanguagePickerProps) {
  return (
    <div style={{ marginTop: 48 }}>
      <h1>Pocket Phrases</h1>
      <p className="text-muted">Velg språket du vil øve på.</p>
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
