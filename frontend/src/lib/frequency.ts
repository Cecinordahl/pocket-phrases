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

export const MILESTONES = [100, 500, 1000, 1500, 2000, 2500, 3000] as const;

// Divides evenly into every milestone above, so a milestone always lands on
// a whole number of batches.
export const BATCH_SIZE = 20;

export type Batch = {
  index: number;
  words: FrequencyWord[];
};

export type MilestoneTier = {
  threshold: number;
  // Batch index range this milestone spans: [batchStart, batchEnd).
  batchStart: number;
  batchEnd: number;
};

function getWordList(language: Language): FrequencyWord[] {
  return WORD_LISTS[language] ?? [];
}

export function getWordCount(language: Language): number {
  return getWordList(language).length;
}

// Only whole batches are playable — a trailing partial chunk (content
// fetched but not yet a full 20) is held back rather than shown short.
export function getBatches(language: Language): Batch[] {
  const words = getWordList(language);
  const fullBatchCount = Math.floor(words.length / BATCH_SIZE);
  return Array.from({ length: fullBatchCount }, (_, index) => ({
    index,
    words: words.slice(index * BATCH_SIZE, (index + 1) * BATCH_SIZE),
  }));
}

export function getBatch(language: Language, batchIndex: number): Batch | null {
  return getBatches(language)[batchIndex] ?? null;
}

export function isMilestoneContentReady(language: Language, threshold: number): boolean {
  return getWordCount(language) >= threshold;
}

export function getMilestoneTiers(): MilestoneTier[] {
  let prevThreshold = 0;
  return MILESTONES.map((threshold) => {
    const tier: MilestoneTier = {
      threshold,
      batchStart: prevThreshold / BATCH_SIZE,
      batchEnd: threshold / BATCH_SIZE,
    };
    prevThreshold = threshold;
    return tier;
  });
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
