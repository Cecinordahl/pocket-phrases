# Pocket Phrases

A lightweight, situation-based travel language learner. 
Pick a language, pick (or describe) the situation you're about to be in, and get a short lesson you can work through three ways: **Les** (read), **Øv** (flashcard drill), **Test** (quiz).

Supports Spanish, French, and German, with a Norwegian Bokmål UI. 
No accounts.

**Live:** [pocket-phrases.cnordahl.com](https://pocket-phrases.cnordahl.com)

## Features

| Feature | What it does | AI? |
|---|---|---|
| **Prebuilt situations** | 7 situations (restaurant, transport, emergency/pharmacy …) → 6 phrases → Les / Øv / Test | No |
| **🎲 Tilfeldig** | A random mix across all situations | No |
| **Beskriv situasjonen** | Describe any situation in free text → a generated lesson | Yes |
| **⚡ Her og nå** | 2-minute refresh of the 5 phrases you need for a situation you're in right now, then a large-text cheat sheet | No |
| **🧳 Reiseplan** | Destination + departure date → a day-by-day plan that reflows if you skip a day, with a "generalprøve" the last day | No |
| **🗣️ Øv på en samtale** | Roleplay with an AI waiter/receptionist/driver, with hints and gentle corrections (max 8 replies) | Yes |
| **📚 Ordforråd-reisen** | Most-frequent words, milestone by milestone, with module quizzes and review tests (French prototype) | No |
| **🧳 Turistord** | Themed tourist vocabulary with module quizzes (French prototype) | No |

All progress (lessons, spaced repetition, streak, trip plan) lives in the browser's `localStorage`.

## Repo layout

```
pocket-phrases/
├── backend/          Spring Boot (Java 21) — thin proxy + prebuilt content
│   ├── src/main/java/com/pocketphrases/
│   │   ├── lesson/       shared Lesson/Phrase model
│   │   ├── phrasepool/   prebuilt lessons (sampled from a local JSON seed pool)
│   │   ├── generate/     free-text -> Anthropic -> Lesson; shared AnthropicConfig (client + model)
│   │   ├── roleplay/     stateless AI roleplay turns + per-IP rate limiter
│   │   ├── access/       optional Firestore email whitelist gate
│   │   └── config/       CORS
│   └── src/main/resources/seed/phrase-pools.json
├── frontend/          React + TypeScript (Vite)
│   └── src/
│       ├── types/lesson.ts   mirrors the backend Lesson/Phrase shape
│       ├── lib/api.ts        fetch wrapper for the backend
│       ├── lib/progress.ts   localStorage progress, behind a ProgressStore seam
│       ├── lib/trip.ts       trip plan storage + day-by-day plan logic
│       ├── lib/srs.ts        spaced repetition (most-overdue phrases first)
│       └── screens/          LanguagePicker -> ModePicker -> LessonScreen, plus
│                             QuickPrep ("Her og nå"), TripSetup/TripPlan, Roleplay, vocab journeys
├── render.yaml        legacy Render blueprint (no longer used, see Deploy)
└── .gitignore
```

## The shared "lesson" abstraction

A **lesson** is one shape everywhere in the app:

```ts
type Phrase = { target: string; pronunciation: string; native: string };
type Lesson = { title: string; language: "es" | "fr" | "de"; mode: string; phrases: Phrase[] };
```

It doesn't matter whether a lesson came from the local seed pool, the Anthropic free-text endpoint, or the "Tilfeldig" shuffle — the backend always returns this shape, and the frontend's Les/Øv/Test screens only ever render this shape. This is the seam that let prebuilt content, AI-generated content, and random mixes all use identical UI code.

## How backend and frontend talk to each other

The frontend calls the backend over plain REST under `/api`:

| Method | Path | What it does |
|---|---|---|
| GET | `/api/modes` | List of the 7 prebuilt mode keys + Norwegian titles |
| GET | `/api/lessons/prebuilt?language=es&mode=restaurant` | Samples 6 phrases from a pool of ~10, shuffled |
| GET | `/api/lessons/random?language=es` | Samples 6 phrases across all modes |
| POST | `/api/lessons/generate` `{ situation, language }` | Calls Anthropic (`claude-haiku-5-5`) to build a lesson from free text |
| POST | `/api/roleplay/turn` | One roleplay turn. Stateless: body `{ language, scenario, history[] }`, returns `{ reply, replyNorwegian, correction, hints, done }`. Max 8 user turns per chat, 60 turns/hour per IP |

The backend is the only thing that ever talks to Anthropic or Firestore — the Anthropic API key and Firebase credentials never reach the frontend or the repo.

## Run it locally

### Backend

```sh
cd backend
export ANTHROPIC_API_KEY=sk-ant-...   # optional locally — only needed for the AI features
./gradlew bootRun
```

Runs on `http://localhost:8080`. Spring Boot reads OS environment variables, not `.env` files — `backend/.env.example` lists what you can set (export them, or put them in your IDE run configuration).

Without an Anthropic key, everything works except the two AI features: "Beskriv situasjonen" falls back to a prebuilt lesson (see "Judgment calls" below), and roleplay shows "Fikk ikke svar akkurat nå".

Run the tests with `./gradlew test`.

### Frontend

```sh
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173` and talks to `http://localhost:8080` by default. To point at a different backend, copy `frontend/.env.example` to `.env` and set `VITE_API_BASE_URL`.

Click through: language picker → mode picker (7 prebuilt cards, "Beskriv situasjonen" free-text box, "🎲 Tilfeldig") → lesson with Les/Øv/Test tabs.

## Deploy

Self-hosted on a private server with [Coolify](https://coolify.io), exposed to the internet through a **Cloudflare tunnel** (no open ports on the server).

| Part | Where | URL |
|---|---|---|
| Frontend | Coolify (static Vite build) | `https://pocket-phrases.cnordahl.com` |
| Backend | Coolify (Docker, `backend/Dockerfile`) | `https://pocket-phrases-api.cnordahl.com` |
| Firestore | Firebase Spark (free) | only used by the optional whitelist gate |

### Backend in Coolify

1. New resource → your Git repo, build pack **Dockerfile**, base directory `/backend` (uses `backend/Dockerfile`), port `8080`.
2. Set environment variables (see the table below): at minimum `ANTHROPIC_API_KEY` and `APP_CORS_ALLOWED_ORIGINS=https://pocket-phrases.cnordahl.com`.
3. Turn on **Auto Deploy** and set **Watch Paths** to `backend/**`, so pushes that touch the backend redeploy it.

### Frontend in Coolify

1. New resource → same repo, base directory `/frontend`, build command `npm run build`, publish directory `dist` (static site).
2. Set `VITE_API_BASE_URL=https://pocket-phrases-api.cnordahl.com`. It's baked in at **build** time, so redeploy after changing it.
3. Turn on **Auto Deploy** with **Watch Paths** `frontend/**`.

### Cloudflare tunnel

Add one public hostname per app in the tunnel (Zero Trust → Networks → Tunnels), pointing at Coolify's proxy on the server. Cloudflare sets `CF-Connecting-IP` to the real client IP, and the roleplay rate limiter relies on it.

> ⚠️ **Frontend and backend deploy separately.** If a new frontend feature gets a **404** from the API, the backend hasn't been redeployed yet. Check the backend's Deployments tab in Coolify (and its Watch Paths).

### Firestore (Firebase Spark / free plan)

Only needed if you turn on the whitelist gate:

1. Create a Firebase project (Spark plan is free) and enable Firestore (Native mode).
2. Project settings → **Service accounts** → **Generate new private key** — downloads a JSON file.
3. In Coolify, set `FIREBASE_SERVICE_ACCOUNT_JSON` on the backend to the full contents of that file, pasted as one line.
4. In Firestore, create a `whitelist` collection; add one document per allowed user with an `email` field, e.g. `{ "email": "you@example.com" }`.
5. Set `APP_ACCESS_WHITELIST_ENABLED=true` on the backend in Coolify and redeploy. The frontend will now prompt for an email the first time it gets a 403, store it locally, and send it as `X-User-Email` on every request.

## Environment variables

| Variable | Where | Required | Purpose |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | backend | For the AI features | Calls Claude Haiku 5.5 for "Beskriv situasjonen" and roleplay |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | backend | Only if whitelist enabled | Firestore credentials for the email whitelist |
| `APP_ACCESS_WHITELIST_ENABLED` | backend | No (default `false`) | Turns the email whitelist gate on/off |
| `APP_CORS_ALLOWED_ORIGINS` | backend | Yes in production | Comma-separated frontend origins allowed to call the API |
| `VITE_API_BASE_URL` | frontend | Yes in production | URL of the deployed backend |

Never commit real values. See `backend/.env.example` and `frontend/.env.example`.

## Judgment calls (flagged for review)

- **Prebuilt pools are a local JSON seed file, not Firestore.** `backend/src/main/resources/seed/phrase-pools.json` holds the pools (Spanish/French at 28 phrases per mode, German at 10 — started smaller and can grow the same way); `PhrasePoolService` samples 6 and shuffles on every request. Reasoning: pool content barely changes, so a Firestore round-trip on every prebuilt-lesson request adds latency and setup friction (a service-account key just to run locally) for content that doesn't need it. `PhrasePoolService`'s public methods (`getLesson`, `getRandomLesson`, `listModes`) are the seam — swapping in a Firestore-backed implementation later is a one-file change; nothing above it (controller, frontend) needs to change. Firestore stays the documented migration target if you want pools editable without a redeploy.
- **Backend is deliberately minimal.** Three controllers, a handful of services, no repository/entity layer, no Spring Security. The whitelist gate is a single `Filter` (`WhitelistFilter`) that's a no-op unless explicitly enabled — resisting the temptation to reach for a full auth framework for what's currently a single-flag gate.
- **The whitelist gate is fully implemented, not stubbed — but off by default.** Flip `APP_ACCESS_WHITELIST_ENABLED=true` when you want v1 to be private; the Firestore-backed check, the frontend `EmailGate` screen, and the 403 handling are all already wired up.
- **Free-text generation uses Anthropic's structured outputs** (`output_config.format`, derived from a `GeneratedLesson` record) rather than "prompt for JSON + manually parse the text." This makes the response validated JSON at the API level — a stronger version of "strict JSON only" than string parsing. A `try/catch` around the whole call still exists: if Anthropic errors, refuses, or the SDK throws for any reason, the backend serves a prebuilt "Turist-essensielt" lesson instead of an error page.
- **Roleplay is stateless.** The frontend keeps the conversation and sends the whole history each turn, so the backend needs no sessions, database or accounts. Cost is capped three ways: max 8 user replies per conversation, max 300 characters per message, and an in-memory limit of 60 turns per hour per client IP (`RoleplayRateLimiter`, keyed on `CF-Connecting-IP`; resets on restart, which is fine for a single instance).
- **Trip plans are recomputed, not stored.** Only the trip (destination, date, chosen situations, completed situations) is saved; the day-by-day plan is rebuilt from "what's left" and "days left" every time, so a skipped day simply reflows.
- **Progress storage lives behind a `ProgressStore` interface** (`frontend/src/lib/progress.ts`), with only a `localStorage` implementation for now. The comment in that file marks it as the seam for a future account-backed implementation — the UI only ever calls the interface, never `localStorage` directly.

## Legal & privacy

I'm not a lawyer and this isn't legal advice — this section documents what the app actually does and the reasoning behind the choices made, so you (or a real lawyer) can review it before treating this as production-ready.

**What personal data is processed, and by whom:**

- **The free-text "Beskriv situasjonen" box and roleplay chat.** Whatever the user types is sent to Anthropic (a third-party AI provider) to generate a lesson. It could technically contain personal information if a user chose to type some in, though the feature doesn't ask for or need any. The backend does not log or persist this text anywhere — it's forwarded to Anthropic and the response is returned to the browser in the same request/response cycle. A line next to each input discloses this before the user submits anything (e.g. *"Teksten du skriver her sendes til Anthropic (tredjepart) for å generere frasene. Ikke skriv sensitiv informasjon."*).
- **Progress data** (which modes have been read/drilled/quizzed, last quiz score, streak, trip plan) lives entirely in the browser's `localStorage`. It is never sent to any Pocket Phrases server — from a GDPR standpoint this isn't "processing" by the app operator at all, it's local application state the user's own device holds.
- **Server logs.** The backend's default web server access logs (Spring Boot, Coolify's proxy, Cloudflare) will contain client IP addresses, as with essentially any web server. Nothing app-specific is added to them; the app doesn't read, aggregate, or act on this data. The roleplay rate limiter also keeps client IPs and timestamps **in memory only** (never written to disk), dropped after an hour or on restart. If you deploy this for real, keep default log retention short and don't repurpose these logs for anything beyond debugging.
- **No accounts, no analytics, no advertising, no cookies of any kind.**
- **The optional email whitelist** (off by default): if enabled, the email address a user enters is stored as plain text in a Firestore `whitelist` collection you (the deployer) manage, solely to gate access. It isn't linked to any other data the app holds.

**Likely legal basis, if you're mapping this to GDPR Article 6:** the free-text description is processed on the basis that it's necessary to provide the specific feature the user actively invoked (roughly Art. 6(1)(b)) — the user asks for a generated lesson, and sending the description to the model is how that's delivered — combined with a legitimate interest in offering the feature at all, disclosed up front. The whitelist email (if enabled) is processed on a legitimate-interest basis: gating a private deployment the site owner controls.

**Privacy notice / consent — decision and reasoning:** No cookie-consent banner. The app sets no cookies and performs no tracking or analytics, so there's nothing that triggers the ePrivacy "strictly necessary" carve-out or GDPR consent requirements — a banner here would be pure theater with nothing behind it. Instead of a separate, easy-to-ignore privacy-policy page, the one disclosure that matters (free text going to a third party) is shown in-context, directly above the input where it applies. If you later add accounts, analytics, or broader data collection, that calculus changes — add a real privacy page and reconsider consent requirements at that point.

**Anthropic third-party data flow:** explicitly disclosed in-app (see above) at the point of use, not buried in a policy page nobody reads. Anthropic's own data handling for API requests is governed by their terms — check current Anthropic API data-retention terms before relying on this in a context where that matters.

**Access control:** implemented as a Firestore-backed email whitelist, off by default (`APP_ACCESS_WHITELIST_ENABLED`). When enabled, the frontend prompts for an email on first 403, stores it in `localStorage`, and sends it as an `X-User-Email` header on every request; the backend's `WhitelistFilter` rejects anything not found in the `whitelist` Firestore collection with a 403. This is not authentication (anyone who knows a whitelisted email could type it in) — it's a simple, switchable gate suitable for "keep this private from search engines and randoms" rather than a security boundary against a determined user with knowledge of a valid email.

**Disclaimers:** the "Nød og apotek" (emergency/pharmacy) lessons and any AI-generated ("Beskriv situasjonen") lesson show an inline warning banner directly in the lesson view — not buried in a footer — stating the phrases are a learning aid, may contain errors, and are not a substitute for professional help or a real emergency response.


**TODOs:** 
- When selecting "Prøv med andre fraser", remove the phrases that were just used from the selection pool. If selecting this again, all previous removed phrases should remain removed.
- The daily streak is not working as intended. The streak should stop if a user has not done any lesson/test/practice during one entire day.
- Orforråd reisen skal helst unngå ord som de, est, le, la, osv. siden de alltid hører sammen med noe annet feks la maison.
- Norwegian sentence displayed, mix of drag and drop words for the user to create the sentence themselves, with many (minimum 5, max 10) words that are not correct but are there to confuse the user.
- AI version where the user can type the sentence themselves and the LLM will check to see if the user got it somewhat right- it would be nice to give feks score based on percentage of correctness. Example for spanish, "Jeg elsker deg" is displayed in norwegian and the user writes "Te amo" is 100% correct (?) but if the user writes "Tu amo" they get some points say 90% since they may have thought te amo but missed one letter.
- **Photograph a menu/sign → lesson:** user snaps a photo, Claude (vision) reads it and returns a `Lesson` with the useful words/phrases from it. Reuses the existing `generate` flow with an image input.
- **Travel buddy mode:** share a link to a lesson (or a whole trip plan) with travel companions — no accounts needed, e.g. lesson encoded in the URL or stored under a short share id.