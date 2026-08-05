import type { Language } from "../types/lesson";

export type FrequencyProgress = {
  completedBatches: number[];
  introSeen: boolean;
};

const EMPTY_PROGRESS: FrequencyProgress = {
  completedBatches: [],
  introSeen: false,
};

const STORAGE_KEY = "pocket-phrases:frequency-progress";

// Same seam as ProgressStore/StreakStore: v1 is localStorage-only, swappable
// for a server-backed store later without touching callers.
export interface FrequencyProgressStore {
  isBatchUnlocked(language: Language, batchIndex: number): boolean;
  isBatchCompleted(language: Language, batchIndex: number): boolean;
  completeBatch(language: Language, batchIndex: number): void;
  hasSeenIntro(language: Language): boolean;
  markIntroSeen(language: Language): void;
}

class LocalStorageFrequencyProgressStore implements FrequencyProgressStore {
  private readAll(): Record<string, FrequencyProgress> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Record<string, FrequencyProgress>) : {};
    } catch {
      return {};
    }
  }

  private writeAll(all: Record<string, FrequencyProgress>): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  private get(language: Language): FrequencyProgress {
    return this.readAll()[language] ?? EMPTY_PROGRESS;
  }

  // Batch 0 is always unlocked (content permitting); batch N unlocks once
  // batch N-1 has been cleared at 100%.
  isBatchUnlocked(language: Language, batchIndex: number): boolean {
    if (batchIndex === 0) return true;
    return this.get(language).completedBatches.includes(batchIndex - 1);
  }

  isBatchCompleted(language: Language, batchIndex: number): boolean {
    return this.get(language).completedBatches.includes(batchIndex);
  }

  completeBatch(language: Language, batchIndex: number): void {
    const all = this.readAll();
    const current = all[language] ?? EMPTY_PROGRESS;
    if (current.completedBatches.includes(batchIndex)) return;
    all[language] = { ...current, completedBatches: [...current.completedBatches, batchIndex] };
    this.writeAll(all);
  }

  hasSeenIntro(language: Language): boolean {
    return this.get(language).introSeen;
  }

  markIntroSeen(language: Language): void {
    const all = this.readAll();
    const current = all[language] ?? EMPTY_PROGRESS;
    all[language] = { ...current, introSeen: true };
    this.writeAll(all);
  }
}

export const frequencyProgressStore: FrequencyProgressStore = new LocalStorageFrequencyProgressStore();
