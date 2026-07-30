# Pocket Phrases

A lightweight, situation-based travel language learner. Pick a language, pick (or describe) the situation you're about to be in, and get a short lesson you can work through three ways: **Les** (read), **Øv** (flashcard drill), **Test** (quiz).

v1 supports Spanish and French, with a Norwegian Bokmål UI. No accounts.

## Repo layout

```
pocket-phrases/
├── backend/          Spring Boot (Java 21) — thin proxy + prebuilt content
│   ├── src/main/java/com/pocketphrases/
│   │   ├── lesson/       shared Lesson/Phrase model
│   │   ├── phrasepool/   prebuilt lessons (sampled from a local JSON seed pool)
│   │   ├── generate/     free-text -> Anthropic -> Lesson
│   │   ├── access/       optional Firestore email whitelist gate
│   │   └── config/       CORS
│   └── src/main/resources/seed/phrase-pools.json
├── frontend/          React + TypeScript (Vite)
│   └── src/
│       ├── types/lesson.ts   mirrors the backend Lesson/Phrase shape
│       ├── lib/api.ts        fetch wrapper for the backend
│       ├── lib/progress.ts   localStorage progress, behind a ProgressStore seam
│       └── screens/          LanguagePicker -> ModePicker -> LessonScreen
├── render.yaml        Render deploy blueprint for the backend
└── .gitignore
```

## The shared "lesson" abstraction

A **lesson** is one shape everywhere in the app:

```ts
type Phrase = { target: string; pronunciation: string; native: string };
type Lesson = { title: string; language: "es" | "fr"; mode: string; phrases: Phrase[] };
```

It doesn't matter whether a lesson came from the local seed pool, the Anthropic free-text endpoint, or the "Tilfeldig" shuffle — the backend always returns this shape, and the frontend's Les/Øv/Test screens only ever render this shape. This is the seam that let prebuilt content, AI-generated content, and random mixes all use identical UI code.

## How backend and frontend talk to each other

The frontend calls the backend over plain REST under `/api`:

| Method | Path | What it does |
|---|---|---|
| GET | `/api/modes` | List of the 7 prebuilt mode keys + Norwegian titles |
| GET | `/api/lessons/prebuilt?language=es&mode=restaurant` | Samples 6 phrases from a pool of ~10, shuffled |
| GET | `/api/lessons/random?language=es` | Samples 6 phrases across all modes |
| POST | `/api/lessons/generate` `{ situation, language }` | Calls Anthropic (Claude Haiku) to build a lesson from free text |

The backend is the only thing that ever talks to Anthropic or Firestore — the Anthropic API key and Firebase credentials never reach the frontend or the repo.

## Run it locally

### Backend

```sh
cd backend
export ANTHROPIC_API_KEY=sk-ant-...   # optional locally — only needed for "Beskriv situasjonen"
./gradlew bootRun
```

Runs on `http://localhost:8080`. Without an Anthropic key, every screen works except the free-text box, which falls back to a prebuilt lesson (see "Judgment calls" below).

### Frontend

```sh
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173` and talks to `http://localhost:8080` by default. To point at a different backend, copy `frontend/.env.example` to `.env` and set `VITE_API_BASE_URL`.

Click through: language picker → mode picker (7 prebuilt cards, "Beskriv situasjonen" free-text box, "🎲 Tilfeldig") → lesson with Les/Øv/Test tabs.

## Deploy (free tiers)

- **Frontend** → Vercel
- **Backend** → Render (free web service, deployed via Docker)
- **Firestore** → Firebase Spark (free) plan — only used by the optional email whitelist gate

### Backend on Render

1. Push this repo to GitHub.
2. In Render: **New +** → **Blueprint**, point it at the repo. Render picks up `render.yaml` at the repo root, which builds `backend/Dockerfile`.
3. Render will prompt for the env vars marked `sync: false`: at minimum `ANTHROPIC_API_KEY`. Set `FIREBASE_SERVICE_ACCOUNT_JSON` only if you're enabling the whitelist gate. Leave `APP_CORS_ALLOWED_ORIGINS` for step 5.
4. Deploy. You'll get a URL like `https://pocket-phrases-backend.onrender.com`.
5. Render's free web services sleep after inactivity — the first request after a while wakes it up and is slow (10–30s). Fine for a personal/demo project; mention it if you invite others.

### Frontend on Vercel

1. Import the repo into Vercel; set the project's **Root Directory** to `frontend`.
2. Vercel auto-detects the Vite build via `frontend/vercel.json`.
3. Set the env var `VITE_API_BASE_URL` to your Render backend URL from the previous step.
4. Deploy.
5. Back in Render, set `APP_CORS_ALLOWED_ORIGINS` to your Vercel URL (comma-separate if you keep a preview domain too) and redeploy the backend so it accepts requests from the deployed frontend.

### Firestore (Firebase Spark / free plan)

Only needed if you turn on the whitelist gate:

1. Create a Firebase project (Spark plan is free) and enable Firestore (Native mode).
2. Project settings → **Service accounts** → **Generate new private key** — downloads a JSON file.
3. On Render, set `FIREBASE_SERVICE_ACCOUNT_JSON` to the full contents of that file, pasted as one line.
4. In Firestore, create a `whitelist` collection; add one document per allowed user with an `email` field, e.g. `{ "email": "you@example.com" }`.
5. Set `APP_ACCESS_WHITELIST_ENABLED=true` on Render and redeploy. The frontend will now prompt for an email the first time it gets a 403, store it locally, and send it as `X-User-Email` on every request.

## Environment variables

| Variable | Where | Required | Purpose |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | backend | For free-text lessons | Calls Claude Haiku for "Beskriv situasjonen" |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | backend | Only if whitelist enabled | Firestore credentials for the email whitelist |
| `APP_ACCESS_WHITELIST_ENABLED` | backend | No (default `false`) | Turns the email whitelist gate on/off |
| `APP_CORS_ALLOWED_ORIGINS` | backend | Yes in production | Comma-separated frontend origins allowed to call the API |
| `VITE_API_BASE_URL` | frontend | Yes in production | URL of the deployed backend |

Never commit real values. See `backend/.env.example` and `frontend/.env.example`.

## Judgment calls (flagged for review)

- **Prebuilt pools are a local JSON seed file, not Firestore.** `backend/src/main/resources/seed/phrase-pools.json` holds ~10 phrases per mode per language; `PhrasePoolService` samples 6 and shuffles on every request. Reasoning: pool content barely changes, so a Firestore round-trip on every prebuilt-lesson request adds latency and setup friction (a service-account key just to run locally) for content that doesn't need it. `PhrasePoolService`'s public methods (`getLesson`, `getRandomLesson`, `listModes`) are the seam — swapping in a Firestore-backed implementation later is a one-file change; nothing above it (controller, frontend) needs to change. Firestore stays the documented migration target if you want pools editable without a redeploy.
- **Backend is deliberately minimal.** Three controllers, a handful of services, no repository/entity layer, no Spring Security. The whitelist gate is a single `Filter` (`WhitelistFilter`) that's a no-op unless explicitly enabled — resisting the temptation to reach for a full auth framework for what's currently a single-flag gate.
- **The whitelist gate is fully implemented, not stubbed — but off by default.** Flip `APP_ACCESS_WHITELIST_ENABLED=true` when you want v1 to be private; the Firestore-backed check, the frontend `EmailGate` screen, and the 403 handling are all already wired up.
- **Free-text generation uses Anthropic's structured outputs** (`output_config.format`, derived from a `GeneratedLesson` record) rather than "prompt for JSON + manually parse the text." This makes the response validated JSON at the API level — a stronger version of "strict JSON only" than string parsing. A `try/catch` around the whole call still exists: if Anthropic errors, refuses, or the SDK throws for any reason, the backend serves a prebuilt "Turist-essensielt" lesson instead of an error page.
- **Progress storage lives behind a `ProgressStore` interface** (`frontend/src/lib/progress.ts`), with only a `localStorage` implementation for now. The comment in that file marks it as the seam for a future account-backed implementation — the UI only ever calls the interface, never `localStorage` directly.

## Legal & privacy

I'm not a lawyer and this isn't legal advice — this section documents what the app actually does and the reasoning behind the choices made, so you (or a real lawyer) can review it before treating this as production-ready.

**What personal data is processed, and by whom:**

- **The free-text "Beskriv situasjonen" box.** Whatever the user types is sent to Anthropic (a third-party AI provider) to generate a lesson. It could technically contain personal information if a user chose to type some in, though the feature doesn't ask for or need any. The backend does not log or persist this text anywhere — it's forwarded to Anthropic and the response is returned to the browser in the same request/response cycle. A line directly above the input box discloses this before the user submits anything: *"Teksten du skriver her sendes til Anthropic (tredjepart) for å generere frasene. Ikke skriv sensitiv informasjon."*
- **Progress data** (which modes have been read/drilled/quizzed, last quiz score) lives entirely in the browser's `localStorage`. It is never sent to any Pocket Phrases server — from a GDPR standpoint this isn't "processing" by the app operator at all, it's local application state the user's own device holds.
- **Server logs.** The backend's default web server access logs (Spring Boot / Render) will contain client IP addresses, as with essentially any web server. Nothing app-specific is added to them; the app doesn't read, aggregate, or act on this data. If you deploy this for real, keep default log retention short and don't repurpose these logs for anything beyond debugging.
- **No accounts, no analytics, no advertising, no cookies of any kind.**
- **The optional email whitelist** (off by default): if enabled, the email address a user enters is stored as plain text in a Firestore `whitelist` collection you (the deployer) manage, solely to gate access. It isn't linked to any other data the app holds.

**Likely legal basis, if you're mapping this to GDPR Article 6:** the free-text description is processed on the basis that it's necessary to provide the specific feature the user actively invoked (roughly Art. 6(1)(b)) — the user asks for a generated lesson, and sending the description to the model is how that's delivered — combined with a legitimate interest in offering the feature at all, disclosed up front. The whitelist email (if enabled) is processed on a legitimate-interest basis: gating a private deployment the site owner controls.

**Privacy notice / consent — decision and reasoning:** No cookie-consent banner. The app sets no cookies and performs no tracking or analytics, so there's nothing that triggers the ePrivacy "strictly necessary" carve-out or GDPR consent requirements — a banner here would be pure theater with nothing behind it. Instead of a separate, easy-to-ignore privacy-policy page, the one disclosure that matters (free text going to a third party) is shown in-context, directly above the input where it applies. If you later add accounts, analytics, or broader data collection, that calculus changes — add a real privacy page and reconsider consent requirements at that point.

**Anthropic third-party data flow:** explicitly disclosed in-app (see above) at the point of use, not buried in a policy page nobody reads. Anthropic's own data handling for API requests is governed by their terms — check current Anthropic API data-retention terms before relying on this in a context where that matters.

**Access control:** implemented as a Firestore-backed email whitelist, off by default (`APP_ACCESS_WHITELIST_ENABLED`). When enabled, the frontend prompts for an email on first 403, stores it in `localStorage`, and sends it as an `X-User-Email` header on every request; the backend's `WhitelistFilter` rejects anything not found in the `whitelist` Firestore collection with a 403. This is not authentication (anyone who knows a whitelisted email could type it in) — it's a simple, switchable gate suitable for "keep this private from search engines and randoms" rather than a security boundary against a determined user with knowledge of a valid email.

**Disclaimers:** the "Nød og apotek" (emergency/pharmacy) lessons and any AI-generated ("Beskriv situasjonen") lesson show an inline warning banner directly in the lesson view — not buried in a footer — stating the phrases are a learning aid, may contain errors, and are not a substitute for professional help or a real emergency response.
