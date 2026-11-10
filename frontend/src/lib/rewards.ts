import { streakStore } from "./streak";

// Gamification: XP, levels, a daily XP goal and unlockable trophies. All
// local (localStorage), same as every other bit of progress in the app.
// Screens call award(...) when something is finished; the result is also
// broadcast as a window event so <Celebration/> can show it, wherever the
// user happens to be.

export type RewardActivity =
  | { kind: "quiz"; score: number; total: number; situation?: string }
  | { kind: "drill" }
  | { kind: "quick-prep" }
  | { kind: "review" }
  | { kind: "conversation"; turns: number }
  | { kind: "module" };

export type Badge = {
  id: string;
  emoji: string;
  title: string;
  description: string;
};

type RewardStats = {
  quizzes: number;
  perfectQuizzes: number;
  conversations: number;
  reviews: number;
  modules: number;
  situations: string[]; // "<language>:<mode>" keys quizzed at least once
};

type RewardState = {
  xp: number;
  xpToday: number;
  day: string; // local YYYY-MM-DD that xpToday belongs to
  badges: string[];
  dailyGoalHits: number;
  stats: RewardStats;
};

export type RewardResult = {
  xpGained: number;
  reason: string;
  perfect: boolean;
  levelUp: number | null; // the new level, if one was reached
  dailyGoalReached: boolean;
  newBadges: Badge[];
};

export const DAILY_GOAL_XP = 50;
export const REWARD_EVENT = "pocket-phrases:reward";
const STORAGE_KEY = "pocket-phrases:rewards";

export const BADGES: Badge[] = [
  { id: "first-lesson", emoji: "🎯", title: "Første test", description: "Fullfør din første test." },
  { id: "perfect", emoji: "💯", title: "Feilfri", description: "Få alt riktig på en test." },
  { id: "perfect-5", emoji: "🏅", title: "Skarpskytter", description: "Få alt riktig på 5 tester." },
  { id: "explorer", emoji: "🌍", title: "Allsidig", description: "Ta testen i 5 ulike situasjoner." },
  { id: "streak-3", emoji: "🔥", title: "På gang", description: "Øv 3 dager på rad." },
  { id: "streak-7", emoji: "🚀", title: "En hel uke", description: "Øv 7 dager på rad." },
  { id: "conversation", emoji: "🗣️", title: "Første samtale", description: "Fullfør en samtale." },
  { id: "chatterbox", emoji: "🎙️", title: "Pratmaker", description: "Fullfør 10 samtaler." },
  { id: "review", emoji: "🔁", title: "Repetitør", description: "Fullfør en repetisjonsrunde." },
  { id: "module", emoji: "📚", title: "Ordjeger", description: "Fullfør en ordmodul." },
  { id: "daily-goal", emoji: "☀️", title: "Dagsmål", description: `Nå dagsmålet på ${DAILY_GOAL_XP} XP.` },
  { id: "level-5", emoji: "⭐", title: "Nivå 5", description: "Nå nivå 5." },
];

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function emptyState(): RewardState {
  return {
    xp: 0,
    xpToday: 0,
    day: todayKey(),
    badges: [],
    dailyGoalHits: 0,
    stats: { quizzes: 0, perfectQuizzes: 0, conversations: 0, reviews: 0, modules: 0, situations: [] },
  };
}

function read(): RewardState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as RewardState;
    const base = emptyState();
    const state = { ...base, ...parsed, stats: { ...base.stats, ...parsed.stats } };
    // A new day starts the daily goal over.
    return state.day === todayKey() ? state : { ...state, day: todayKey(), xpToday: 0 };
  } catch {
    return emptyState();
  }
}

function write(state: RewardState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full/blocked — progress just won't persist.
  }
}

// Each level takes a bit more XP than the last: 100, 125, 150, ...
function xpForNextLevel(level: number): number {
  return 75 + 25 * level;
}

export type LevelInfo = { level: number; intoLevel: number; levelSize: number };

export function levelFor(xp: number): LevelInfo {
  let level = 1;
  let remaining = xp;
  while (remaining >= xpForNextLevel(level)) {
    remaining -= xpForNextLevel(level);
    level += 1;
  }
  return { level, intoLevel: remaining, levelSize: xpForNextLevel(level) };
}

function xpFor(activity: RewardActivity): { xp: number; reason: string; perfect: boolean } {
  switch (activity.kind) {
    case "quiz": {
      const perfect = activity.total > 0 && activity.score === activity.total;
      return { xp: 5 + activity.score * 2 + (perfect ? 10 : 0), reason: perfect ? "Feilfri test!" : "Test fullført", perfect };
    }
    case "drill":
      return { xp: 10, reason: "Øving fullført", perfect: false };
    case "quick-prep":
      return { xp: 10, reason: "Klar for situasjonen", perfect: false };
    case "review":
      return { xp: 15, reason: "Repetisjon fullført", perfect: false };
    case "conversation":
      return { xp: 15 + activity.turns * 2, reason: "Samtale fullført", perfect: false };
    case "module":
      return { xp: 30, reason: "Modul fullført!", perfect: true };
  }
}

function earnedBadges(state: RewardState, level: number, streak: number): string[] {
  const s = state.stats;
  const earned: Record<string, boolean> = {
    "first-lesson": s.quizzes >= 1,
    perfect: s.perfectQuizzes >= 1,
    "perfect-5": s.perfectQuizzes >= 5,
    explorer: s.situations.length >= 5,
    "streak-3": streak >= 3,
    "streak-7": streak >= 7,
    conversation: s.conversations >= 1,
    chatterbox: s.conversations >= 10,
    review: s.reviews >= 1,
    module: s.modules >= 1,
    "daily-goal": state.dailyGoalHits >= 1,
    "level-5": level >= 5,
  };
  return BADGES.filter((b) => earned[b.id] && !state.badges.includes(b.id)).map((b) => b.id);
}

/** Records a finished activity: also counts it toward the streak. */
export function award(activity: RewardActivity, language?: string): RewardResult {
  const streak = streakStore.recordActivity().currentStreak;
  const state = read();
  const before = levelFor(state.xp).level;
  const { xp, reason, perfect } = xpFor(activity);

  const goalBefore = state.xpToday >= DAILY_GOAL_XP;
  state.xp += xp;
  state.xpToday += xp;
  const dailyGoalReached = !goalBefore && state.xpToday >= DAILY_GOAL_XP;
  if (dailyGoalReached) state.dailyGoalHits += 1;

  const s = state.stats;
  if (activity.kind === "quiz") {
    s.quizzes += 1;
    if (perfect) s.perfectQuizzes += 1;
    if (activity.situation && language) {
      const key = `${language}:${activity.situation}`;
      if (!s.situations.includes(key)) s.situations.push(key);
    }
  }
  if (activity.kind === "conversation") s.conversations += 1;
  if (activity.kind === "review") s.reviews += 1;
  if (activity.kind === "module") s.modules += 1;

  const after = levelFor(state.xp).level;
  const newIds = earnedBadges(state, after, streak);
  state.badges.push(...newIds);
  write(state);

  const result: RewardResult = {
    xpGained: xp,
    reason,
    perfect,
    levelUp: after > before ? after : null,
    dailyGoalReached,
    newBadges: BADGES.filter((b) => newIds.includes(b.id)),
  };
  window.dispatchEvent(new CustomEvent<RewardResult>(REWARD_EVENT, { detail: result }));
  return result;
}

export type RewardSummary = LevelInfo & {
  xp: number;
  xpToday: number;
  streak: number;
  unlocked: string[];
  stats: RewardStats;
};

export function rewardSummary(): RewardSummary {
  const state = read();
  return {
    ...levelFor(state.xp),
    xp: state.xp,
    xpToday: state.xpToday,
    streak: streakStore.get().currentStreak,
    unlocked: state.badges,
    stats: state.stats,
  };
}
