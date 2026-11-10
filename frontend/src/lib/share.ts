import type { Language, Lesson, ModeInfo, Phrase, PhraseCategory, PhraseIcon } from "../types/lesson";

// Travel buddy sharing with no accounts and no server: the whole lesson or
// trip is compressed into the link itself (#share=...). The hash never
// reaches the server, so nothing about it is logged anywhere.

export type SharedTrip = {
  language: Language;
  destination: string;
  departureDate: string;
  modes: ModeInfo[];
};

export type SharePayload =
  | { v: 1; kind: "lesson"; lesson: Lesson }
  | { v: 1; kind: "trip"; trip: SharedTrip };

const HASH_KEY = "share=";
const LANGUAGES: Language[] = ["es", "fr", "de"];
// A generous cap so a hand-crafted link can't make us inflate something huge.
const MAX_ENCODED_LENGTH = 20_000;
const MAX_PHRASES = 20;
const MAX_MODES = 20;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function pipe(bytes: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream): Promise<Uint8Array<ArrayBuffer>> {
  const out = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

export async function encodeShare(payload: SharePayload): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(payload));
  return toBase64Url(await pipe(json, new CompressionStream("deflate-raw")));
}

export async function buildShareUrl(payload: SharePayload): Promise<string> {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#${HASH_KEY}${await encodeShare(payload)}`;
}

const isString = (v: unknown, max = 500): v is string => typeof v === "string" && v.length <= max;

function validPhrase(p: unknown): Phrase | null {
  if (typeof p !== "object" || p === null) return null;
  const o = p as Record<string, unknown>;
  if (!isString(o.id, 200) || !isString(o.target) || !isString(o.pronunciation) || !isString(o.native)) return null;
  return {
    id: o.id,
    target: o.target,
    pronunciation: o.pronunciation,
    native: o.native,
    // Unknown values are harmless: the UI's category/icon lookups fall back to defaults.
    category: (isString(o.category, 50) ? o.category : "annet") as PhraseCategory,
    icon: (isString(o.icon, 50) ? o.icon : "general") as PhraseIcon,
  };
}

/** Shared links come from other people, so treat them as untrusted and rebuild only known fields. */
function validate(data: unknown): SharePayload | null {
  if (typeof data !== "object" || data === null) return null;
  const d = data as Record<string, unknown>;
  if (d.v !== 1) return null;

  if (d.kind === "lesson" && typeof d.lesson === "object" && d.lesson !== null) {
    const l = d.lesson as Record<string, unknown>;
    if (!isString(l.title, 200) || !isString(l.mode, 100) || !LANGUAGES.includes(l.language as Language)) return null;
    if (!Array.isArray(l.phrases) || l.phrases.length === 0 || l.phrases.length > MAX_PHRASES) return null;
    const phrases = l.phrases.map(validPhrase);
    if (phrases.some((p) => p === null)) return null;
    return {
      v: 1,
      kind: "lesson",
      lesson: { title: l.title, language: l.language as Language, mode: l.mode, phrases: phrases as Phrase[] },
    };
  }

  if (d.kind === "trip" && typeof d.trip === "object" && d.trip !== null) {
    const t = d.trip as Record<string, unknown>;
    if (!LANGUAGES.includes(t.language as Language)) return null;
    if (!isString(t.destination, 60) || !isString(t.departureDate, 10) || !/^\d{4}-\d{2}-\d{2}$/.test(t.departureDate)) return null;
    if (!Array.isArray(t.modes) || t.modes.length === 0 || t.modes.length > MAX_MODES) return null;
    const modes = t.modes.map((m: unknown) => {
      const o = (m ?? {}) as Record<string, unknown>;
      return isString(o.key, 100) && isString(o.title, 200) ? { key: o.key, title: o.title } : null;
    });
    if (modes.some((m) => m === null)) return null;
    return {
      v: 1,
      kind: "trip",
      trip: {
        language: t.language as Language,
        destination: t.destination,
        departureDate: t.departureDate,
        modes: modes as ModeInfo[],
      },
    };
  }

  return null;
}

export async function decodeShare(encoded: string): Promise<SharePayload | null> {
  if (encoded.length > MAX_ENCODED_LENGTH) return null;
  try {
    const bytes = await pipe(fromBase64Url(encoded), new DecompressionStream("deflate-raw"));
    return validate(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}

/** Reads a share link from the current URL (if any) and removes it, so a reload doesn't re-import it. */
export async function consumeShareFromLocation(): Promise<SharePayload | null | "invalid"> {
  const hash = window.location.hash.slice(1);
  if (!hash.startsWith(HASH_KEY)) return null;
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  return (await decodeShare(hash.slice(HASH_KEY.length))) ?? "invalid";
}
