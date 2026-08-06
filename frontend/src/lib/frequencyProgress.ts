import type { Language } from "../types/lesson";
import { UNIT_SIZE } from "./frequency";

export type FrequencyProgress = {
  completedModules: number[];
  introSeen: boolean;
};

const EMPTY_PROGRESS: FrequencyProgress = {
  completedModules: [],
  introSeen: false,
};

const STORAGE_KEY = "pocket-phrases:frequency-progress";

// Same seam as ProgressStore/StreakStore: v1 is localStorage-only, swappable
// for a server-backed store later without touching callers.
export interface FrequencyProgressStore {
  isModuleUnlocked(language: Language, moduleIndex: number): boolean;
  isModuleCompleted(language: Language, moduleIndex: number): boolean;
  completeModule(language: Language, moduleIndex: number): void;
  // A unit (10 modules) is complete once every module in it is — derived
  // from module completion rather than stored separately.
  isUnitCompleted(language: Language, unitIndex: number): boolean;
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

  // Module 0 is always unlocked (content permitting); module N unlocks once
  // module N-1 has been cleared at 100%.
  isModuleUnlocked(language: Language, moduleIndex: number): boolean {
    if (moduleIndex === 0) return true;
    return this.get(language).completedModules.includes(moduleIndex - 1);
  }

  isModuleCompleted(language: Language, moduleIndex: number): boolean {
    return this.get(language).completedModules.includes(moduleIndex);
  }

  completeModule(language: Language, moduleIndex: number): void {
    const all = this.readAll();
    const current = all[language] ?? EMPTY_PROGRESS;
    if (current.completedModules.includes(moduleIndex)) return;
    all[language] = { ...current, completedModules: [...current.completedModules, moduleIndex] };
    this.writeAll(all);
  }

  isUnitCompleted(language: Language, unitIndex: number): boolean {
    const start = unitIndex * UNIT_SIZE;
    for (let moduleIndex = start; moduleIndex < start + UNIT_SIZE; moduleIndex++) {
      if (!this.isModuleCompleted(language, moduleIndex)) return false;
    }
    return true;
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
