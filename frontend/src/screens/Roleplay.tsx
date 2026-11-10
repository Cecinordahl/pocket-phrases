import { useEffect, useRef, useState } from "react";
import type { Language, ModeInfo } from "../types/lesson";
import { AccessDeniedError, fetchModes, fetchRoleplayTurn, type RoleplayMessage } from "../lib/api";
import { streakStore } from "../lib/streak";
import { Disclaimer } from "../components/Disclaimer";

type RoleplayProps = {
  language: Language;
  onBack: () => void;
  onAccessDenied: () => void;
};

// Mirrors RoleplayController.MAX_USER_TURNS on the backend.
const MAX_USER_TURNS = 8;
const MAX_MESSAGE_LENGTH = 300;
const MAX_SCENARIO_LENGTH = 100;

type ChatMessage = RoleplayMessage & {
  norwegian?: string; // assistant only
  correction?: string; // user only — filled in when the next reply arrives
};

export function Roleplay({ language, onBack, onAccessDenied }: RoleplayProps) {
  const [modes, setModes] = useState<ModeInfo[] | null>(null);
  const [customScenario, setCustomScenario] = useState("");
  const [scenario, setScenario] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hints, setHints] = useState<string[]>([]);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [input, setInput] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchModes()
      .then(setModes)
      .catch((e) => {
        if (e instanceof AccessDeniedError) onAccessDenied();
        else setError("Kunne ikke laste situasjonene. Prøv igjen.");
      });
    // onAccessDenied is stable (defined once in App).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, waiting]);

  const userTurns = messages.filter((m) => m.role === "user").length;

  async function requestTurn(activeScenario: string, history: ChatMessage[]): Promise<boolean> {
    setWaiting(true);
    setError(null);
    try {
      const turn = await fetchRoleplayTurn(
        language,
        activeScenario,
        history.map(({ role, text }) => ({ role, text })),
      );
      const updated = [...history];
      const last = updated[updated.length - 1];
      if (last?.role === "user" && turn.correction.trim()) {
        updated[updated.length - 1] = { ...last, correction: turn.correction.trim() };
      }
      updated.push({ role: "assistant", text: turn.reply, norwegian: turn.replyNorwegian });
      setMessages(updated);
      setHints(turn.hints);

      const finished = turn.done || updated.filter((m) => m.role === "user").length >= MAX_USER_TURNS;
      if (finished) {
        setDone(true);
        streakStore.recordActivity();
      }
      return true;
    } catch (e) {
      if (e instanceof AccessDeniedError) {
        onAccessDenied();
        return false;
      }
      setError(e instanceof Error ? e.message : "Noe gikk galt. Prøv igjen.");
      return false;
    } finally {
      setWaiting(false);
    }
  }

  function start(chosen: string) {
    setScenario(chosen);
    setMessages([]);
    setHints([]);
    setRevealed(new Set());
    setDone(false);
    requestTurn(chosen, []);
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || !scenario || waiting || done) return;
    const history: ChatMessage[] = [...messages, { role: "user", text: trimmed }];
    setMessages(history);
    setInput("");
    setHints([]);
    const ok = await requestTurn(scenario, history);
    if (!ok) {
      // Roll back so the user can retry without a dangling unanswered message.
      setMessages(messages);
      setInput(trimmed);
    }
  }

  function toggleReveal(i: number) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  // --- Pick a scenario -------------------------------------------------------
  if (scenario === null) {
    return (
      <div style={{ marginTop: 16 }}>
        <button className="button button-secondary" style={{ marginBottom: 16 }} onClick={onBack}>
          ← Tilbake
        </button>
        <h2>🗣️ Øv på en samtale</h2>
        <p className="text-muted">
          Du snakker med en lokal person (servitør, resepsjonist, sjåfør …). Svar så godt du kan — du får
          hint og vennlige rettelser underveis.
        </p>

        {error && (
          <p style={{ color: "var(--color-warning)" }} role="alert">
            {error}
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
          {modes === null && !error && <p className="text-muted">Laster...</p>}
          {modes?.map((mode) => (
            <button key={mode.key} className="button button-secondary" onClick={() => start(mode.title)}>
              {mode.title}
            </button>
          ))}
        </div>

        <div className="card" style={{ marginTop: 20 }}>
          <h3>Eller beskriv situasjonen</h3>
          <input
            type="text"
            value={customScenario}
            maxLength={MAX_SCENARIO_LENGTH}
            onChange={(e) => setCustomScenario(e.target.value)}
            placeholder="F.eks. «Kjøpe billett til Louvre»"
            style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid var(--color-border)", fontSize: "1rem", marginBottom: 10 }}
          />
          <button className="button" disabled={!customScenario.trim()} onClick={() => start(customScenario.trim())}>
            Start samtalen
          </button>
        </div>

        <p className="text-muted" style={{ fontSize: "0.78rem", marginTop: 16 }}>
          Det du skriver sendes til Anthropic (tredjepart) for å lage svarene. Ikke skriv sensitiv informasjon.
        </p>
      </div>
    );
  }

  // --- Chat --------------------------------------------------------------------
  return (
    <div style={{ marginTop: 16 }}>
      <button className="button button-secondary" style={{ marginBottom: 16 }} onClick={() => setScenario(null)}>
        ← Velg annen situasjon
      </button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2 style={{ marginBottom: 4 }}>🗣️ {scenario}</h2>
        <span className="text-muted" style={{ fontSize: "0.85rem" }}>
          {Math.min(userTurns, MAX_USER_TURNS)}/{MAX_USER_TURNS}
        </span>
      </div>

      <Disclaimer>Svarene er generert av KI og kan inneholde feil.</Disclaimer>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
        {messages.map((m, i) =>
          m.role === "assistant" ? (
            <div key={i} className="animate-in" style={{ alignSelf: "flex-start", maxWidth: "85%" }}>
              <button
                onClick={() => toggleReveal(i)}
                aria-label="Vis norsk oversettelse"
                style={{
                  textAlign: "left",
                  padding: "10px 14px",
                  borderRadius: "16px 16px 16px 4px",
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                  fontSize: "1rem",
                  cursor: "pointer",
                }}
              >
                <div>{m.text}</div>
                <div className="text-muted" style={{ fontSize: "0.85rem", marginTop: 4 }}>
                  {revealed.has(i) ? m.norwegian : "Trykk for norsk"}
                </div>
              </button>
            </div>
          ) : (
            <div key={i} className="animate-in" style={{ alignSelf: "flex-end", maxWidth: "85%" }}>
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "16px 16px 4px 16px",
                  background: "var(--color-primary)",
                  color: "white",
                }}
              >
                {m.text}
              </div>
              {m.correction && (
                <div
                  style={{
                    marginTop: 4,
                    padding: "6px 10px",
                    borderRadius: 10,
                    background: "var(--color-warning-bg)",
                    color: "var(--color-warning)",
                    fontSize: "0.85rem",
                  }}
                >
                  ✏️ {m.correction}
                </div>
              )}
            </div>
          ),
        )}
        {waiting && <p className="text-muted" style={{ margin: 0 }}>…</p>}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p style={{ color: "var(--color-warning)" }} role="alert">
          {error}
          {messages.length === 0 && (
            <>
              {" "}
              <button className="button button-secondary" onClick={() => start(scenario)}>
                Prøv igjen
              </button>
            </>
          )}
        </p>
      )}

      {done ? (
        <div className="card animate-in" style={{ marginTop: 16 }}>
          <h3>🎉 Samtalen er ferdig!</h3>
          <p className="text-muted">
            Du sa {userTurns} {userTurns === 1 ? "replikk" : "replikker"}
            {messages.some((m) => m.correction) ? " — se rettelsene over." : " uten rettelser. Sterkt!"}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="button" style={{ flex: 1 }} onClick={() => start(scenario)}>
              Ny samtale
            </button>
            <button className="button button-secondary" style={{ flex: 1 }} onClick={() => setScenario(null)}>
              Annen situasjon
            </button>
          </div>
        </div>
      ) : (
        messages.length > 0 && (
          <div style={{ marginTop: 16 }}>
            {hints.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                <span className="text-muted" style={{ fontSize: "0.85rem", alignSelf: "center" }}>
                  💡 Hint:
                </span>
                {hints.map((h) => (
                  <button
                    key={h}
                    onClick={() => setInput(h)}
                    disabled={waiting}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-surface-muted)",
                      color: "var(--color-text)",
                      fontSize: "0.85rem",
                      cursor: "pointer",
                    }}
                  >
                    {h}
                  </button>
                ))}
              </div>
            )}
            <form
              style={{ display: "flex", gap: 8 }}
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <input
                type="text"
                value={input}
                maxLength={MAX_MESSAGE_LENGTH}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Skriv svaret ditt…"
                disabled={waiting}
                style={{ flex: 1, padding: 12, borderRadius: 12, border: "1px solid var(--color-border)", fontSize: "1rem" }}
              />
              <button className="button" type="submit" disabled={waiting || !input.trim()}>
                Send
              </button>
            </form>
          </div>
        )
      )}
    </div>
  );
}
