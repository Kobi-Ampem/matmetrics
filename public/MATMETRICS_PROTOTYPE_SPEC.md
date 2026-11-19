# MatMetrics — Prototype Build Spec (React + TypeScript)

> **For Cursor:** This file is the single source of truth for building the MatMetrics prototype. Read it fully before writing code. Follow the design rules in Section 4 strictly. Build in the phases listed in Section 12 and stop after each phase so the team can review.

---

## 1. What we are building

MatMetrics is a smart training system for wrestling clubs. The full product has:

- A ring of **4 AI cameras** around the mat that track body position and flag dangerous movements.
- **Sensor wristbands** that send heart rate, skin temperature and movement.
- An optional **thermal (infrared) camera** for body heat maps.
- An **edge AI unit** at the club, connected over a **local network (LAN)**, so everything works without internet.
- A **coach app** (tablet) with live alerts and a team dashboard.
- An **athlete app** (phone) with personal session reviews, progress, and a warm-up plan that adapts over time.

We are **not** building the real system. We are building a **front-end-only prototype** in React and TypeScript that looks and behaves like the finished product, for a competition pitch to judges and investors. All data is mock data generated in the browser. The live session is simulated.

### Goals

1. Show judges what the finished product looks like on a tablet and a phone.
2. Make the core story obvious in under 2 minutes of clicking: *live session → alert → post-session review → athlete progress → personalised warm-up*.
3. Feel alive: the live screen updates in real time, tables sort and filter, settings remember their state.
4. Look like a real, modern, professional product.

### Non-goals

- No backend, no API calls, no database, no authentication.
- No real AI, no real video, no camera access.
- No deployment pipeline beyond `npm run build` producing a static site.

---

## 2. Tech stack

| Area | Choice | Notes |
|---|---|---|
| Build tool | **Vite** | `npm create vite@latest matmetrics -- --template react-ts` |
| Language | **TypeScript**, `strict: true` | No `any`. All mock data is typed. |
| UI | **React 18+** function components and hooks | No class components. |
| Routing | **react-router-dom** | Browser router, routes in Section 6. |
| Styling | **CSS Modules** (`Component.module.css`) + one global `tokens.css` | No Tailwind, no UI kits (no MUI, Chakra, shadcn). We want a custom look. |
| Icons | **lucide-react** | Stroke icons, size 18–20, `strokeWidth={1.5}`. **No emojis.** |
| Charts | **recharts** for line/bar/area charts; hand-written SVG for body maps, pose skeletons and the mat diagram | Style charts with tokens (Section 4.3), never library defaults. |
| Class names | **clsx** | For conditional classes. |
| Fonts | `@fontsource/inter`, `@fontsource/space-grotesk`, `@fontsource/jetbrains-mono` | Imported once in `main.tsx`. |
| State | React context + `useReducer` for the live session; `localStorage` for settings | No Redux or Zustand needed. |
| Linting | ESLint (from the Vite template) + Prettier | Keep the default rules. |

Install:

```bash
npm create vite@latest matmetrics -- --template react-ts
cd matmetrics
npm install react-router-dom lucide-react recharts clsx
npm install @fontsource/inter @fontsource/space-grotesk @fontsource/jetbrains-mono
npm run dev
```

---

## 3. Project structure

```
src/
├── main.tsx                     # fonts, global CSS, router
├── App.tsx                      # route definitions
├── styles/
│   ├── tokens.css               # design tokens (Section 4.2)
│   └── global.css               # resets, base typography, focus ring
├── types/
│   └── index.ts                 # all shared types (Section 7.1)
├── data/
│   ├── rng.ts                   # seeded random generator
│   ├── club.ts                  # club, coaches, room profiles
│   ├── athletes.ts              # 18 athletes (hand-written)
│   ├── exercises.ts             # warm-up exercise library
│   ├── alertTemplates.ts        # alert wording library
│   ├── generators.ts            # sessions, vitals, flags, progress, devices
│   ├── liveScript.ts            # scripted events for the live session
│   └── index.ts                 # builds and exports the full mock DB once
├── state/
│   ├── LiveSessionContext.tsx   # simulated live session (Section 8)
│   ├── SettingsContext.tsx      # consent toggles, approved plans (localStorage)
│   └── useMockDb.ts             # read-only access to the mock DB
├── components/
│   ├── layout/                  # AppShell, Sidebar, TopBar, NetworkStatus, PhoneFrame
│   ├── data/                    # DataTable, StatRow, StatusTag, AlertRow, LoadBar, Sparkline
│   ├── charts/                  # LineChartPanel, BarChartPanel, TimelineBar
│   ├── visuals/                 # CameraFrame, PoseSkeleton, BodyMap, MatDiagram, ThermalLegend
│   └── controls/                # Button, Tabs, Toggle, Select, SegmentedControl, Drawer
├── features/
│   ├── landing/                 # LandingPage
│   ├── dashboard/               # DashboardPage
│   ├── live/                    # LivePage, CameraGrid, AlertStream, VitalsRail, MiniMatMap
│   ├── reviews/                 # ReviewsListPage, ReviewPage, VideoTimeline, FlaggedMomentList
│   ├── athletes/                # AthletesListPage, AthleteProfilePage
│   ├── warmups/                 # WarmupPage
│   ├── system/                  # SystemPage
│   ├── privacy/                 # PrivacyPage
│   └── athleteApp/              # AthleteAppShowcase, PhoneHome, PhoneReview, PhoneWarmup, PhoneProgress
└── utils/
    ├── format.ts                # dates, times, units
    └── risk.ts                  # risk level helpers, colours, labels
```

Rules:
- One component per file. Each component has its own `.module.css` if it needs styles.
- Pages never contain raw mock data: they read from `useMockDb()` or `useLiveSession()`.
- Keep components small (under ~150 lines). Split when bigger.

---

## 4. Design direction

**Mood:** calm, precise, athletic. Think professional sports analytics software or a flight instrument panel, not a consumer fitness app. Data should feel trustworthy. Colour carries meaning (risk levels), not decoration.

### 4.1 Hard rules (do not break)

1. **No emojis.** Not in text, buttons, headings, empty states, alerts or code comments shown in the UI.
2. **Do not overuse cards.** No grids of rounded boxes with shadows. Group content with:
   - whitespace and alignment,
   - 1px divider lines (`--line`),
   - tables and lists,
   - split panes (two or three columns separated by a vertical rule),
   - section headings with a small uppercase eyebrow label above them.
   A bordered container is allowed **only** for: camera/video frames, the mat diagram, the phone device frame, drawers and modals.
3. **No drop shadows** except on the phone frame, drawers and modals.
4. **No background gradients.** Gradients are allowed only inside data visuals (thermal map, chart area fills at low opacity).
5. **Small corner radius:** 4px for inputs and buttons, 8px for camera frames, 0 for tables and sections. Fully rounded only for status pills and avatar initials.
6. **One accent colour.** Everything else is neutral. Risk colours appear only on risk data.
7. **Numbers use JetBrains Mono with tabular figures** (`font-variant-numeric: tabular-nums`).
8. **Calm copy.** Say "risk flag", "flagged moment", "worth reviewing". Never "injury detected" or "diagnosis". MatMetrics is a coaching tool, not a medical device.
9. **Motion is subtle:** 150–200ms ease-out for hovers and new rows; no bouncing, no confetti, no parallax.

### 4.2 Design tokens (`src/styles/tokens.css`)

```css
:root {
  /* Neutrals */
  --bg:          #F7F7F5;
  --surface:     #FFFFFF;
  --ink:         #0F1419;
  --ink-2:       #4A5260;
  --ink-3:       #8A919C;
  --line:        #E4E5E1;
  --line-strong: #CFD1CC;

  /* Brand */
  --accent:      #1D4ED8;   /* "mat blue" */
  --accent-soft: #E8EEFC;

  /* Dark surfaces (sidebar, live screen, camera frames) */
  --night:       #0B0E13;
  --night-2:     #151A22;
  --night-line:  #252C38;
  --night-ink:   #E6E8EC;
  --night-ink-2: #9AA3B2;

  /* Risk scale (risk data only) */
  --risk-high:    #D92D20;  --risk-high-bg: #FDECEA;
  --risk-med:     #C77700;  --risk-med-bg:  #FFF4E0;
  --risk-low:     #5B6472;  --risk-low-bg:  #EEF0F2;
  --ok:           #12805C;  --ok-bg:        #E6F4EE;

  /* Pose colours */
  --pose-a: #7FA6FF;
  --pose-b: #E6E8EC;

  /* Thermal scale */
  --thermal-cool: #9DB4D3;
  --thermal-warm: #E8A317;
  --thermal-hot:  #D92D20;

  /* Type */
  --font-ui:   "Inter", system-ui, sans-serif;
  --font-head: "Space Grotesk", "Inter", sans-serif;
  --font-data: "JetBrains Mono", ui-monospace, monospace;
  --fs-xs: 12px; --fs-sm: 13px; --fs-md: 15px; --fs-lg: 18px;
  --fs-xl: 24px; --fs-2xl: 32px; --fs-3xl: 48px;

  /* Spacing (4px grid) */
  --s1: 4px; --s2: 8px; --s3: 12px; --s4: 16px; --s5: 24px; --s6: 32px; --s7: 48px; --s8: 64px;

  --radius-sm: 4px;
  --radius-md: 8px;
  --sidebar-w: 232px;
  --topbar-h: 56px;
}
```

Also export the same values as a TypeScript object in `src/styles/theme.ts` so recharts and SVG components can use them (recharts cannot read CSS variables reliably).

### 4.3 Typography

| Use | Font | Size / weight |
|---|---|---|
| Page title | Space Grotesk | 32px / 600, letter-spacing −0.02em |
| Section heading | Space Grotesk | 18px / 600 |
| Eyebrow label | Inter | 11px / 600, uppercase, letter-spacing 0.08em, `--ink-3` |
| Body | Inter | 15px / 400, line-height 1.5 |
| Table text | Inter | 13px / 400 |
| Big numbers | JetBrains Mono | 32–48px / 500 |
| Timestamps, IDs, units | JetBrains Mono | 12–13px / 400 |

Chart styling: axis labels JetBrains Mono 11px `--ink-3`; only horizontal gridlines in `--line`; no chart borders; no legends when one series (label the line end instead); tooltips are white with a 1px `--line` border, no shadow, mono numbers.

### 4.4 Core components (build these first, reuse everywhere)

| Component | Props (TypeScript) | Behaviour and look |
|---|---|---|
| `AppShell` | `children`, `theme?: "light" \| "dark"` | Sidebar + TopBar + content. Dark theme used on the live page. |
| `Sidebar` | — | 232px, `--night` background. Wordmark "MatMetrics" (Space Grotesk). Nav: Dashboard, Live session, Reviews, Athletes, Warm-ups, System, Privacy. Active item: `--night-2` background + 2px `--accent` left bar. Bottom: coach name, role, `NetworkStatus`. Collapses to 64px icons-only under 1024px. |
| `NetworkStatus` | reads from mock DB | Green dot + "Local network" + mono line "Edge unit online · Internet off · Sync paused". Visible on every coach page. |
| `TopBar` | `title`, `breadcrumb?`, `actions?` | 56px, bottom border. |
| `StatRow` | `items: { label; value; unit?; delta?; tone? }[]` | Figures in a row separated by 1px vertical rules. **No boxes.** |
| `DataTable<T>` | `columns`, `rows`, `sortable?`, `onRowClick?`, `dense?` | No outer border, 1px row dividers, sticky header (11px uppercase `--ink-3`), 48px rows, hover `--bg`, numeric columns right-aligned in mono. Click a header to sort. |
| `StatusTag` | `level: RiskLevel \| "ok" \| "neutral"`, `children` | Pill, 22px tall, 11px uppercase. Always shows a text label. |
| `AlertRow` | `alert: Alert`, `variant: "light" \| "dark"`, `actions?` | 3px left bar in risk colour; time (mono), athlete (bold), description, source (mono "CAM 2 + CAM 3"), action links. New rows fade in over 200ms. |
| `LoadBar` | `value: number` (0–100) | 80px track, filled part neutral; over 85 uses `--risk-med`. Number next to it in mono. |
| `Sparkline` | `values: number[]`, `tone?` | Tiny inline SVG, 80×24, no axes. |
| `Button` | `variant: "primary" \| "secondary" \| "text" \| "danger"`, `icon?` | 36px tall, 4px radius. |
| `Tabs` | `tabs`, `value`, `onChange` | Text tabs, 2px `--accent` underline on active. No boxed or pill tabs. |
| `SegmentedControl` | `options`, `value`, `onChange` | Used for time ranges (7d / 30d / 12w). Thin border, active segment `--accent-soft`. |
| `Toggle` | `checked`, `onChange`, `label`, `description?` | 36×20 switch; whole row clickable. |
| `Drawer` | `open`, `onClose`, `title`, `children` | Slides in from right, 420px, used for alert details and athlete quick view. |
| `CameraFrame` | `camera: Camera`, `pose: PoseFrame`, `flag?: Flag`, `size?` | 16:9, `--night`, 8px radius, 1px `--night-line` border, faint 3×3 grid. Top-left mono label "CAM 1 · NORTH"; top-right red dot "REC". Renders `PoseSkeleton`. If `flag` present: red bounding box + mono label "RISK · NECK LANDING". If camera status is warning: amber mono label. |
| `PoseSkeleton` | `frame: PoseFrame`, `highlight?: "a" \| "b"` | SVG of two stick figures (17 keypoints each, COCO order). Highlighted athlete's joints turn `--risk-high`. Animate by interpolating between keyframes (Section 8.3). |
| `BodyMap` | `mode: "landing" \| "thermal"`, `zones: Record<BodyZone, number>`, `side: "front" \| "back"` | Geometric SVG outline. Landing mode: zone opacity steps of `--risk-high`. Thermal mode: zone fill interpolated cool → warm → hot, with `ThermalLegend` "31°C — 36°C" and caption "Relative skin temperature. Not a medical reading." |
| `MatDiagram` | `cameras`, `pairs?`, `highlightPairId?` | Top-down square with mat circle, 4 camera markers at N/E/S/W, optional pair dots. |
| `PhoneFrame` | `children`, `label?` | 390×844, 40px radius, 10px dark bezel, subtle shadow. |

### 4.5 Pose skeleton reference

Keypoints follow the COCO 17-point order: nose, left/right eye, left/right ear, left/right shoulder, left/right elbow, left/right wrist, left/right hip, left/right knee, left/right ankle. Draw the head as a circle around the nose, and connect: shoulders, shoulder–elbow–wrist, shoulder–hip, hips, hip–knee–ankle. Coordinates are in a 320×180 viewBox. Athlete A uses `--pose-a`, athlete B uses `--pose-b`. Stroke 2px, round caps, joint dots r=2.5.

Create **at least 6 keyframe poses** in `src/data/poses.ts` (stance face-off, tie-up, single-leg shot, sprawl, hip throw mid-air, landing on back/neck), each a pair of 17-point arrays.

---

## 5. Mock data overview

All mock data is created **once at app start** by `src/data/index.ts`, using a **seeded random generator** so every reload shows the same numbers (important for a rehearsed pitch demo).

```ts
// src/data/rng.ts
export function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const rng = mulberry32(20261117);
export const pick = <T,>(arr: T[]) => arr[Math.floor(rng() * arr.length)];
export const between = (min: number, max: number) => min + rng() * (max - min);
export const gauss = (mean: number, sd: number) => {
  const u = 1 - rng(), v = rng();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
```

### Size of the mock database

| Collection | Count | How |
|---|---|---|
| Club | 1 | Hand-written |
| Coaches | 3 | Hand-written |
| Athletes | 18 | Hand-written profiles, generated history |
| Room profiles | 3 | Hand-written |
| Cameras | 4 | Hand-written |
| Devices (edge unit, router, thermal, 18 wristbands) | 21 | Hand-written + generated battery |
| Sessions | 36 (12 weeks × 3 per week: Tue, Thu, Sat) | Generated |
| Session participations | ~540 (about 15 athletes per session) | Generated |
| Flags (risky moments) | ~400 across all sessions | Generated from templates |
| Vitals samples | Per participation: 1 sample per 10 s (about 540 per session per athlete), **generated lazily** when a review page opens | Generated on demand, memoised |
| Weekly progress | 18 athletes × 12 weeks | Derived from sessions |
| Exercises | 24 | Hand-written library |
| Warm-up plans | 1 upcoming plan per athlete (18) | Generated by rules |
| Live session script | ~40 timed events over 90 minutes | Hand-written + generated filler |

---

## 6. Routes and screens

| Route | Page | Theme |
|---|---|---|
| `/` | Landing (pitch page) | Light, no app shell |
| `/coach` | Dashboard | Light |
| `/coach/live` | Live session | **Dark** |
| `/coach/reviews` | Reviews list | Light |
| `/coach/reviews/:sessionId/:athleteId` | Session review | Light |
| `/coach/athletes` | Athletes list | Light |
| `/coach/athletes/:athleteId` | Athlete profile | Light |
| `/coach/warmups` | Warm-up plans (with athlete selector) | Light |
| `/coach/system` | System and devices | Light |
| `/coach/privacy` | Consent and data sharing | Light |
| `/athlete` | Athlete app showcase (phones) | Light |
| `*` | Not found, plain text + link home | Light |

Every page shows a small mono footer line: "Demo data. Not a medical device."

### 6.1 `/` Landing page

1. **Header:** wordmark left; links right: "How it works", "Prototype", "Privacy".
2. **Hero (60/40 split):**
   - Left: eyebrow "Smart training for wrestling clubs". Headline (48px Space Grotesk): "See every fall. Train every athlete." One sentence: "AI cameras, sensor wristbands and a coach app that work together on your club's own network, so wrestlers get injured less and improve faster." Buttons: "Open live session" (primary → `/coach/live`), "See athlete app" (secondary → `/athlete`).
   - Right: a large `CameraFrame` playing the animated pose loop, with one flagged moment every ~8 s and a single `AlertRow` overlay at the bottom.
3. **How it works:** 4 columns separated by vertical rules (not cards): 01 Capture, 02 Detect, 03 Alert, 04 Improve. Number in mono, title, two lines of text.
4. **System diagram:** `MatDiagram` with dashed connectors to "Edge unit" → "Coach tablet" and "Athlete phones", labelled "Local network, no internet needed". Hovering a node highlights its connections.
5. **Key figures:** `StatRow`: "4 camera angles", "< 2 s alert time (target)", "0 data leaves the club by default", "18 athletes tracked".
6. **Prototype index:** two-column list of links to every route with a one-line description, separated by dividers.
7. **Footer:** "MatMetrics prototype. Demo data only. Not a medical device." and a team names placeholder.

### 6.2 `/coach` Dashboard

1. TopBar: "Today". Actions: status pill "Session live" (green dot, from live context), date "Tue 17 Nov", primary button "Open live session".
2. `StatRow` (values from live context, updating): Athletes on mat · Flags today (with high count) · Avg heart rate · Room temp / humidity.
3. **Split 65/35 with vertical rule:**
   - Left: **Team table**, sortable: #, Athlete (name + style/level under it), HR (live), Skin temp (live), Load (`LoadBar`), Flags today (`StatusTag` with highest level + count), Band battery. Default sort: flags (high first). Filters above the table as text tabs: All · On mat · Flagged · High load. Row click → athlete profile.
   - Right: eyebrow "Latest alerts", newest 8 `AlertRow`s from the live context; link "View all in live session".
4. **Full width:** "Load this week" bar chart (recharts), one bar per athlete, bars over 85 in `--risk-med`, reference line at 85 labelled "High load".
5. **Full width:** "Flags by body zone, last 30 days": horizontal bar chart (head/neck, shoulder, back, hip, knee, ankle, mat edge).

### 6.3 `/coach/live` Live session (hero screen)

Dark theme throughout.

1. **TopBar (dark):** title from current block ("Live sparring, round 4 of 5"). Centre: big mono clock (session elapsed time) + red REC dot. Right: "Mat 1", **playback controls** (pause/resume, speed 1× / 4× / 16× as a `SegmentedControl`), "End session" (secondary). Playback controls exist so the presenter can fast-forward to the interesting moments.
2. **Main split 70/30:**
   - Left: **2×2 `CameraFrame` grid** (CAM 1 North, CAM 2 East, CAM 3 South, CAM 4 West), poses animating. When a live flag event fires, the relevant camera(s) show the red bounding box for 6 s. CAM 4 shows amber "LENS PARTLY BLOCKED" between 19:20 and 19:24. Click a frame to enlarge it (frame spans the full grid, others become a thin strip below).
   - Right: **Alert stream**, newest on top, new rows fade in. Top alert slightly highlighted with actions "Review clip" (opens `Drawer` with a small looping frame, details and "Open full review" link) and "Mark as seen" (dims the row). Filter tabs: All · High · Unseen. Under the stream, mono line "Edge unit 30 fps · latency 1.4 s" (latency jitters 1.1–1.8 s).
3. **Bottom: Vitals rail**, one row per pair on the mat: both athletes' names, live HR (mono, colour `--risk-med` if > 175), `Sparkline` of last 2 minutes, skin temp, `LoadBar`. Updates every simulated second.
4. **Mini mat map** in the right column above the stream: `MatDiagram` with pair dots that drift slowly; a pair with an active flag pulses red for 6 s.
5. Keyboard shortcuts (show a small hint line): Space = pause, 1/2/3 = speed, F = enlarge first flagged camera.

### 6.4 `/coach/reviews` Reviews list

- `DataTable` of all session participations from the last 12 weeks, filterable by athlete (Select), by date range (`SegmentedControl` 7d / 30d / 12w) and "Only with high flags" (Toggle).
- Columns: date, session type, athlete, time on mat, avg HR, takedowns (done / attempts), risky landings, highest flag (`StatusTag`), link "Open".
- Pagination: 20 rows per page with "Previous / Next" text buttons and "21–40 of 512" in mono.

### 6.5 `/coach/reviews/:sessionId/:athleteId` Session review

Default demo link: Jack Miller, 17 Nov.

1. TopBar: "Session review", breadcrumb "Reviews / Tue 17 Nov / Jack Miller". Actions: "Share with athlete" (primary, toggles to "Shared" with a check icon), "Export PDF" (secondary, calls `window.print()`, with a print stylesheet).
2. **Video area:** large `CameraFrame` with camera tabs above (CAM 1 · CAM 2 · CAM 3 · CAM 4 · Multi-view). Below it, `VideoTimeline`: full-width track for the 90-minute session, draggable playhead, markers for each flag (red/amber/grey by level, green for positive moments). Play/pause button and mono time "39:58 / 90:00". Clicking a marker jumps the playhead and shows the matching pose keyframe. Multi-view shows the 4 frames small in a row.
3. **Split 50/50 below:**
   - Left: "Summary": AI summary paragraph (generated from the athlete's flags with a template, Section 7.5) in 18px text. Eyebrow "Focus for next session" with 2 numbered points.
   - Right: "Flagged moments": list rows (timestamp mono, description, camera, `StatusTag`, "Jump to").
4. **`StatRow`:** Time on mat · Avg HR · Peak HR · Takedowns · Risky landings.
5. **Heart rate chart:** recharts area chart of the session's vitals samples (low-opacity fill), with vertical reference lines at flag times and a shaded band above 170 bpm labelled "High effort".
6. **Landing map:** `BodyMap` landing mode from this session's flags. Caption from data, e.g. "All 3 risky landings on the right shoulder."
7. **Coach note:** textarea + "Save note" (saved to `localStorage` per review; shows "Saved 19:42").

### 6.6 `/coach/athletes` Athletes list

- `DataTable`: initials avatar + name, weight class, style, level, sessions (12 weeks), risky landings per session (12-week average with a `Sparkline`), trend (e.g. "−51%" in `--ok` or "+12%" in `--risk-med`), load (7-day average), last session date.
- Search input (by name) and filter tabs: All · Competitive · Intermediate · Beginner.

### 6.7 `/coach/athletes/:athleteId` Athlete profile

1. Header block (no card): 48px initials circle (`--accent-soft`), name, line "74 kg · Freestyle · Competitive · Member since Sep 2024". Tabs: Overview · Sessions · Warm-ups · Data sharing.
2. **Overview tab:**
   - Headline insight (24px Space Grotesk) computed from data, e.g. "Risky landings down 51% in 12 weeks", with a mono line under it "From 4.5 to 2.2 per session".
   - Range selector `SegmentedControl` (4w / 8w / 12w).
   - Two charts side by side separated by a vertical rule: "Risky landings per session" (line, `--risk-med`, label at end point) and "Takedown success" (line, `--accent`, label "64%").
   - Third chart full width: "Weekly load" columns with the high-load reference line.
   - Thermal snapshot: front and back `BodyMap` thermal mode with caption from data, e.g. "Right shoulder 0.8°C warmer than left after the last session. Relative reading, not medical."
3. **Sessions tab:** the reviews table filtered to this athlete.
4. **Warm-ups tab:** upcoming plan summary + history of approved plans.
5. **Data sharing tab:** read-only view of this athlete's consent settings.

### 6.8 `/coach/warmups` Warm-up plans

1. TopBar: "Warm-up plan". Athlete `Select` (default Jack Miller). Date "Thu 19 Nov".
2. Status line: `StatusTag` "SUGGESTED" / "APPROVED" / "STANDARD" + one-line text.
3. Total time: big mono "18 min" with "Standard plan: 15 min" in grey.
4. **Timeline bar:** horizontal bar split into segments proportional to each step (neutral greys; added/adjusted steps in `--accent`). Hover shows the step name.
5. **Ordered list (not cards):** each row: order number (mono), exercise, duration (mono, right), reason in small text. Added/adjusted rows have a 3px `--accent` left bar and a pill "ADDED" / "ADJUSTED". Rows can be reordered with up/down icon buttons; durations editable with − / + buttons (1-min steps).
6. **"Why this plan":** the generated adjustment notes, each with a small info icon.
7. Actions: "Approve plan" (primary; switches status to APPROVED and stores it), "Reset to suggestion" (secondary), "Use standard plan" (text).

### 6.9 `/coach/system` System and devices

1. TopBar: "System".
2. Network banner (full-width line, not a card): green dot "Running on local network", mono "Internet off · Cloud sync paused · 3 sessions waiting". Button "Sync when online" (shows "Waiting for internet" state).
3. `MatDiagram` with camera statuses (CAM 4 amber).
4. Devices table with status tags.
5. Wristbands list: 18 rows with `LoadBar`-style battery bars (under 50% in `--risk-med`), last-seen time in mono, firmware version.
6. Calibration: current room profile, last run date, list of 3 profiles, button "Run calibration" that shows a 5-second progress line then updates "Last run" to now. One line of explanation: "Room temperature, humidity and light change sensor readings. Calibrating per room keeps alerts reliable."
7. Edge unit chart: small line chart "Processing rate (fps), last 60 min" hovering around 30.

### 6.10 `/coach/privacy` Consent and data sharing

1. Title "Your data, your choice" and one paragraph: "MatMetrics only records during sessions. Video and health data stay on your club's device unless you choose to share them."
2. Athlete `Select` (coach can view each athlete's settings; edits allowed only in the athlete app, so toggles are disabled here with a note).
3. Settings rows with `Toggle`: share heart rate and temperature with coach; share session videos with coach; include anonymised data in research; back up to cloud when online.
4. Consent record: date given, parent consent status (for athletes under 18, show "Parent consent: given 4 Sep 2026").
5. Danger zone separated by a line: "Delete all my data" in `--risk-high`, opens a confirmation modal (no real effect beyond a toast "Request recorded (demo)").

### 6.11 `/athlete` Athlete app showcase

Light background, title "Athlete app", one line of explanation, and an athlete `Select` (default Jack Miller). Below, **four `PhoneFrame`s side by side** (stack under 1200px). Each phone is a real mini-app with its own bottom tab bar (Home, Sessions, Warm-up, Profile); the four frames start on different tabs but are fully clickable.

- **Home:** "Good evening, Jack". Large stat "2.2 risky landings per session", "down from 4.5", sparkline. "Last session, Tue 17 Nov": time on mat, takedowns, risky landings, link to the review.
- **Session review:** small video frame with timeline markers, AI summary, list of flagged moments.
- **Warm-up:** "Thursday warm-up, 18 min", steps as a compact list, "Approved by Coach David" (check icon) when approved on `/coach/warmups`, button "Start warm-up" that runs a step-by-step countdown view.
- **Profile / privacy:** the 4 consent toggles (**editable here**, synced with `/coach/privacy` via `SettingsContext`).

---

## 7. Mock data in detail

### 7.1 Types (`src/types/index.ts`)

```ts
export type RiskLevel = "high" | "med" | "low";
export type Style = "Freestyle" | "Greco-Roman";
export type Level = "Beginner" | "Intermediate" | "Competitive";
export type BodyZone =
  | "head_neck" | "shoulder_l" | "shoulder_r" | "upper_back" | "lower_back"
  | "hip_l" | "hip_r" | "knee_l" | "knee_r" | "ankle_l" | "ankle_r";
export type FlagKind =
  | "neck_landing" | "shoulder_landing" | "back_slam" | "knee_twist"
  | "mat_edge" | "high_hr_sustained" | "temp_rise" | "hips_high_shot"
  | "fatigue_slowdown" | "good_finish";

export interface Club { id: string; name: string; city: string; mats: number; }
export interface Coach { id: string; name: string; role: string; initials: string; }

export interface Athlete {
  id: string;            // "a01"
  name: string;
  initials: string;
  sex: "M" | "F";
  age: number;
  weightKg: number;
  style: Style;
  level: Level;
  memberSince: string;   // ISO date
  restingHr: number;
  maxHr: number;
  baselineSkinTemp: number;
  riskProfile: { preferredZone: BodyZone; baseFlagRate: number; improvementPerWeek: number };
  bandId: string;
}

export interface RoomProfile { id: string; name: string; minC: number; maxC: number; }
export interface Camera { id: "cam1" | "cam2" | "cam3" | "cam4"; label: string; position: "N" | "E" | "S" | "W"; status: "online" | "warning" | "offline"; resolution: string; fps: number; }

export interface Session {
  id: string;                    // "s2026-11-17"
  date: string;                  // ISO
  start: string; end: string;    // "18:30", "20:00"
  type: "Technique" | "Live sparring" | "Conditioning" | "Competition prep";
  coachId: string;
  roomTempC: number;
  humidity: number;
  roomProfileId: string;
  blocks: { name: string; startMin: number; endMin: number }[];
}

export interface Participation {
  sessionId: string;
  athleteId: string;
  minutesOnMat: number;
  avgHr: number;
  peakHr: number;
  minutesAbove170: number;
  takedownAttempts: number;
  takedownsCompleted: number;
  shotsDefended: number;
  shotsFaced: number;
  load: number;                  // 0–100
  skinTempPeak: number;
}

export interface Flag {
  id: string;
  sessionId: string;
  athleteId: string;
  opponentId?: string;
  kind: FlagKind;
  level: RiskLevel | "positive";
  minute: number;                // minutes from session start, decimals allowed
  clock: string;                 // "19:11:03"
  zone?: BodyZone;
  cameras: Camera["id"][];
  source: "camera" | "wristband" | "thermal" | "combined";
  description: string;
  seen: boolean;
}

export interface VitalsSample { t: number; hr: number; skinTemp: number; accelG: number; }

export interface WeeklyProgress {
  athleteId: string;
  week: string;                  // "W45"
  riskyLandingsPerSession: number;
  takedownSuccessPct: number;
  avgLoad: number;
  sessions: number;
}

export interface Exercise { id: string; name: string; category: "general" | "mobility" | "shoulder" | "neck" | "hips" | "knees" | "falls" | "technique" | "partner"; defaultMin: number; }
export interface WarmupStep { exerciseId: string; minutes: number; reason: string; change: "standard" | "added" | "adjusted"; }
export interface WarmupPlan { athleteId: string; date: string; steps: WarmupStep[]; notes: string[]; status: "suggested" | "approved" | "standard"; }

export interface Device { id: string; kind: "edge" | "router" | "thermal" | "band"; label: string; status: "online" | "warning" | "offline"; battery?: number; firmware?: string; lastSeen: string; detail: string; }
export interface ConsentSettings { athleteId: string; shareVitals: boolean; shareVideo: boolean; research: boolean; cloudBackup: boolean; consentDate: string; parentConsent?: string; }

export interface PoseFrame { a: [number, number][]; b: [number, number][]; }
```

### 7.2 Hand-written data

**Club:** Demo Wrestling Club, Lille, 1 mat. Network: local only, internet off, 3 sessions waiting to sync.

**Coaches:**

| id | Name | Role |
|---|---|---|
| c1 | David Thompson | Head coach |
| c2 | Sarah Nguyen | Assistant coach |
| c3 | Karim Mansouri | Strength and conditioning |

**Room profiles:** Cool hall (17–20°C), Standard hall (20–23°C), Warm hall (23–27°C).

**Athletes (18):** the first two are our personas; keep them exactly as written.

| id | Name | Sex | Age | Weight | Style | Level | Resting HR | Max HR | Preferred risk zone | Base flags / session | Improvement / week |
|---|---|---|---|---|---|---|---|---|---|---|---|
| a01 | Jack Miller | M | 21 | 74 kg | Freestyle | Competitive | 52 | 196 | shoulder_r | 4.5 | −0.06 |
| a02 | Emily Carter | F | 19 | 57 kg | Freestyle | Beginner | 64 | 201 | upper_back | 3.0 | −0.04 |
| a03 | Lucas Martin | M | 23 | 86 kg | Greco-Roman | Competitive | 55 | 192 | head_neck | 3.6 | −0.01 |
| a04 | Inès Benali | F | 20 | 62 kg | Freestyle | Competitive | 54 | 199 | knee_l | 1.4 | −0.02 |
| a05 | Samuel Okoro | M | 24 | 97 kg | Freestyle | Intermediate | 60 | 190 | upper_back | 2.2 | −0.02 |
| a06 | Hugo Lefèvre | M | 17 | 65 kg | Greco-Roman | Beginner | 66 | 203 | shoulder_l | 2.8 | −0.05 |
| a07 | Chloé Dubois | F | 22 | 53 kg | Freestyle | Competitive | 50 | 198 | knee_r | 1.8 | 0.00 |
| a08 | Yanis Haddad | M | 20 | 70 kg | Greco-Roman | Intermediate | 58 | 197 | shoulder_r | 2.0 | −0.03 |
| a09 | Noah Petit | M | 18 | 79 kg | Freestyle | Intermediate | 61 | 200 | knee_l | 2.4 | −0.03 |
| a10 | Amara Diallo | F | 21 | 68 kg | Freestyle | Competitive | 53 | 197 | hip_r | 1.2 | −0.01 |
| a11 | Léo Garnier | M | 16 | 60 kg | Freestyle | Beginner | 68 | 204 | head_neck | 3.4 | −0.07 |
| a12 | Manon Roux | F | 18 | 50 kg | Freestyle | Intermediate | 62 | 202 | shoulder_l | 1.9 | −0.03 |
| a13 | Rayan Belkacem | M | 22 | 92 kg | Greco-Roman | Competitive | 54 | 193 | lower_back | 2.1 | −0.02 |
| a14 | Thomas Fontaine | M | 25 | 125 kg | Freestyle | Intermediate | 62 | 186 | knee_r | 2.6 | −0.01 |
| a15 | Sofia Moreau | F | 17 | 55 kg | Freestyle | Beginner | 67 | 204 | upper_back | 2.9 | −0.06 |
| a16 | Maxime Laurent | M | 19 | 61 kg | Greco-Roman | Intermediate | 59 | 200 | ankle_l | 1.7 | −0.02 |
| a17 | Aïcha Traoré | F | 23 | 76 kg | Freestyle | Competitive | 52 | 195 | shoulder_r | 1.5 | −0.02 |
| a18 | Victor Blanc | M | 20 | 82 kg | Greco-Roman | Beginner | 65 | 199 | head_neck | 3.1 | −0.05 |

Other fields: `memberSince` between 2022 and 2026 (Jack: 2024-09-02, Emily: 2026-09-14). `baselineSkinTemp` 33.6–34.4. `bandId` "B-01" to "B-18". Athletes under 18 (a06, a11, a15) need `parentConsent`.

**Exercise library (24):** easy jog and skips; jumping jacks; dynamic hip openers; leg swings; walking lunges with twist; arm circles; band shoulder external rotations; band pull-aparts; scapular push-ups; forward shoulder rolls; backward shoulder rolls; break-fall practice (side); neck bridges (light); neck isometrics with partner; hip heists; sit-outs; knee circles and ankle mobility; single-leg balance reach; penetration step drill; sprawl drill; stance and motion; level-change drill; partner hand-fighting (50%); light drilling of go-to attack.

**Alert templates (`alertTemplates.ts`):** at least 3 wording variations per `FlagKind`, using placeholders, e.g.:
- `neck_landing`: "Landed on head and neck after a {move}", "Head and neck took the landing on a {move}", ...
- `shoulder_landing`: "Landed on point of {side} shoulder during {situation}", ...
- `high_hr_sustained`: "Heart rate above {hr} bpm for {min} minutes", ...
- `good_finish`: "Clean finish on {move}, safe landing for both athletes"
Moves: hip throw, double-leg, single-leg, headlock, arm drag, gut wrench, suplex, ankle pick, duck-under. Situations: sprawl defence, scramble, single-leg defence, front headlock, par terre.

### 7.3 Generation rules (`generators.ts`)

**Sessions:** 12 weeks ending **Saturday 21 Nov 2026** but the demo "today" is **Tuesday 17 Nov 2026** (sessions after today are not generated). Weeks W35–W46, 3 sessions per week (Tue 18:30–20:00, Thu 18:30–20:00, Sat 10:00–11:30). Types rotate: Tue "Live sparring", Thu "Technique", Sat "Competition prep" (every 4th Saturday "Conditioning"). Room temp drifts colder over the autumn: September 22–24°C, October 20–22°C, November 17–20°C (pick the matching room profile). Blocks: warm-up 0–15, technique 15–40, live sparring 40–80 (5 rounds of 8 min), cool-down 80–90.

**Participation:** each athlete attends each session with probability 0.85 (Competitive 0.92, Beginner 0.75). Minutes on mat 35–55. HR: `avgHr ≈ restingHr + 0.62 × (maxHr − restingHr) ± 5`, peak `≈ 0.94 × maxHr ± 4`. Load from minutes, avg HR and session type (Live sparring highest). Takedowns: attempts 6–16; success rate starts at a level-based base (Beginner 35%, Intermediate 45%, Competitive 50%) and improves by 1–2 points per week with noise; Jack must reach 64% in the last week.

**Flags:** number of risky flags per participation ≈ Poisson-like around `baseFlagRate + improvementPerWeek × weekIndex`, never below 0. 60% of risky landings use the athlete's `preferredZone`, the rest random. Level: neck/head and knee twist → mostly high; shoulder → mostly med; mat edge, temp rise → low. Add 0–2 `good_finish` positive flags per participation. Flags only happen in the technique and sparring blocks, mostly in sparring. Cameras: 1–2 random, matching the zone direction where possible.

**Vitals samples (lazy):** for a participation, one sample per 10 s across 90 min. HR follows the blocks (warm-up ramp, technique moderate, sparring rounds with peaks and 1-min rests, cool-down decay) plus noise; skin temp rises 0.6–1.4°C during sparring; spikes in `accelG` at flag times. Memoise per `sessionId:athleteId`.

**Weekly progress:** aggregate participations and flags per week per athlete.

**Warm-up plans (rules engine):** start from the standard 15-minute plan (jog 3, hip openers 2, arm circles 2, neck bridges 2, stance and motion 3, partner hand-fighting 3). Then:
- 2+ shoulder landings last session → add band external rotations (2) and shoulder rolls on the risky side (3), reason "Added: {n} {side}-shoulder landings last session".
- Any neck/head flag in last 2 sessions → add neck isometrics (2) and break-fall practice (2).
- Knee twist flag → add knee circles and ankle mobility (2) and single-leg balance reach (2).
- Room profile Cool hall → extend jog by 1 min and add 2 min of mobility, note "Room profile Cool hall: warm-up extended".
- 7-day load > 80 → shorten partner hand-fighting by 1 min, note "Load last 7 days is high ({load}/100): partner drills kept at 50%".
- Hips-high-on-shot flags ≥ 3 in last 2 weeks → swap stance and motion for level-change drill, change "adjusted".
Cap plans at 22 minutes.

**Devices:** edge unit "MatMetrics Edge 01, model v0.4.2", router "5 GHz, 23 devices", thermal camera "Snapshot mode", 18 bands with battery 40–95% (Chloé Dubois 47%), firmware "1.3.0" (two bands on "1.2.4" with a "Update available" low tag).

### 7.4 The fixed demo story (must match exactly)

After generation, **override** the 17 Nov session so the pitch story is always the same:

- Session `s2026-11-17`, Live sparring, 18:30–20:00, room 19.5°C, 48% humidity, Cool hall.
- **Jack Miller** that session: 46 min on mat, avg HR 161, peak HR 184, 14 min above 170, takedowns 9 / 14, shots defended 6 / 8, load 82. Flags:
  - 39:58 (19:09:58) MED shoulder_landing right, "Landed on right shoulder during sprawl defence", CAM 1
  - 41:03 (19:11:03) MED shoulder_landing right, "Landed on point of right shoulder, second time in two minutes", CAM 1 + CAM 4
  - 52:30 (19:22:30) LOW hips_high_on_shot, "Hips rose before the level change on a double-leg", CAM 3
  - 61:40 (19:31:40) MED shoulder_landing right, "Landed on right shoulder during single-leg defence", CAM 4
  - 74:15 (19:44:15) POSITIVE good_finish, "Clean finish on a single-leg, safe landing for both athletes", CAM 2
- **Lucas Martin**: 22:14 (18:52:14) HIGH neck_landing "Landed on head and neck after a hip throw", CAM 2 + CAM 3; 52:09 (19:22:09) HIGH knee_twist "Knee twisted on planted foot during scramble", CAM 2.
- **Chloé Dubois**: 34:40 (19:04:40) MED high_hr_sustained "Heart rate above 175 bpm for 8 minutes", wristband.
- **Samuel Okoro**: 45:27 (19:15:27) LOW mat_edge "Close to mat edge during takedown", CAM 3.
- **Emily Carter**: 56:45 (19:26:45) LOW temp_rise "Skin temperature rising faster than her usual pattern", wristband + thermal.
- Jack's AI summary must read: "You landed on your right shoulder three times, each time while defending a leg attack. Your hips rose before your level change on some of your shots, which slows them down. Next session, focus on posting your hand and rolling through the back of the shoulder, and on dropping your level before you step in."
- Jack's 12-week risky landings per session go from **4.5 (W35)** to **2.2 (W46)** so the profile headline reads "Risky landings down 51% in 12 weeks". Takedown success ends at **64%**.
- Jack's upcoming plan (Thu 19 Nov) is **18 minutes**, status SUGGESTED, and includes the shoulder additions and the Cool hall and high-load notes.

### 7.5 AI summary template

For any other athlete/session, build the summary from the flags: sentence 1 states the most frequent risky pattern with count and zone; sentence 2 states one technique pattern (hips high, fatigue slowdown) if present, otherwise a positive note; sentence 3 gives the matching coaching cue from a small lookup table per `FlagKind`. Maximum 3 sentences, plain words, no exclamation marks.

---

## 8. Live session simulation

### 8.1 State (`LiveSessionContext.tsx`)

```ts
interface LiveState {
  sessionId: string;            // "s2026-11-17"
  elapsedSec: number;           // starts at 57*60 + 20 (19:27:20) so the demo opens mid-session
  running: boolean;
  speed: 1 | 4 | 16;
  pairs: { id: string; a: string; b: string; x: number; y: number }[];
  vitals: Record<string, { hr: number; skinTemp: number; load: number; history: number[] }>;
  alerts: Flag[];               // newest first
  activeFlags: { flagId: string; cameras: Camera["id"][]; until: number }[];
  cameraStatus: Record<Camera["id"], Camera["status"]>;
  latencyMs: number;
}
```

Use `useReducer` with actions: `TICK`, `SET_SPEED`, `TOGGLE_RUNNING`, `MARK_SEEN`, `RESET`. One `setInterval` at 1000 ms real time; each tick advances `elapsedSec` by `speed`.

On mount, pre-load all scripted alerts that happened **before** 19:27:20 (so the stream already has the 8 alerts from Section 7.4 that happened before 19:27:20: Jack ×3, Lucas ×2, Chloé, Samuel, Emily). Then continue the script.

### 8.2 Script (`liveScript.ts`)

A list of timed events from 57:20 to 90:00, for example:
- 61:40 Jack shoulder landing (MED)
- 63:05 Inès Benali knee_twist (HIGH) on CAM 1
- 66:30 Thomas Fontaine high_hr_sustained (MED)
- 70:00 block change "Live sparring, round 5 of 5"
- 74:15 Jack good finish (positive, shown in stream with green bar, no camera box)
- 77:50 Léo Garnier neck_landing (HIGH)
- 80:00 block change "Cool-down"; HR values decay
- plus generated LOW filler events (mat edge, temp rise) every 2–4 minutes

Pairs on the mat at 19:27: Jack Miller vs Noah Petit, Lucas Martin vs Samuel Okoro, Chloé Dubois vs Inès Benali, Emily Carter vs Hugo Lefèvre, Yanis Haddad vs Amara Diallo, Rayan Belkacem vs Thomas Fontaine, Manon Roux vs Sofia Moreau. Resting on the bench: Léo Garnier, Maxime Laurent, Aïcha Traoré, Victor Blanc (they rotate in at round 5).

### 8.3 Animation

- Vitals: HR random-walks toward a block-based target with noise; sparkline keeps the last 120 values.
- Poses: each camera cycles through the keyframes from `poses.ts`, interpolating linearly at ~12 fps with `requestAnimationFrame`. When a flag fires on a camera, jump that camera to the "landing" keyframe and highlight the flagged athlete for 6 s.
- Respect `prefers-reduced-motion`: stop pose interpolation and fade-ins, keep data updates.

---

## 9. Copy guidelines

- Short, direct sentences. No exclamation marks. No marketing hype inside the app.
- Coach actions: "Review clip", "Mark as seen", "Approve plan", "Run calibration".
- Athlete text is encouraging and specific.
- Always show units: bpm, °C, min, %, kg.
- Dates "Tue 17 Nov"; times 24-hour "19:11"; session video time "39:58".
- Use "flag", "risk", "worth reviewing". Never "injury detected".

## 10. Accessibility

- Text contrast at least 4.5:1, including grey tokens on `--night`.
- Risk never shown by colour alone: always a text label (HIGH / MED / LOW).
- Icon-only buttons have `aria-label`.
- Focus ring: 2px `--accent` outline, 2px offset, on every interactive element.
- Semantic HTML: `<nav>`, `<main>`, `<header>`, `<section>`, real `<table>` with `<th scope>`.
- Live alert stream is an `aria-live="polite"` region.
- Keyboard: all controls reachable with Tab; the video timeline playhead moves with arrow keys.

## 11. Responsiveness

- Coach pages designed for **1280×800** (landscape tablet). Under 1024px: sidebar collapses to 64px icons; split layouts stack.
- `/athlete`: four phones in a row at ≥ 1680px, 2×2 at ≥ 900px, stacked below.
- `/` fully responsive down to 390px.

---

## 12. Build phases and Cursor prompts

Paste these into Cursor one at a time. Review after each phase.

**Phase 1 — Setup and design system**
> Read `MATMETRICS_PROTOTYPE_SPEC.md` fully. Set up the Vite React TypeScript project with the dependencies in Section 2 and the folder structure in Section 3. Create `tokens.css`, `global.css` and `theme.ts` (Section 4.2–4.3). Build the core components in Section 4.4 except the visuals (CameraFrame, PoseSkeleton, BodyMap, MatDiagram). Add routing from Section 6 with placeholder pages inside `AppShell`. Follow every hard rule in 4.1.

**Phase 2 — Mock data**
> Implement Section 7: types, seeded RNG, hand-written data, generators, the fixed demo story overrides in 7.4 and the summary template in 7.5. Export one `mockDb` object from `src/data/index.ts` and a `useMockDb` hook. Add a temporary `/debug` route that prints counts per collection and Jack Miller's 17 Nov participation and flags, so I can verify the numbers match 7.4.

**Phase 3 — Visual components**
> Build `PoseSkeleton` with the keyframes in Section 4.5, `CameraFrame`, `BodyMap` (landing and thermal modes), `MatDiagram`, `ThermalLegend` and `PhoneFrame`. Show them all on the `/debug` page.

**Phase 4 — Live session**
> Implement `LiveSessionContext` and `liveScript` (Section 8), then build `/coach/live` (6.3) and `/coach` dashboard (6.2), both reading live state. Include playback speed, alert drawer, camera enlarge and keyboard shortcuts.

**Phase 5 — Reviews and athletes**
> Build `/coach/reviews`, `/coach/reviews/:sessionId/:athleteId`, `/coach/athletes` and `/coach/athletes/:athleteId` (6.4–6.7) with recharts styled as in 4.3.

**Phase 6 — Warm-ups, system, privacy**
> Build `/coach/warmups`, `/coach/system` and `/coach/privacy` (6.8–6.10) with `SettingsContext` persisting to localStorage.

**Phase 7 — Athlete app and landing**
> Build `/athlete` (6.11) with four interactive phone frames sharing `SettingsContext`, then the landing page `/` (6.1).

**Phase 8 — Polish and checks**
> Remove `/debug` from the navigation (keep the route). Check responsiveness (Section 11) and accessibility (Section 10). Run `npm run build` and fix all TypeScript errors. Then run the checklist in Section 13 and list anything that fails.

---

## 13. Quality checklist

- [ ] No emojis anywhere (search the codebase).
- [ ] No card grids; bordered containers only where Section 4.1 allows.
- [ ] No box-shadows except phone frame, drawers, modals.
- [ ] No background gradients outside data visuals.
- [ ] All numbers in `--font-data` with tabular figures.
- [ ] Demo story values match Section 7.4 on every screen (dashboard, live, review, profile, warm-up, athlete app).
- [ ] Same numbers after a page reload (seeded RNG).
- [ ] Every risk colour has a text label.
- [ ] Network status visible on every coach page.
- [ ] Live page runs smoothly at 16× speed for the full session without errors.
- [ ] `npm run build` passes with `strict: true` and no `any`.
- [ ] Settings and approvals survive a reload (localStorage); a "Reset demo" text link in the sidebar footer clears them.
- [ ] "Demo data. Not a medical device." appears on every page.

---

## 14. Demo script for the pitch (2 minutes)

1. `/`: one sentence on the problem, click "Open live session".
2. `/coach/live`: set speed to 4×, wait for Jack's 61:40 shoulder flag, open "Review clip" in the drawer, mention it all runs offline.
3. "Open full review" → Jack's review: timeline markers, AI summary, heart rate chart, landing map.
4. Jack's profile: "Risky landings down 51% in 12 weeks."
5. `/coach/warmups`: plan adapted to his shoulder landings; click "Approve plan".
6. `/athlete`: Jack's phone shows "Approved by Coach David"; open the privacy toggles.
7. Close on the system page: local network, data stays in the club.
