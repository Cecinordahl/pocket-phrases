export type StreakData = {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
};

const EMPTY_STREAK: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: null,
};

const STORAGE_KEY = "pocket-phrases:streak";

// Local calendar date as YYYY-MM-DD, not UTC — a streak should follow the
// user's own day boundary, not flip at UTC midnight mid-evening for them.
function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysSince(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  const then = new Date(y, m - 1, d).getTime();
  const [ty, tm, td] = todayKey().split("-").map(Number);
  const today = new Date(ty, tm - 1, td).getTime();
  return Math.round((today - then) / (24 * 60 * 60 * 1000));
}

// Seam: same pattern as ProgressStore — v1 is localStorage-only, swappable
// for a server-backed store later without touching callers.
export interface StreakStore {
  get(): StreakData;
  recordActivity(): StreakData;
}

class LocalStorageStreakStore implements StreakStore {
  get(): StreakData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as StreakData) : EMPTY_STREAK;
    } catch {
      return EMPTY_STREAK;
    }
  }

  recordActivity(): StreakData {
    const data = this.get();
    const today = todayKey();

    if (data.lastActiveDate === today) {
      return data;
    }

    const gap = data.lastActiveDate ? daysSince(data.lastActiveDate) : null;
    const currentStreak = gap === 1 ? data.currentStreak + 1 : 1;
    const longestStreak = Math.max(data.longestStreak, currentStreak);

    const updated: StreakData = { currentStreak, longestStreak, lastActiveDate: today };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  }
}

export const streakStore: StreakStore = new LocalStorageStreakStore();
