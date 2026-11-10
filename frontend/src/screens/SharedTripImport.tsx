import type { SharedTrip } from "../lib/share";
import { daysUntil, tripStore } from "../lib/trip";

type SharedTripImportProps = {
  trip: SharedTrip;
  onImported: () => void;
  onCancel: () => void;
};

const LANGUAGE_NAMES = { es: "spansk", fr: "fransk", de: "tysk" } as const;

export function SharedTripImport({ trip, onImported, onCancel }: SharedTripImportProps) {
  const existing = tripStore.get(trip.language);
  const left = daysUntil(trip.departureDate);
  const date = new Date(`${trip.departureDate}T00:00:00`).toLocaleDateString("nb-NO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  function importTrip() {
    // Your own progress starts fresh — completed situations aren't shared.
    tripStore.save({ ...trip, completed: [] });
    onImported();
  }

  return (
    <div style={{ marginTop: 24 }}>
      <h2>👫 Noen har delt en reiseplan med deg</h2>
      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>🧳 {trip.destination || "Reise"}</h3>
        <p style={{ margin: "4px 0" }}>
          Avreise <strong>{date}</strong>
          {left > 0 && ` — om ${left} ${left === 1 ? "dag" : "dager"}`}
        </p>
        <p className="text-muted" style={{ margin: "4px 0" }}>
          Øv på {LANGUAGE_NAMES[trip.language]}: {trip.modes.map((m) => m.title).join(", ")}
        </p>
      </div>

      {left < 0 && (
        <p style={{ color: "var(--color-warning)" }}>Denne reisen har allerede startet — planen har ingen øvingsdager igjen.</p>
      )}
      {existing && (
        <p style={{ color: "var(--color-warning)" }}>
          Du har allerede en reiseplan for {LANGUAGE_NAMES[trip.language]}
          {existing.destination ? ` (${existing.destination})` : ""}. Den blir erstattet hvis du legger til denne.
        </p>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button className="button" style={{ flex: 1 }} onClick={importTrip}>
          Legg til reiseplanen
        </button>
        <button className="button button-secondary" style={{ flex: 1 }} onClick={onCancel}>
          Nei takk
        </button>
      </div>
    </div>
  );
}
