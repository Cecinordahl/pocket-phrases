export type ModeProgress = {
  read: boolean;
  drilled: boolean;
  quizzed: boolean;
  lastQuizScore: number | null;
};

const EMPTY_PROGRESS: ModeProgress = {
  read: false,
  drilled: false,
  quizzed: false,
  lastQuizScore: null,
};

// Seam: the app talks to progress only through this interface. v1 backs it
// with localStorage (no accounts). Swapping to a server-backed account store
// later means writing one new class against this interface — no UI changes.
export interface ProgressStore {
  get(language: string, mode: string): ModeProgress;
  markRead(language: string, mode: string): void;
  markDrilled(language: string, mode: string): void;
  markQuizzed(language: string, mode: string, score: number): void;
}

const STORAGE_KEY = "pocket-phrases:progress";

class LocalStorageProgressStore implements ProgressStore {
  private key(language: string, mode: string): string {
    return `${language}:${mode}`;
  }

  private readAll(): Record<string, ModeProgress> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Record<string, ModeProgress>) : {};
    } catch {
      return {};
    }
  }

  private writeAll(all: Record<string, ModeProgress>): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  get(language: string, mode: string): ModeProgress {
    const all = this.readAll();
    return all[this.key(language, mode)] ?? EMPTY_PROGRESS;
  }

  markRead(language: string, mode: string): void {
    const all = this.readAll();
    const k = this.key(language, mode);
    all[k] = { ...(all[k] ?? EMPTY_PROGRESS), read: true };
    this.writeAll(all);
  }

  markDrilled(language: string, mode: string): void {
    const all = this.readAll();
    const k = this.key(language, mode);
    all[k] = { ...(all[k] ?? EMPTY_PROGRESS), drilled: true };
    this.writeAll(all);
  }

  markQuizzed(language: string, mode: string, score: number): void {
    const all = this.readAll();
    const k = this.key(language, mode);
    all[k] = { ...(all[k] ?? EMPTY_PROGRESS), quizzed: true, lastQuizScore: score };
    this.writeAll(all);
  }
}

export const progressStore: ProgressStore = new LocalStorageProgressStore();
