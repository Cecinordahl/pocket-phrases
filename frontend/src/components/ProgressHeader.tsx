import { DAILY_GOAL_XP, rewardSummary } from "../lib/rewards";

type ProgressHeaderProps = {
  onOpenTrophies: () => void;
};

// Streak, level and today's goal at a glance at the top of the home screen.
export function ProgressHeader({ onOpenTrophies }: ProgressHeaderProps) {
  const r = rewardSummary();
  const goal = Math.min(1, r.xpToday / DAILY_GOAL_XP);

  return (
    <button className="progress-header" onClick={onOpenTrophies} aria-label="Se fremgang og trofeer">
      <div className="progress-stat" title="Dager på rad">
        <span aria-hidden="true" style={{ filter: r.streak > 0 ? "none" : "grayscale(1)", opacity: r.streak > 0 ? 1 : 0.5 }}>
          🔥
        </span>
        <strong>{r.streak}</strong>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
          <strong>⭐ Nivå {r.level}</strong>
          <span className="text-muted">
            {r.intoLevel}/{r.levelSize} XP
          </span>
        </div>
        <div className="bar">
          <div className="bar-fill" style={{ width: `${(r.intoLevel / r.levelSize) * 100}%` }} />
        </div>
      </div>

      <div className="progress-stat" title={`Dagsmål: ${r.xpToday}/${DAILY_GOAL_XP} XP`}>
        <span className="goal-ring" style={{ ["--goal" as string]: `${goal * 360}deg` }} aria-hidden="true">
          {goal >= 1 ? "✓" : "🎯"}
        </span>
        <span style={{ fontSize: "0.75rem" }}>
          {Math.min(r.xpToday, DAILY_GOAL_XP)}/{DAILY_GOAL_XP}
        </span>
      </div>

      <div className="progress-stat" title="Trofeer">
        <span aria-hidden="true">🏆</span>
        <strong>{r.unlocked.length}</strong>
      </div>
    </button>
  );
}
