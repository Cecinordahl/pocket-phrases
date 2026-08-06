import type { Language, Phrase } from "../types/lesson";
import frequencyFr from "../data/frequency-fr.json";

export type FrequencyWord = {
  rank: number;
  target: string;
  native: string;
  pronunciation: string;
};

// One JSON file per language, grown incrementally (100 words at a time) as
// content gets curated in later sessions. Missing languages just have no
// entries yet — everything downstream treats that as "no milestones ready".
const WORD_LISTS: Partial<Record<Language, FrequencyWord[]>> = {
  fr: frequencyFr as FrequencyWord[],
};

// Milestones are cumulative word counts, not per-milestone chunks — reaching
// "milestone 500" means 500 words learned in total since the start (i.e. 5
// units), not 500 new words on top of milestone 100.
export const MILESTONES = [100, 500, 1000, 1500, 2000, 2500, 3000] as const;

// The smallest gated quiz round.
export const MODULE_SIZE = 10;

// A unit groups 10 modules into a 100-word checkpoint — the level review
// tests operate on. Divides evenly into every milestone above.
export const UNIT_SIZE = 10;

export type Module = {
  index: number;
  words: FrequencyWord[];
};

export type Unit = {
  index: number;
  modules: Module[];
};

export type MilestoneTier = {
  threshold: number;
  // Cumulative unit count required to reach this milestone (threshold / 100).
  unitCount: number;
};

// Which words a review test (pure practice, no gating) should draw from.
export type VocabReviewScope = { type: "unit"; unitIndex: number } | { type: "all" };

function getWordList(language: Language): FrequencyWord[] {
  return WORD_LISTS[language] ?? [];
}

export function getWordCount(language: Language): number {
  return getWordList(language).length;
}

// Only whole modules are playable — a trailing partial chunk (content
// fetched but not yet a full 10) is held back rather than shown short.
export function getModules(language: Language): Module[] {
  const words = getWordList(language);
  const fullModuleCount = Math.floor(words.length / MODULE_SIZE);
  return Array.from({ length: fullModuleCount }, (_, index) => ({
    index,
    words: words.slice(index * MODULE_SIZE, (index + 1) * MODULE_SIZE),
  }));
}

export function getModule(language: Language, moduleIndex: number): Module | null {
  return getModules(language)[moduleIndex] ?? null;
}

// Same "whole chunks only" rule one level up: a unit only appears once all
// 10 of its modules have real word data.
export function getUnits(language: Language): Unit[] {
  const modules = getModules(language);
  const fullUnitCount = Math.floor(modules.length / UNIT_SIZE);
  return Array.from({ length: fullUnitCount }, (_, index) => ({
    index,
    modules: modules.slice(index * UNIT_SIZE, (index + 1) * UNIT_SIZE),
  }));
}

export function getUnit(language: Language, unitIndex: number): Unit | null {
  return getUnits(language)[unitIndex] ?? null;
}

export function unitWords(unit: Unit): FrequencyWord[] {
  return unit.modules.flatMap((m) => m.words);
}

export function isMilestoneContentReady(language: Language, threshold: number): boolean {
  return getWordCount(language) >= threshold;
}

export function getMilestoneTiers(): MilestoneTier[] {
  return MILESTONES.map((threshold) => ({ threshold, unitCount: threshold / 100 }));
}

// Frequency words have no situational category/icon of their own — "annet"
// (other) / "general" are the generic entries in the closed PhraseCategory/
// PhraseIcon enums, used here as a catch-all.
export function toPhrase(word: FrequencyWord, language: Language): Phrase {
  return {
    id: `freq:${language}:${word.rank}`,
    target: word.target,
    pronunciation: word.pronunciation,
    native: word.native,
    category: "annet",
    icon: "general",
  };
}
