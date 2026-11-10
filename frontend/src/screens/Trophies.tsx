import { BADGES, DAILY_GOAL_XP, rewardSummary } from "../lib/rewards";
import { streakStore } from "../lib/streak";

type TrophiesProps = {
  onBack: () => void;
};

export function Trophies({ onBack }: TrophiesProps) {
  const r = rewardSummary();
  const longest = streakStore.get().longestStreak;

  const stats: [string, string, number | string][] = [
    ["⭐", "Totalt XP", r.xp],
    ["🔥", "Lengste rekke", `${longest} ${longest === 1 ? "dag" : "dager"}`],
    ["🎯", "Tester", r.stats.quizzes],
    ["💯", "Feilfrie tester", r.stats.perfectQuizzes],
    ["🗣️", "Samtaler", r.stats.conversations],
    ["🔁", "Repetisjonsrunder", r.stats.reviews],
  ];

  return (
    <div style={{ marginTop: 16 }}>
      <button className="button button-secondary" style={{ marginBottom: 16 }} onClick={onBack}>
        ← Tilbake
      </button>
      <h2>🏆 Fremgang</h2>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <strong>⭐ Nivå {r.level}</strong>
          <span className="text-muted">
            {r.levelSize - r.intoLevel} XP til nivå {r.level + 1}
          </span>
        </div>
        <div className="bar" style={{ marginTop: 6 }}>
          <div className="bar-fill" style={{ width: `${(r.intoLevel / r.levelSize) * 100}%` }} />
        </div>
        <p className="text-muted" style={{ fontSize: "0.85rem", marginBottom: 0 }}>
          I dag: {r.xpToday} XP av dagsmålet på {DAILY_GOAL_XP}. Du får XP for tester, øving, samtaler og repetisjon.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 12 }}>
        {stats.map(([emoji, label, value]) => (
          <div key={label} className="card" style={{ padding: 10, textAlign: "center" }}>
            <div aria-hidden="true">{emoji}</div>
            <strong>{value}</strong>
            <div className="text-muted" style={{ fontSize: "0.72rem" }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      <h3 style={{ marginTop: 24 }}>
        Trofeer · {r.unlocked.length}/{BADGES.length}
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
        {BADGES.map((b) => {
          const unlocked = r.unlocked.includes(b.id);
          return (
            <div key={b.id} className={`badge${unlocked ? " badge-earned" : ""}`}>
              <div style={{ fontSize: "1.8rem", filter: unlocked ? "none" : "grayscale(1)", opacity: unlocked ? 1 : 0.35 }} aria-hidden="true">
                {unlocked ? b.emoji : "🔒"}
              </div>
              <strong style={{ fontSize: "0.88rem" }}>{b.title}</strong>
              <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                {b.description}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
