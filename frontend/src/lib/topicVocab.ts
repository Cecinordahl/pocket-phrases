import type { Language, Phrase } from "../types/lesson";
import touristFr from "../data/tourist-fr.json";

// A themed vocab set (e.g. "words tourists need") — sibling to the
// frequency-ranked journey in frequency.ts, but curated by topic rather
// than by raw frequency, and with no milestone structure since a topic
// list is never going to reach thousands of words.
export type TopicWord = {
  order: number;
  target: string;
  native: string;
  pronunciation: string;
};

export type TopicId = "tourist";

export const TOPICS: Record<TopicId, { title: string; description: string }> = {
  tourist: {
    title: "Turist-ord",
    description:
      "Ord du ofte trenger som turist — severdigheter, billetter, bagasje og veibeskrivelser.",
  },
};

// One JSON file per topic per language, same growth pattern as frequency-fr.json.
const TOPIC_WORD_LISTS: Record<TopicId, Partial<Record<Language, TopicWord[]>>> = {
  tourist: { fr: touristFr as TopicWord[] },
};

export const TOPIC_MODULE_SIZE = 10;

export type TopicModule = {
  index: number;
  words: TopicWord[];
};

function getWordList(topic: TopicId, language: Language): TopicWord[] {
  return TOPIC_WORD_LISTS[topic][language] ?? [];
}

export function getTopicWordCount(topic: TopicId, language: Language): number {
  return getWordList(topic, language).length;
}

// Only whole modules are playable, same "no short trailing chunk" rule as
// the frequency journey.
export function getTopicModules(topic: TopicId, language: Language): TopicModule[] {
  const words = getWordList(topic, language);
  const fullModuleCount = Math.floor(words.length / TOPIC_MODULE_SIZE);
  return Array.from({ length: fullModuleCount }, (_, index) => ({
    index,
    words: words.slice(index * TOPIC_MODULE_SIZE, (index + 1) * TOPIC_MODULE_SIZE),
  }));
}

export function getTopicModule(topic: TopicId, language: Language, moduleIndex: number): TopicModule | null {
  return getTopicModules(topic, language)[moduleIndex] ?? null;
}

export function toTopicPhrase(word: TopicWord, language: Language, topic: TopicId): Phrase {
  return {
    id: `topic:${topic}:${language}:${word.order}`,
    target: word.target,
    pronunciation: word.pronunciation,
    native: word.native,
    category: "annet",
    icon: "general",
  };
}
