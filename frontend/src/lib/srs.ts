import type { Phrase } from "../types/lesson";

// SM-2 style spaced repetition, scoped to what the app's architecture can
// actually support today: lessons are a fresh, randomly-sampled subset of a
// pool on every fetch (see backend PhrasePoolService) rather than a fixed
// per-user deck, so there is no server-side concept of "your due cards".
// Instead: every phrase the user ever sees gets a schedule entry here
// (localStorage, keyed by the phrase's stable id), and whenever a lesson's
// phrase set is handed to Drill or Quiz, it's reordered so the most-overdue
// phrases in *that* set come first. A phrase marked wrong resurfaces with a
// short interval (1 day) and low priority reset; a phrase marked correct
// gets a longer interval before it's "due" again. This is a real, working
// implementation of the core SM-2 loop — the gap from "true" Anki-style SRS
// is that it can only prioritize among whatever phrases a given lesson
// happens to sample, not resurface a specific overdue phrase on demand.
//
// Standard SM-2 takes a 0–5 quality score per review; this app only has a
// binary correct/wrong signal (a quiz answer, or a drill self-rating), so
// that's mapped to quality 4 (correct) or quality 1 (wrong) — comfortably
// on either side of SM-2's "quality < 3 resets the schedule" threshold.

export type SrsEntry = {
  repetitions: number;
  easinessFactor: number;
  intervalDays: number;
  dueAt: string; // ISO timestamp
  lastReviewedAt: string | null;
};

const STORAGE_KEY = "pocket-phrases:srs";
const MIN_EASINESS = 1.3;
const DEFAULT_EASINESS = 2.5;

function freshEntry(): SrsEntry {
  return {
    repetitions: 0,
    easinessFactor: DEFAULT_EASINESS,
    intervalDays: 0,
    dueAt: new Date(0).toISOString(), // never reviewed = immediately due
    lastReviewedAt: null,
  };
}

function readAll(): Record<string, SrsEntry> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, SrsEntry>) : {};
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, SrsEntry>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function getEntry(phraseId: string): SrsEntry {
  return readAll()[phraseId] ?? freshEntry();
}

/** quality: SM-2's 0-5 scale. Correct answers should pass 4, wrong answers 1. */
function nextEntry(entry: SrsEntry, quality: number): SrsEntry {
  let { repetitions, easinessFactor, intervalDays } = entry;

  if (quality < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    if (repetitions === 0) {
      intervalDays = 1;
    } else if (repetitions === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(intervalDays * easinessFactor);
    }
    repetitions += 1;
  }

  easinessFactor = Math.max(
    MIN_EASINESS,
    easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  const now = new Date();
  const dueAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

  return {
    repetitions,
    easinessFactor,
    intervalDays,
    dueAt: dueAt.toISOString(),
    lastReviewedAt: now.toISOString(),
  };
}

export function recordReview(phraseId: string, correct: boolean): SrsEntry {
  const all = readAll();
  const current = all[phraseId] ?? freshEntry();
  const updated = nextEntry(current, correct ? 4 : 1);
  all[phraseId] = updated;
  writeAll(all);
  return updated;
}

/** Most-overdue first. Never-reviewed phrases count as maximally overdue. */
export function sortByDue<T extends Phrase>(phrases: T[]): T[] {
  const all = readAll();
  return [...phrases].sort((a, b) => {
    const dueA = new Date(all[a.id]?.dueAt ?? 0).getTime();
    const dueB = new Date(all[b.id]?.dueAt ?? 0).getTime();
    return dueA - dueB;
  });
}
