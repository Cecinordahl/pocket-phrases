import { useState } from "react";
import type { Lesson, ModeInfo } from "../types/lesson";
import { AccessDeniedError, fetchPrebuiltLesson, fetchRandomLesson } from "../lib/api";
import { ShareButton } from "../components/ShareButton";
import { buildPlan, dayLabel, daysUntil, REHEARSAL_KEY, tripStore, type Trip } from "../lib/trip";

type TripPlanProps = {
  trip: Trip;
  onBack: () => void;
  onEdit: () => void;
  onDeleted: () => void;
  onOpenLesson: (lesson: Lesson) => void;
  onOpenQuickPrep: () => void;
  onAccessDenied: () => void;
};

export function TripPlan({
  trip,
  onBack,
  onEdit,
  onDeleted,
  onOpenLesson,
  onOpenQuickPrep,
  onAccessDenied,
}: TripPlanProps) {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const left = daysUntil(trip.departureDate);
  const plan = buildPlan(trip);
  const today = plan.find((d) => d.offset === 0);
  const upcoming = plan.filter((d) => d.offset > 0);
  const doneCount = trip.modes.filter((m) => trip.completed.includes(m.key)).length;
  const where = trip.destination || "turen";

  async function open(key: string, load: () => Promise<Lesson>) {
    setError(null);
    setLoadingKey(key);
    try {
      onOpenLesson(await load());
    } catch (e) {
      if (e instanceof AccessDeniedError) {
        onAccessDenied();
        return;
      }
      setError(e instanceof Error ? e.message : "Noe gikk galt. Prøv igjen.");
    } finally {
      setLoadingKey(null);
    }
  }

  function remove() {
    if (!window.confirm("Slette reiseplanen?")) return;
    tripStore.remove(trip.language);
    onDeleted();
  }

  const headline =
    left < 0 ? `God tur til ${where}! 🎉` : left === 0 ? `Du reiser i dag! ✈️` : `${left} ${left === 1 ? "dag" : "dager"} til ${where}`;

  return (
    <div style={{ marginTop: 16 }}>
      <button className="button button-secondary" style={{ marginBottom: 16 }} onClick={onBack}>
        ← Tilbake
      </button>
      <h2>🧳 {headline}</h2>

      <div className="card" style={{ marginTop: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span>Klar for</span>
          <strong>
            {doneCount}/{trip.modes.length} situasjoner
          </strong>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: "var(--color-border)", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${trip.modes.length ? (doneCount / trip.modes.length) * 100 : 0}%`,
              background: "var(--color-primary)",
            }}
          />
        </div>
      </div>

      {error && (
        <p style={{ color: "var(--color-warning)" }} role="alert">
          {error}
        </p>
      )}

      {left <= 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>⚡ På tur nå?</h3>
          <p className="text-muted" style={{ marginBottom: 12 }}>
            Bruk «Her og nå» for en rask oppfriskning før hver situasjon.
          </p>
          <button className="button" style={{ width: "100%" }} onClick={onOpenQuickPrep}>
            Åpne Her og nå
          </button>
        </div>
      )}

      {today && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>📅 I dag</h3>
          <DayContent
            modes={today.modes}
            rehearsal={today.rehearsal}
            rehearsalDone={trip.completed.includes(REHEARSAL_KEY)}
            loadingKey={loadingKey}
            onOpenMode={(m) => open(m.key, () => fetchPrebuiltLesson(trip.language, m.key))}
            onOpenRehearsal={() => open(REHEARSAL_KEY, () => fetchRandomLesson(trip.language))}
          />
          <p className="text-muted" style={{ fontSize: "0.8rem", marginTop: 10, marginBottom: 0 }}>
            En situasjon regnes som ferdig når du har tatt testen.
          </p>
        </div>
      )}

      {left > 0 && !today && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>✅ Ingenting igjen i dag</h3>
          <p className="text-muted" style={{ marginBottom: 0 }}>Bra jobba! Se hva som kommer under.</p>
        </div>
      )}

      {upcoming.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3 className="text-muted" style={{ fontSize: "0.95rem" }}>Kommende dager</h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {upcoming.map((day) => (
              <li key={day.date} className="card" style={{ padding: 12 }}>
                <strong style={{ textTransform: "capitalize" }}>{dayLabel(day)}</strong>
                <div className="text-muted">
                  {day.rehearsal ? "🎭 Generalprøve — blandet repetisjon" : day.modes.map((m) => m.title).join(", ")}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {left >= 0 && (
        <div style={{ marginTop: 20 }}>
          <ShareButton
            payload={{
              v: 1,
              kind: "trip",
              trip: {
                language: trip.language,
                destination: trip.destination,
                departureDate: trip.departureDate,
                modes: trip.modes,
              },
            }}
            text={`Bli med og øv til ${trip.destination || "turen"} i Pocket Phrases`}
          />
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button className="button button-secondary" style={{ flex: 1 }} onClick={onEdit}>
          Endre plan
        </button>
        <button className="button button-secondary" style={{ flex: 1 }} onClick={remove}>
          Slett plan
        </button>
      </div>
    </div>
  );
}

type DayContentProps = {
  modes: ModeInfo[];
  rehearsal: boolean;
  rehearsalDone: boolean;
  loadingKey: string | null;
  onOpenMode: (mode: ModeInfo) => void;
  onOpenRehearsal: () => void;
};

function DayContent({ modes, rehearsal, rehearsalDone, loadingKey, onOpenMode, onOpenRehearsal }: DayContentProps) {
  const busy = loadingKey !== null;
  if (rehearsal) {
    return (
      <>
        <p className="text-muted">
          🎭 Generalprøve: en blanding fra alle situasjonene.{rehearsalDone && " Du har tatt den — ta den gjerne igjen!"}
        </p>
        <button className="button" style={{ width: "100%" }} disabled={busy} onClick={onOpenRehearsal}>
          {loadingKey === REHEARSAL_KEY ? "Laster..." : "Start generalprøven"}
        </button>
      </>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {modes.map((m) => (
        <button key={m.key} className="button" disabled={busy} onClick={() => onOpenMode(m)}>
          {loadingKey === m.key ? "Laster..." : m.title}
        </button>
      ))}
    </div>
  );
}
