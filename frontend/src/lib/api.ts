import type { Language, Lesson, ModeInfo } from "../types/lesson";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
const EMAIL_STORAGE_KEY = "pocket-phrases:user-email";

export class AccessDeniedError extends Error {
  constructor() {
    super("Denne appen er foreløpig kun tilgjengelig for inviterte brukere.");
    this.name = "AccessDeniedError";
  }
}

export function getStoredEmail(): string | null {
  return localStorage.getItem(EMAIL_STORAGE_KEY);
}

export function storeEmail(email: string): void {
  localStorage.setItem(EMAIL_STORAGE_KEY, email);
}

function authHeaders(): HeadersInit {
  const email = getStoredEmail();
  return email ? { "X-User-Email": email } : {};
}

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 403) {
    throw new AccessDeniedError();
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? `Forespørselen feilet (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function fetchModes(): Promise<ModeInfo[]> {
  const res = await fetch(`${BASE_URL}/api/modes`, { headers: authHeaders() });
  return handle<ModeInfo[]>(res);
}

export async function fetchPrebuiltLesson(language: Language, mode: string): Promise<Lesson> {
  const params = new URLSearchParams({ language, mode });
  const res = await fetch(`${BASE_URL}/api/lessons/prebuilt?${params}`, { headers: authHeaders() });
  return handle<Lesson>(res);
}

export async function fetchRandomLesson(language: Language): Promise<Lesson> {
  const params = new URLSearchParams({ language });
  const res = await fetch(`${BASE_URL}/api/lessons/random?${params}`, { headers: authHeaders() });
  return handle<Lesson>(res);
}

export async function generateLesson(language: Language, situation: string): Promise<Lesson> {
  const res = await fetch(`${BASE_URL}/api/lessons/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ language, situation }),
  });
  return handle<Lesson>(res);
}
