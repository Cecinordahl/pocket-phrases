import { useEffect, useState } from "react";
import { REWARD_EVENT, type RewardResult } from "../lib/rewards";

const CONFETTI_COLORS = ["#16a34a", "#2563eb", "#ea580c", "#9333ea", "#eab308", "#0d9488"];
const SMALL_MS = 2200;
const BIG_MS = 4000;

type Shown = RewardResult & { id: number };

// Listens for award(...) results anywhere in the app. Small wins get a
// "+XP" toast; big ones (perfect score, level up, trophy, daily goal) get a
// card with confetti. Tap anywhere on it to dismiss.
export function Celebration() {
  const [shown, setShown] = useState<Shown | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    function onReward(e: Event) {
      const detail = (e as CustomEvent<RewardResult>).detail;
      const big = isBig(detail);
      setShown({ ...detail, id: Date.now() });
      clearTimeout(timer);
      timer = setTimeout(() => setShown(null), big ? BIG_MS : SMALL_MS);
    }
    window.addEventListener(REWARD_EVENT, onReward);
    return () => {
      window.removeEventListener(REWARD_EVENT, onReward);
      clearTimeout(timer);
    };
  }, []);

  if (!shown) return null;

  if (!isBig(shown)) {
    return (
      <div key={shown.id} className="xp-toast" role="status" onClick={() => setShown(null)}>
        <strong>+{shown.xpGained} XP</strong> · {shown.reason}
      </div>
    );
  }

  return (
    <div key={shown.id} className="celebration-backdrop" role="status" onClick={() => setShown(null)}>
      <div className="confetti" aria-hidden="true">
        {Array.from({ length: 40 }, (_, i) => (
          <span
            key={i}
            style={{
              left: `${(i * 97) % 100}%`,
              background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              animationDelay: `${(i % 10) * 0.06}s`,
              animationDuration: `${1.6 + (i % 5) * 0.25}s`,
              transform: `rotate(${i * 37}deg)`,
            }}
          />
        ))}
      </div>
      <div className="celebration-card">
        <div style={{ fontSize: "2.6rem" }} aria-hidden="true">
          {shown.levelUp ? "⭐" : shown.newBadges[0]?.emoji ?? (shown.dailyGoalReached ? "☀️" : "🎉")}
        </div>
        <h2 style={{ margin: "4px 0" }}>
          {shown.levelUp ? `Nivå ${shown.levelUp}!` : shown.dailyGoalReached ? "Dagsmålet er nådd!" : shown.reason}
        </h2>
        <div className="xp-pill">+{shown.xpGained} XP</div>
        {shown.newBadges.map((b) => (
          <div key={b.id} className="badge-unlocked">
            <span aria-hidden="true">{b.emoji}</span>
            <span>
              <strong>Ny trofé: {b.title}</strong>
              <br />
              <span className="text-muted">{b.description}</span>
            </span>
          </div>
        ))}
        <div className="text-muted" style={{ fontSize: "0.8rem", marginTop: 10 }}>
          Trykk for å fortsette
        </div>
      </div>
    </div>
  );
}

function isBig(r: RewardResult): boolean {
  return r.perfect || r.levelUp !== null || r.dailyGoalReached || r.newBadges.length > 0;
}
