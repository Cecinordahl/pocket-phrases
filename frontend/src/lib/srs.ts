import type { Language, Phrase } from "../types/lesson";

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
//
// Repetition deck: when a review is recorded with a language, the entry also
// keeps a snapshot of the phrase itself. That's what lets "🔁 Repetisjon"
// resurface due phrases on demand, across every lesson and vocab module —
// closing the gap described above for anything the user has seen at least once.

export type SrsEntry = {
  repetitions: number;
  easinessFactor: number;
  intervalDays: number;
  dueAt: string; // ISO timestamp
  lastReviewedAt: string | null;
  // Only set when the review was recorded with a language (see recordReview).
  language?: Language;
  phrase?: Phrase;
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Storage full/blocked — scheduling just won't persist this time.
  }
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

export function recordReview(phrase: Phrase, correct: boolean, language?: Language): SrsEntry {
  const all = readAll();
  const current = all[phrase.id] ?? freshEntry();
  const updated: SrsEntry = {
    ...nextEntry(current, correct ? 4 : 1),
    // Keep (or refresh) the snapshot so the phrase can come back in the repetition deck.
    language: language ?? current.language,
    phrase: language ? phrase : current.phrase,
  };
  all[phrase.id] = updated;
  writeAll(all);
  return updated;
}

type DeckEntry = SrsEntry & { phrase: Phrase; language: Language };

function dueEntries(language: Language, now = Date.now()): DeckEntry[] {
  return Object.values(readAll()).filter(
    (e): e is DeckEntry => e.language === language && !!e.phrase && new Date(e.dueAt).getTime() <= now,
  );
}

/** "Weak" = the last answer was wrong (SM-2 reset repetitions to 0). */
function isWeak(entry: SrsEntry): boolean {
  return entry.repetitions === 0 && entry.lastReviewedAt !== null;
}

export type DueSummary = { due: number; weak: number };

export function dueSummary(language: Language): DueSummary {
  const due = dueEntries(language);
  return { due: due.length, weak: due.filter(isWeak).length };
}

/** Phrases due for repetition: ones you got wrong first, then most overdue. */
export function getDuePhrases(language: Language, limit: number): Phrase[] {
  return dueEntries(language)
    .sort((a, b) => {
      const weakDiff = Number(isWeak(b)) - Number(isWeak(a));
      if (weakDiff !== 0) return weakDiff;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    })
    .slice(0, limit)
    .map((e) => e.phrase);
}

/** How many tracked phrases become due by the end of tomorrow — for the "come back" message. */
export function dueTomorrowCount(language: Language): number {
  const endOfTomorrow = new Date();
  endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);
  endOfTomorrow.setHours(23, 59, 59, 999);
  return dueEntries(language, endOfTomorrow.getTime()).length;
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
