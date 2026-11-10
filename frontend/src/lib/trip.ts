import type { Language, ModeInfo } from "../types/lesson";

// One upcoming trip per language. The plan itself is never stored — it's
// recomputed from "what's left" and "days left" every time, so a skipped
// day simply reflows the remaining situations over the days that remain.
export type Trip = {
  language: Language;
  destination: string;
  departureDate: string; // local YYYY-MM-DD
  modes: ModeInfo[]; // situations to prepare, in priority order
  completed: string[]; // mode keys quizzed since the trip was created
};

/** Mode key used for the final "dress rehearsal" day (a random mix). */
export const REHEARSAL_KEY = "random";

export type PlanDay = {
  date: string; // local YYYY-MM-DD
  offset: number; // 0 = today
  modes: ModeInfo[];
  rehearsal: boolean;
};

const STORAGE_KEY = "pocket-phrases:trips";

// Local calendar dates, not UTC — same reasoning as the streak store.
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): string {
  return dateKey(new Date());
}

/** Whole days from today until departure (0 = leaving today, negative = already left). */
export function daysUntil(departureDate: string): number {
  const today = parseKey(todayKey()).getTime();
  return Math.round((parseKey(departureDate).getTime() - today) / (24 * 60 * 60 * 1000));
}

function addDays(key: string, n: number): string {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

/**
 * Spreads the not-yet-completed situations over the days before departure.
 * Prep days are today up to (not including) departure day; if there are at
 * least two, the last one is kept for a rehearsal with a random mix.
 */
export function buildPlan(trip: Trip): PlanDay[] {
  const left = daysUntil(trip.departureDate);
  if (left < 0) return [];

  const prepDays = Math.max(1, left);
  const hasRehearsal = prepDays >= 2;
  const studyDays = hasRehearsal ? prepDays - 1 : prepDays;
  const remaining = trip.modes.filter((m) => !trip.completed.includes(m.key));
  const today = todayKey();

  // Even split (e.g. 6 situations over 4 days -> 2, 1, 2, 1) so the load is
  // spread out, always starting today; days with nothing are skipped.
  const n = remaining.length;
  const plan: PlanDay[] = [];
  for (let i = 0; i < studyDays; i++) {
    const modes = remaining.slice(Math.ceil((i * n) / studyDays), Math.ceil(((i + 1) * n) / studyDays));
    if (modes.length === 0) continue;
    plan.push({ date: addDays(today, i), offset: i, modes, rehearsal: false });
  }
  if (hasRehearsal) {
    const offset = prepDays - 1;
    plan.push({ date: addDays(today, offset), offset, modes: [], rehearsal: true });
  }
  return plan;
}

export function dayLabel(day: PlanDay): string {
  if (day.offset === 0) return "I dag";
  if (day.offset === 1) return "I morgen";
  return parseKey(day.date).toLocaleDateString("nb-NO", { weekday: "long", day: "numeric", month: "short" });
}

// Seam: same pattern as ProgressStore / StreakStore.
export interface TripStore {
  get(language: Language): Trip | null;
  save(trip: Trip): void;
  remove(language: Language): void;
  markCompleted(language: Language, modeKey: string): void;
}

class LocalStorageTripStore implements TripStore {
  private readAll(): Partial<Record<Language, Trip>> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Partial<Record<Language, Trip>>) : {};
    } catch {
      return {};
    }
  }

  private writeAll(all: Partial<Record<Language, Trip>>): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch {
      // Storage full/blocked — the plan just won't persist.
    }
  }

  get(language: Language): Trip | null {
    return this.readAll()[language] ?? null;
  }

  save(trip: Trip): void {
    const all = this.readAll();
    all[trip.language] = trip;
    this.writeAll(all);
  }

  remove(language: Language): void {
    const all = this.readAll();
    delete all[language];
    this.writeAll(all);
  }

  /** No-op unless a trip exists and the mode is part of it (or the rehearsal). */
  markCompleted(language: Language, modeKey: string): void {
    const trip = this.get(language);
    if (!trip || trip.completed.includes(modeKey)) return;
    const inTrip = modeKey === REHEARSAL_KEY || trip.modes.some((m) => m.key === modeKey);
    if (!inTrip) return;
    this.save({ ...trip, completed: [...trip.completed, modeKey] });
  }
}

export const tripStore: TripStore = new LocalStorageTripStore();
