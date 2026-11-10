import { useEffect, useState } from "react";
import type { Language, ModeInfo } from "../types/lesson";
import { AccessDeniedError, fetchModes } from "../lib/api";
import { todayKey, tripStore } from "../lib/trip";

type TripSetupProps = {
  language: Language;
  onBack: () => void;
  onSaved: () => void;
  onAccessDenied: () => void;
};

const MAX_DESTINATION_LENGTH = 60;

export function TripSetup({ language, onBack, onSaved, onAccessDenied }: TripSetupProps) {
  const existing = tripStore.get(language);
  const [modes, setModes] = useState<ModeInfo[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set(existing?.modes.map((m) => m.key) ?? []));
  const [destination, setDestination] = useState(existing?.destination ?? "");
  const [departureDate, setDepartureDate] = useState(existing?.departureDate ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchModes()
      .then((m) => {
        setModes(m);
        // New trip: everything selected by default — easier to untick than tick.
        if (!existing) setSelected(new Set(m.map((x) => x.key)));
      })
      .catch((e) => {
        if (e instanceof AccessDeniedError) {
          onAccessDenied();
          return;
        }
        setError("Kunne ikke laste situasjonene. Prøv igjen.");
      });
    // Runs once; onAccessDenied is stable and `existing` is read at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const canSave = modes !== null && selected.size > 0 && departureDate >= todayKey();

  function save() {
    if (!modes || !canSave) return;
    const chosen = modes.filter((m) => selected.has(m.key));
    tripStore.save({
      language,
      destination: destination.trim(),
      departureDate,
      modes: chosen,
      // Keep progress when editing an existing trip, minus anything deselected.
      completed: (existing?.completed ?? []).filter(
        (k) => k === "random" || chosen.some((m) => m.key === k),
      ),
    });
    onSaved();
  }

  return (
    <div style={{ marginTop: 16 }}>
      <button className="button button-secondary" style={{ marginBottom: 16 }} onClick={onBack}>
        ← Tilbake
      </button>
      <h2>🧳 {existing ? "Endre reiseplan" : "Lag en reiseplan"}</h2>
      <p className="text-muted">Fortell når du reiser, så fordeler vi situasjonene over dagene du har igjen.</p>

      {error && (
        <p style={{ color: "var(--color-warning)" }} role="alert">
          {error}
        </p>
      )}

      <div className="card" style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <label>
          <div style={{ marginBottom: 6 }}>Hvor skal du? (valgfritt)</div>
          <input
            type="text"
            value={destination}
            maxLength={MAX_DESTINATION_LENGTH}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="F.eks. Paris"
            style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid var(--color-border)", fontSize: "1rem" }}
          />
        </label>
        <label>
          <div style={{ marginBottom: 6 }}>Når reiser du?</div>
          <input
            type="date"
            value={departureDate}
            min={todayKey()}
            onChange={(e) => setDepartureDate(e.target.value)}
            style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid var(--color-border)", fontSize: "1rem" }}
          />
        </label>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Hva vil du være klar for?</h3>
        {modes === null && !error && <p className="text-muted">Laster...</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {modes?.map((mode) => (
            <label key={mode.key} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={selected.has(mode.key)} onChange={() => toggle(mode.key)} />
              {mode.title}
            </label>
          ))}
        </div>
      </div>

      <button className="button" style={{ marginTop: 16, width: "100%" }} disabled={!canSave} onClick={save}>
        {existing ? "Lagre endringer" : "Lag plan"}
      </button>
    </div>
  );
}
