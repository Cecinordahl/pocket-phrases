import type { Language } from "../types/lesson";
import type { TopicId } from "./topicVocab";

export type TopicProgress = {
  completedModules: number[];
};

const EMPTY_PROGRESS: TopicProgress = { completedModules: [] };

const STORAGE_KEY = "pocket-phrases:topic-progress";

function progressKey(topic: TopicId, language: Language): string {
  return `${topic}:${language}`;
}

// Same localStorage-behind-an-interface seam as frequencyProgressStore —
// v1 is localStorage-only, swappable for a server-backed store later
// without touching callers.
export interface TopicProgressStore {
  isModuleUnlocked(topic: TopicId, language: Language, moduleIndex: number): boolean;
  isModuleCompleted(topic: TopicId, language: Language, moduleIndex: number): boolean;
  completeModule(topic: TopicId, language: Language, moduleIndex: number): void;
}

class LocalStorageTopicProgressStore implements TopicProgressStore {
  private readAll(): Record<string, TopicProgress> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Record<string, TopicProgress>) : {};
    } catch {
      return {};
    }
  }

  private writeAll(all: Record<string, TopicProgress>): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  private get(topic: TopicId, language: Language): TopicProgress {
    return this.readAll()[progressKey(topic, language)] ?? EMPTY_PROGRESS;
  }

  isModuleUnlocked(topic: TopicId, language: Language, moduleIndex: number): boolean {
    if (moduleIndex === 0) return true;
    return this.get(topic, language).completedModules.includes(moduleIndex - 1);
  }

  isModuleCompleted(topic: TopicId, language: Language, moduleIndex: number): boolean {
    return this.get(topic, language).completedModules.includes(moduleIndex);
  }

  completeModule(topic: TopicId, language: Language, moduleIndex: number): void {
    const all = this.readAll();
    const key = progressKey(topic, language);
    const current = all[key] ?? EMPTY_PROGRESS;
    if (current.completedModules.includes(moduleIndex)) return;
    all[key] = { completedModules: [...current.completedModules, moduleIndex] };
    this.writeAll(all);
  }
}

export const topicProgressStore: TopicProgressStore = new LocalStorageTopicProgressStore();
