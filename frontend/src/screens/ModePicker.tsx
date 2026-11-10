import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AccessDeniedError,
  fetchModes,
  fetchPrebuiltLesson,
  fetchRandomLesson,
  generateLesson,
  generateLessonFromImage,
} from "../lib/api";
import { prepareImage } from "../lib/image";
import type { Language, Lesson, ModeInfo } from "../types/lesson";
import { getWordCount } from "../lib/frequency";
import { getTopicWordCount, TOPICS, type TopicId } from "../lib/topicVocab";
import { buildPlan, daysUntil, tripStore } from "../lib/trip";
import { dueSummary } from "../lib/srs";
import { progressStore } from "../lib/progress";
import { ProgressHeader } from "../components/ProgressHeader";

type ModePickerProps = {
  language: Language;
  onBack: () => void;
  onLessonReady: (lesson: Lesson) => void;
  onAccessDenied: () => void;
  onEnterVocabJourney: () => void;
  onEnterTopic: (topic: TopicId) => void;
  onEnterQuickPrep: () => void;
  onEnterTrip: () => void;
  onEnterRoleplay: () => void;
  onEnterReview: () => void;
  onOpenTrophies: () => void;
};

const MAX_SITUATION_LENGTH = 300;

// Render's free tier sleeps the backend after inactivity — the first
// request after a while can take 10-30s to wake it up. Below this, a plain
// "Laster..." looks broken; only show the explanation once it's actually
// taking a while, so a normal warm-server load never sees it.
const SLOW_LOAD_HINT_MS = 3000;

export function ModePicker({
  language,
  onBack,
  onLessonReady,
  onAccessDenied,
  onEnterVocabJourney,
  onEnterTopic,
  onEnterQuickPrep,
  onEnterTrip,
  onEnterRoleplay,
  onEnterReview,
  onOpenTrophies,
}: ModePickerProps) {
  const [modes, setModes] = useState<ModeInfo[] | null>(null);
  const [situation, setSituation] = useState("");
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slowLoad, setSlowLoad] = useState(false);
  const [slowGenerate, setSlowGenerate] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [describeOpen, setDescribeOpen] = useState(false);

  // Calling Anthropic genuinely takes a few seconds even on a warm backend,
  // so — unlike the mode-list load — this hint shows immediately rather
  // than waiting to see if it's "slow". It escalates if it runs long
  // enough to plausibly be a cold-started backend on top of the AI call.
  useEffect(() => {
    if (loadingKey !== "generate" && loadingKey !== "photo") {
      setSlowGenerate(false);
      return;
    }
    const timer = setTimeout(() => setSlowGenerate(true), 8000);
    return () => clearTimeout(timer);
  }, [loadingKey]);

  useEffect(() => {
    const timer = setTimeout(() => setSlowLoad(true), SLOW_LOAD_HINT_MS);
    fetchModes()
      .then(setModes)
      .catch((e) => {
        if (e instanceof AccessDeniedError) {
          onAccessDenied();
          return;
        }
        setError("Kunne ikke laste modusene. Prøv å laste siden på nytt.");
      })
      .finally(() => clearTimeout(timer));
    return () => clearTimeout(timer);
    // onAccessDenied is stable across renders (defined once in App); omitting
    // it from deps avoids re-fetching modes on every parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(key: string, action: () => Promise<Lesson>) {
    setError(null);
    setLoadingKey(key);
    try {
      const lesson = await action();
      onLessonReady(lesson);
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

  function handleGenerate() {
    const trimmed = situation.trim();
    if (!trimmed) return;
    run("generate", () => generateLesson(language, trimmed));
  }

  function handlePhoto(file: File | undefined) {
    if (!file) return;
    run("photo", async () => {
      const image = await prepareImage(file);
      return generateLessonFromImage(language, image.base64, image.mediaType);
    });
  }

  const busy = loadingKey !== null;
  const trip = tripStore.get(language);
  const tripDaysLeft = trip ? daysUntil(trip.departureDate) : null;
  const tripActive = trip !== null && tripDaysLeft !== null && tripDaysLeft >= 0;
  const todaysPlan = tripActive && trip ? buildPlan(trip).find((d) => d.offset === 0) : undefined;
  const todayKeys = new Set(todaysPlan?.modes.map((m) => m.key) ?? []);
  const review = dueSummary(language);
  const showVocab = getWordCount(language) > 0 || getTopicWordCount("tourist", language) > 0;

  // Done = test taken; mastered = last test was all correct (prebuilt lessons have 6 phrases).
  const PREBUILT_LESSON_SIZE = 6;
  function situationState(key: string): { className: string; label: string } {
    const p = progressStore.get(language, key);
    const today = todayKeys.has(key) && !(trip?.completed.includes(key) ?? false);
    const todayClass = today ? " situation-today" : "";
    if (p.quizzed && (p.lastQuizScore ?? 0) >= PREBUILT_LESSON_SIZE) {
      return { className: "situation-mastered" + todayClass, label: "⭐ " };
    }
    if (p.quizzed) return { className: "situation-done" + todayClass, label: "✓ " };
    return { className: todayClass, label: today ? "📅 " : "" };
  }

  return (
    <div style={{ marginTop: 24 }}>
      <button className="button-secondary button" style={{ marginBottom: 16 }} onClick={onBack}>
        ← Bytt språk
      </button>
      <ProgressHeader onOpenTrophies={onOpenTrophies} />
      <h2>Hva vil du øve på?</h2>

      {error && (
        <p style={{ color: "var(--color-warning)" }} role="alert">
          {error}
        </p>
      )}

      {/* --- Situasjoner (+ optional trip plan) -------------------------- */}
      <Section title="💬 Situasjoner" subtitle="Fraser for vanlige situasjoner på reise.">
        <div className="card" style={{ padding: 12 }}>
          {tripActive && trip ? (
            <button className="trip-banner" onClick={onEnterTrip}>
              <span>
                <strong>
                  🧳{" "}
                  {tripDaysLeft === 0
                    ? `Du reiser i dag${trip.destination ? ` til ${trip.destination}` : ""}!`
                    : `${tripDaysLeft} ${tripDaysLeft === 1 ? "dag" : "dager"} til ${trip.destination || "turen"}`}
                </strong>
                {" · "}
                {trip.modes.filter((m) => trip.completed.includes(m.key)).length}/{trip.modes.length} klar
                <br />
                <span className="text-muted">
                  {todaysPlan
                    ? todaysPlan.rehearsal
                      ? "I dag: 🎭 generalprøve"
                      : `I dag: ${todaysPlan.modes.map((m) => m.title).join(", ")}`
                    : "Ingenting igjen i dag 🎉"}
                </span>
              </span>
              <span aria-hidden="true">→</span>
            </button>
          ) : (
            <button className="trip-banner" onClick={onEnterTrip}>
              <span>
                <strong>📅 Skal du reise?</strong>
                <br />
                <span className="text-muted">Legg inn dato, så får du en plan for hver dag fram til avreise.</span>
              </span>
              <span aria-hidden="true">→</span>
            </button>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: 8,
              marginTop: 12,
            }}
          >
            {modes === null && (
              <p className="text-muted" style={{ gridColumn: "1 / -1", margin: 0 }}>
                {slowLoad
                  ? "Vekker serveren — dette kan ta opptil 30 sekunder hvis den har ligget i dvale."
                  : "Laster..."}
              </p>
            )}
            {modes?.map((mode) => {
              const state = situationState(mode.key);
              return (
                <button
                  key={mode.key}
                  className={`button button-secondary ${state.className}`}
                  disabled={busy}
                  onClick={() => run(mode.key, () => fetchPrebuiltLesson(language, mode.key))}
                >
                  {loadingKey === mode.key ? "Laster..." : `${state.label}${mode.title}`}
                </button>
              );
            })}
            {modes !== null && (
              <button className="button" disabled={busy} onClick={() => run("random", () => fetchRandomLesson(language))}>
                {loadingKey === "random" ? "Laster..." : "🎲 Tilfeldig"}
              </button>
            )}
          </div>
          <p className="text-muted" style={{ fontSize: "0.78rem", margin: "8px 0 0" }}>
            ✓ test tatt · ⭐ alt riktig{tripActive && " · 📅 på planen i dag"}
          </p>
        </div>
      </Section>

      {/* --- Øv nå ------------------------------------------------------- */}
      <Section title="⚡ Øv nå">
        <TileGrid>
          <Tile
            emoji="🔁"
            title={review.due > 0 ? `Repetisjon (${review.due})` : "Repetisjon"}
            description={
              review.due === 0
                ? "Ingenting å repetere nå — kom tilbake senere."
                : review.weak > 0
                  ? `${review.weak} du bommet på sist, pluss det som er klart for repetisjon.`
                  : "Fraser og ord som er klare for repetisjon."
            }
            onClick={onEnterReview}
          />
          <Tile
            emoji="⚡"
            title="Her og nå"
            description="De 5 viktigste frasene på 2 minutter, for situasjonen du står i."
            onClick={onEnterQuickPrep}
          />
          <Tile
            emoji="🗣️"
            title="Øv på en samtale"
            description="Snakk med en KI-servitør eller -sjåfør. Velg riktig svar av fire."
            onClick={onEnterRoleplay}
          />
        </TileGrid>
      </Section>

      {/* --- Lag din egen ------------------------------------------------- */}
      <Section title="✨ Lag din egen">
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={(e) => {
            handlePhoto(e.target.files?.[0]);
            // Reset so picking the same photo again still fires onChange.
            e.target.value = "";
          }}
        />
        <TileGrid>
          <Tile
            emoji="📸"
            title={loadingKey === "photo" ? "Leser bildet..." : "Bilde av meny/skilt"}
            description="Ta bilde, så lager vi en leksjon av det som står."
            disabled={busy}
            onClick={() => photoInputRef.current?.click()}
          />
          <Tile
            emoji="✍️"
            title="Beskriv situasjonen"
            description="Skriv hva du skal gjøre, så lager vi fraser til det."
            disabled={busy}
            selected={describeOpen}
            onClick={() => setDescribeOpen((o) => !o)}
          />
        </TileGrid>

        {loadingKey === "photo" && (
          <p className="text-muted animate-in" style={{ marginTop: 10, marginBottom: 0 }}>
            {slowGenerate
              ? "Tar litt lengre tid enn vanlig — vent litt til..."
              : "Leser bildet og lager fraser — dette tar gjerne 5–15 sekunder."}
          </p>
        )}

        {describeOpen && (
          <div className="card animate-in" style={{ marginTop: 10 }}>
            <textarea
              value={situation}
              maxLength={MAX_SITUATION_LENGTH}
              onChange={(e) => setSituation(e.target.value)}
              placeholder="F.eks. «Jeg skal sjekke inn på et hotell og spørre om frokost»"
              rows={3}
              autoFocus
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 12,
                border: "1px solid var(--color-border)",
                fontSize: "1rem",
                resize: "vertical",
                marginBottom: 10,
              }}
            />
            <button className="button" disabled={busy || !situation.trim()} onClick={handleGenerate}>
              {loadingKey === "generate" ? "Genererer..." : "Lag leksjon"}
            </button>
            {loadingKey === "generate" && (
              <p className="text-muted animate-in" style={{ marginTop: 10, marginBottom: 0 }}>
                {slowGenerate
                  ? "Tar litt lengre tid enn vanlig — kan hende serveren våkner fra dvale. Vent litt til..."
                  : "Lager fraser tilpasset situasjonen din — dette tar gjerne 5–15 sekunder."}
              </p>
            )}
          </div>
        )}

        <p className="text-muted" style={{ fontSize: "0.78rem", marginTop: 10, marginBottom: 0 }}>
          Bilder og tekst du skriver her sendes til Anthropic (tredjepart) for å lage frasene, og lagres ikke.
          Ikke del sensitiv informasjon eller bilder av personer.
        </p>
      </Section>

      {/* --- Ordforråd ---------------------------------------------------- */}
      {/* Only shown once there's fetched content for this language — no point
          linking into a journey that's 100% locked. */}
      {showVocab && (
        <Section title="📚 Ordforråd">
          <TileGrid>
            {getWordCount(language) > 0 && (
              <Tile
                emoji="📚"
                title="De mest brukte ordene"
                description="En reise gjennom de vanligste ordene, milepæl for milepæl."
                onClick={onEnterVocabJourney}
              />
            )}
            {getTopicWordCount("tourist", language) > 0 && (
              <Tile
                emoji="🧳"
                title={TOPICS.tourist.title}
                description={TOPICS.tourist.description}
                onClick={() => onEnterTopic("tourist")}
              />
            )}
          </TileGrid>
        </Section>
      )}
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: 28 }}>
      <h3 style={{ marginBottom: subtitle ? 2 : 10 }}>{title}</h3>
      {subtitle && (
        <p className="text-muted" style={{ marginTop: 0, marginBottom: 10, fontSize: "0.9rem" }}>
          {subtitle}
        </p>
      )}
      {children}
    </section>
  );
}

function TileGrid({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
      {children}
    </div>
  );
}

type TileProps = {
  emoji: string;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  selected?: boolean;
};

function Tile({ emoji, title, description, onClick, disabled, selected }: TileProps) {
  return (
    <button className={`tile${selected ? " tile-selected" : ""}`} onClick={onClick} disabled={disabled}>
      <span style={{ fontSize: "1.4rem" }} aria-hidden="true">
        {emoji}
      </span>
      <strong>{title}</strong>
      <span className="text-muted" style={{ fontSize: "0.82rem" }}>
        {description}
      </span>
    </button>
  );
}
