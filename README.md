# MatMetrics

Smart training for safer, better wrestling.

MatMetrics is a training system for wrestling clubs: a ring of AI cameras around the mat, sensor
wristbands and an optional thermal camera feed a coach app and an athlete app. It flags risky
landings and fatigue during sparring, gives each athlete a short review after the session, and
builds a warm-up that adapts to them. Everything runs on an edge unit at the club, over the club's
own network, with no internet needed.

This repository is a working prototype of that product, built for a pitch to judges and investors.
The data is mock data, seeded so every run tells the same story.

## Credits

MatMetrics started as a team project for the Innovation Management course (M1, S7) at JUNIA.
The original prototype, its design system and its mock data were built by Jeremy O.A Boateng in
[nojetlag7/INNOVATION_MANAGEMENT_DEMO](https://github.com/nojetlag7/INNOVATION_MANAGEMENT_DEMO);
this repository keeps that full history. Kobi Ampem Afriyie extends it here with the edge server.

## What is in the repo

| Part | Stack | What it does |
|---|---|---|
| `src/` | React 19, TypeScript, Vite, Recharts | Coach app (dashboard, live session, reviews, athletes, warm-ups, system, privacy), athlete app on four phone frames, and the landing page |
| `server/` | Python 3.12, FastAPI, SQLite, WebSockets | The edge server: one live session clock and one set of settings shared by every screen in the room |
| `public/MATMETRICS_PROTOTYPE_SPEC.md` | | The build spec for the prototype |

## Two ways to run it

### 1. Frontend only (what Vercel serves)

```bash
npm install
npm run dev
```

Each browser tab runs its own simulated session, and settings are saved in that browser.

### 2. With the edge server (for a live demo)

```bash
npm install && npm run build
cd server
uv sync
uv run matmetrics-edge
```

The server prints two addresses:

- **Coach screen:** `http://localhost:8000/coach/live` on the presenting laptop.
- **Phones on Wi-Fi:** `http://<laptop-ip>:8000/athlete`. The System page also shows this as a QR
  code that judges can scan.

Every screen then shares one session. Pausing or speeding up the live session, approving a warm-up
plan, changing an athlete's privacy toggles or marking an alert as seen shows up on all screens at
once. Turn the laptop's internet off and it keeps working, which is the product's offline promise
shown for real.

If the server stops, every screen carries on by itself from where it was, and reconnects when the
server is back. During development, `npm run dev` forwards `/api` and `/ws` to a server on port 8000.

### Before presenting

The session clock starts at 19:27:20 (57:20 into the session) when the server starts and keeps
running. Click **Reset demo** in the sidebar just before you present: it restarts the clock and
clears all changes on every screen.

## Edge server API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Lets the app find the server |
| GET | `/api/state` | Settings changes and the live clock |
| PATCH | `/api/consents/{athleteId}` | Change privacy toggles |
| PUT | `/api/plans/{athleteId}` | Save or approve a warm-up plan |
| PUT | `/api/notes/{sessionId}:{athleteId}` | Save a coach note on a review |
| PUT | `/api/shared/{sessionId}:{athleteId}` | Share a review with the athlete |
| POST | `/api/system/calibration`, `/api/system/sync` | System page actions |
| POST | `/api/live/toggle`, `/speed`, `/end`, `/seen/{alertId}` | Live session controls |
| POST | `/api/demo/reset` | Clear every change and restart the session |
| GET | `/api/join` | Address and QR code for phones |
| WS | `/ws` | Pushes every change to every screen |

Interactive docs are at `/docs` while the server runs. Tests: `cd server && uv run pytest`.

Demo data only. MatMetrics is a coaching tool, not a medical device.
