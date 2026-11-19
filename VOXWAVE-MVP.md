# VoxWave MVP — master brief for the build

> **Read this whole document before writing any code.** It is the single source of truth for what to build,
> what *not* to build, how it must look and how we will demo it. If something here conflicts with your
> defaults, this document wins. If something is missing, choose the simplest option that keeps the demo
> safe and beautiful, and note the decision in `DECISIONS.md`.

---

## 0. TL;DR

Build **one web app** with two portals:

- **`/patient`** — a mobile-first portal where a person with Parkinson's does a **3-minute daily voice
  session** (three short activities) with a **real microphone and live waveform**, and sees their streak
  and progress.
- **`/clinic`** — a desktop dashboard where a neurologist sees **all patients at a glance**, opens a
  **patient detail** (trends, biomarkers, sessions, one-page report) and **syncs the VoxWave home device**
  (a Raspberry Pi prototype that appears as a USB drive).

Everything is **hardcoded / simulated** except: the microphone, the recording, the live waveform, the
patient → clinic hand-off inside the same browser, and reading the device's files from the USB drive.
**No backend. No database. No real AI. No login.** It must be **stunning**: smooth, elaborate animations
that catch the eye, in the same visual language as our pitch video.

It is deployed publicly (Vercel) so **anyone can try the patient side**.

---

## 1. Context

### The team and the event
- Team **FdiProtocol** (Martin — Voice AI & ML, Marco — Product design & finance, Victor — Marketing &
  go-to-market, Javier — Hardware). Hackathon **Creative Shock 2026**, we are in the **final**.
- The final pitch is ~5 minutes. The MVP is shown live for ~60–90 s (see §13 Demo script). The jury
  values: problem, solution & innovation, SDG impact, **build potential (vibe-coding)**, business, story.

### The problem
- More than 10 million people live with Parkinson's. Speech changes in ~90% of them, often early.
- Between neurology visits (often **months** apart, with long waiting lists) **nobody is listening**:
  changes go unnoticed until the next check-up.

### The product: VoxWave
- **A daily voice session of about 3 minutes**, like a small habit: *hold an "aah"*, *read a line*,
  *chat a little* (a short "practice call" on a topic of the day).
- Done in the **patient app**, or — for people **without a smartphone or internet** — on a **simple
  one-button home device** with a small screen. The device stores sessions and **syncs when it is plugged
  into the doctor's computer** at each check-up.
- Our AI tracks **tremor, pitch, rhythm and pauses** against **each patient's own baseline** and flags
  when the voice starts to drift. **We measure; doctors decide.** The patient never gets a diagnosis — at
  most "please contact your neurologist".
- Before each check-up, the neurologist gets **one clear page**.
- Business (for context only, not shown in the app): B2B + B2G, €40/month per patient, free for the
  patient, device included if needed. Start in Lithuania, then the Baltics and the EU.
- SDG 3 (Good health and well-being) and SDG 10 (Reduced inequalities: rural / offline patients).

### Consistency with the pitch video
The jury will have just watched our video. **Reuse its look, words and numbers** so the live demo feels
like the video coming to life (see §4 and §9). In particular the video showed this clinician dashboard:
"Clinician dashboard · Today · 24 patients monitored", a **Live check-in** card, **Biomarkers · today**
(Tremor 1.8 %, Pitch 124 Hz, Rhythm 4.2 syl/s, Pauses 0.38 s), **Voice trend · 14 weeks** with a
**personal baseline** band, and the alert **"Voice drift detected · Patient 0187 · 2 weeks outside
personal baseline · Schedule a visit"**. Use these exact values.

---

## 2. Goals and non-goals

### Goals (must)
1. Patient portal: welcome + consent, home with streak, the 3-activity session with **real mic + live
   waveform + recording**, "analysing" moment, result, progress.
2. Clinic portal: dashboard (all patients, status, trends, alerts), patient detail, one-page report,
   **"Sync VoxWave device"** reading real files from the USB drive.
3. **Patient → clinic hand-off in the same browser**: a session finished in `/patient` appears in
   `/clinic` (live, if both are open in two tabs/windows), including the **playable recording**.
4. **Eye-catching motion** everywhere (see §5.4). This is a pitch: it must look like a product launch.
5. **Demo-proof**: hidden demo controls (§11) so every key moment can be forced if anything fails.
6. Public deployment on Vercel, works on a phone (patient) and on a laptop (clinic).

### Non-goals (do not build)
- No backend, no database, no API, no real authentication, no user accounts.
- No real voice analysis / ML. Biomarker values are **precomputed / scripted** (§10).
- No audio ever leaves the user's device. Nothing is uploaded anywhere.
- No real-time link between two different devices (phone ↔ laptop). Same-browser only (BroadcastChannel).
- No i18n (English only), no notifications/push, no payments.
- Do not present anything as a medical diagnosis. Always show "Prototype · illustrative data".

---

## 3. Tech stack (use exactly this unless blocked)

| Concern | Choice |
|---|---|
| Build | **Vite + React 18 + TypeScript** (strict) |
| Routing | React Router (SPA) |
| Styling | **Tailwind CSS** with the design tokens of §4 as CSS variables + Tailwind theme |
| Motion | **Framer Motion** (`motion`) for transitions, springs, layout animations, staggers |
| State | **Zustand** with `persist` (localStorage) for app data; **IndexedDB** (`idb-keyval`) for audio blobs |
| Cross-tab | **BroadcastChannel** (`voxwave-demo`) + `storage` event fallback |
| Audio | Web Audio API (`getUserMedia` → `AnalyserNode`) for the live waveform; `MediaRecorder` for recording |
| Charts | **Hand-made SVG** components (line + baseline band, sparklines, rings). No heavy chart library. |
| Icons | `lucide-react` (stroke icons match our line-art style) |
| Fonts | Google Fonts: **Sora** (display) and **Inter** (UI) |
| Device sync | **File System Access API** (`showDirectoryPicker`) with fallback `<input type="file" webkitdirectory>` |
| Deploy | **Vercel**, SPA rewrite to `index.html`. HTTPS is required for the mic and the directory picker. |

Target browsers: **Chrome/Edge desktop** for `/clinic` (directory picker), **Chrome Android & Safari iOS**
for `/patient`. Everything must also work on desktop Chrome for the stage demo.

---

## 4. Brand and design system

### 4.1 Colors (define as CSS variables and Tailwind colors)
| Token | Value | Use |
|---|---|---|
| `navy` / `ink` | `#092634` | Main text, dark surfaces |
| `navyDeep` | `#04141C` | Deepest dark backgrounds |
| `teal` | `#004E72` | Secondary brand, charts |
| `tealBright` | `#2F9BCB` | Only on dark surfaces (e.g. phone/session screens) |
| `coral` | `#FF6E42` | **Signal color**: alerts, primary actions, the voice, highlights |
| `coralSoft` | `#FF9A7A` | Soft coral fills |
| `paper` | `#F1EDE4` | **Default background** (matte paper) |
| `paperShade` | `#E4DED2` | Subtle panels |
| `card` | `#FBF9F4` | Cards |
| `white` | `#F4F8FA` | Text on dark |
| `inkSoft` | `rgba(9,38,52,0.55)` | Secondary text |
| `inkFaint` | `rgba(9,38,52,0.12)` | Hairlines, borders |
| Status | stable `#2E8B6E` (muted green), watch `#E0A33A` (amber), alert = `coral` | Patient status chips |

Style rules: **matte paper background with a very subtle grain**, navy ink text, flat shapes, **line-art
icons and charts**, coral reserved for "signal". **No blue gradients or glows on paper.** Dark (navy)
surfaces are allowed for the patient's session screen and "lights down" moments (like the video).

### 4.2 Typography
- **Sora** 600/700/800 for titles, big numbers and the logo moments. Tight letter-spacing on big sizes.
- **Inter** 400–700 for UI text. Uppercase labels use letter-spacing ~0.15em (e.g. `LIVE CHECK-IN`).

### 4.3 Logo
The logo is three strokes (navy, coral, teal) forming a "VW" wave + the wordmark "VoxWave" (Vox in navy,
Wave in teal). Get the SVG from the pitch repo: `src/brand/logo.ts` (paths split into symbol and wordmark)
or `Recursos/Logo.svg` (https://github.com/MarcoGarLop/voxwave-video-pitch). Use the symbol alone as the
app icon / favicon.

### 4.4 Motion principles (this is a priority, not decoration)
- **Springs, not linear tweens.** Elements arrive with a slight overshoot; nothing just "appears".
- **Stagger** lists and card grids (40–70 ms per item).
- **Numbers count up** when they first appear (patients monitored, streak, biomarkers).
- **Charts draw themselves** (stroke-dash animation), the baseline band fades in behind, the last point
  pops in coral if it is outside the band.
- **The voice wave is the recurring motif**: live waveform during recording, a calm idle wave elsewhere,
  the "Analysing…" moment (three strokes coral/teal/navy morphing into the logo, as in the video).
- **Page transitions**: shared-element feel (a patient card expands into the patient detail).
- **Alerts pulse** softly in coral (never flashing aggressively).
- Respect `prefers-reduced-motion` (fall back to fades). Keep 60 fps: animate transform/opacity only.

### 4.5 UI copy rules
English, warm, short, plain words. Patient-facing text never mentions disease, scores or diagnosis.
Clinician-facing text is precise and calm. Always label scripted data: small footer
**"Prototype · illustrative data · not a medical device"**.

---

## 5. Information architecture

```
/                       Landing: "Try the patient app" / "Open the clinician dashboard" + one-line pitch
/patient                → redirects to /patient/welcome (first time) or /patient/home
/patient/welcome        Welcome + consent (one step)
/patient/home           Greeting, streak, today's session card, week progress
/patient/session        The session: 3 activities (one route, internal steps)
/patient/result         Session complete (streak +1) or "please contact your neurologist" (scripted)
/patient/progress       Calendar of sessions + friendly trend (no clinical numbers)
/clinic                 → /clinic/login
/clinic/login           Fake sign-in (one button: "Sign in as Dr. Emma Lewis")
/clinic/dashboard       All patients at a glance + alerts + live feed + "Sync VoxWave device"
/clinic/patients/:id    Patient detail
/clinic/patients/:id/report   One-page clinician report (printable)
```

The landing must also be beautiful: big logo animation (three strokes forming the symbol), the one-liner
"A daily voice check-in for Parkinson's — between visits, someone is listening.", and the two entry
buttons. On a phone, default the CTA to the patient app.

---

## 6. Patient portal (`/patient`, mobile-first)

Design: phone-sized layout (max-width ~430 px centered on desktop, with a subtle device frame on large
screens so it looks like a phone on stage). Paper background on home/progress; **navy session screen**.

### 6.1 Welcome + consent
- Logo animation, "Hi, I'm VoxWave." Short explanation: "Every day, a 3-minute voice session. Your doctor
  sees how your voice is doing between visits."
- Consent card: "Your recordings stay on this device in this demo." Checkbox + "Start" button.
- Ask the patient's first name (optional, default "Alex"). This creates the **demo patient** `P-DEMO`.

### 6.2 Home
- "Good morning, {name}" (time-aware greeting), date.
- **Streak** with flame icon and count-up (seeded: day 46 → becomes 47 after today's session).
- Big **"Today's session · 3 min"** card with the three activity icons, primary coral button "Start".
  After completion: card turns into "Done for today ✓ · See you tomorrow".
- Week strip (Mon–Sun) with done/missed dots, animated.
- Small idle voice wave animating behind the header.

### 6.3 Session (the core; must be flawless)
Navy screen, progress bar at top (3 segments), step title, big live waveform.
1. **Hold an "aah"** — instruction + illustration; tap "I'm ready" → mic permission (if not yet) → 3-2-1
   countdown → **5 s recording** with a circular timer and the **live waveform reacting to the voice**.
2. **Read a line** — the sentence **"The river runs past the old mill."** shown big; words light up one by
   one (karaoke) at a steady pace while recording (~6 s). Live waveform below.
3. **Chat a little** — "Practice call" UI: topic card "Tell us about your morning." + "Take your time —
   about 20 seconds." Live waveform + elapsed timer + "Finish" button (auto-finishes at 30 s).
- Between steps: a satisfying check animation and slide transition.
- Record each activity with `MediaRecorder`; store blobs in IndexedDB under the new session id.
- Measure real, simple numbers (no AI): duration of each activity and average/peak loudness (RMS). These
  are stored but not shown to the patient.
- If the mic is denied/unavailable: show a friendly message and offer **"Continue in demo mode"** (a
  synthetic waveform animates instead; the session still completes). The demo must never get stuck.

### 6.4 Analysing
2–3 s full-screen moment: the waveform calms into three strokes (navy/coral/teal) that morph into the
VoxWave symbol; "Listening closely…" → "Done". (Reuse the feel of the video's logo animation.)

### 6.5 Result
- Default (**scripted "stable"**): "Session complete ✓", streak +1 with a subtle confetti burst, "See you
  tomorrow". A warm one-liner ("Your voice sounded steady today.") — no numbers.
- Scripted **"attention"** (only via demo controls §11): "Thanks, {name}. Your voice sounded a little
  different this week. **Please contact your neurologist** — they'll take a look." Coral, calm, no alarm.
- On result, the session is **published to the clinic** (§9.3).

### 6.6 Progress
Calendar heat-map of the last 8 weeks (done days filled), current/best streak, and a friendly smooth line
"Your voice this month" without units. Button "Back to home".

---

## 7. Clinic portal (`/clinic`, desktop)

Design: paper background, cards in `card`, left sidebar (logo, Dashboard, Patients, Device sync, Reports),
header with "Dr. Emma Lewis · Neurology" and today's date. Footer label "Prototype · illustrative data".

### 7.1 Login
Full-screen paper, logo animation, "Clinician dashboard", one button "Sign in as Dr. Emma Lewis" (no
fields). Transition into the dashboard with the cards staggering in.

### 7.2 Dashboard
- **Header stats** (count-up): "24 patients monitored" (the 8 seeded patients + 16 summarized as "others"
  is fine; or seed 24 lightweight records), "1 voice drift alert", "92 % adherence this week",
  "1 device to sync".
- **Alert banner** (coral, pulsing dot): "Voice drift detected · Patient 0187 · Margaret Collins · 2 weeks
  outside personal baseline" + buttons "Open patient" and "Schedule a visit".
- **Patients grid** (cards): name, id, age, status chip (Stable / Watch / Alert / New / Device), sparkline
  of the 14-week trend with the baseline band, last session ("Today 09:12" / "3 days ago"), streak, small
  icon if they use the home device. Sort: Alert → Watch → New → Stable. Search + status filter chips.
- **Live check-in card** (as in the video): shows the most recent session (the demo patient's if one just
  happened, with a live-looking waveform replay) — "Live check-in · {name} · {activity}".
- **"Sync VoxWave device"** primary button (see §8).
- When a new session arrives from `/patient` (BroadcastChannel), a **toast + the card of `P-DEMO` slides
  to the top with a glow**: "New session received · Alex · just now".

### 7.3 Patient detail (`/clinic/patients/:id`)
- Header: name, id, age, years since diagnosis, status chip, adherence, channel (App / Home device),
  last sync.
- **Voice trend · 14 weeks** (hero chart): weekly points, **personal baseline band** (teal, light fill),
  the line in navy, points outside the band in coral; draws itself on load; hover tooltips.
- **Biomarkers · today** (4 ring/gauge cards, count-up): Tremor (jitter %), Pitch (Hz), Rhythm (syl/s),
  Pauses (s), each with "vs baseline" delta and a tiny sparkline.
- **Sessions list**: date, channel (App/Device), duration, quality flag, **play buttons for each
  activity's audio** (real recordings for `P-DEMO` and device sessions with audio; for seeded patients use
  2–3 short bundled sample clips or a disabled "audio not in demo" state).
- **Clinician notes** (static seeded text + editable textarea stored locally) and buttons
  "Schedule a visit" (fake confirmation animation) and "Open one-page report".
- For **P-0187** the page must clearly show the drift: last 2 weekly points outside the band, coral
  annotation "Outside personal baseline · 2 weeks".

### 7.4 One-page report
A4-proportioned page (exactly what the video promised: "one clear page"): header (patient, period,
clinician), the 14-week trend with band, the 4 biomarkers vs baseline, **quality flags** (e.g. "2 sessions
with background noise"), **session context** (adherence, channel), and a short scripted summary
("Gradual change in pitch variability and pauses over the last 2 weeks. Suggest review at next visit.").
"Print / Save as PDF" button (`window.print()` with a print stylesheet).

---

## 8. Device sync (USB "pendrive" mode) — option A

### 8.1 The idea
The home device (Raspberry Pi) has stored sessions. At the check-up, the clinician plugs it into the
computer; it appears as a **USB drive named `VOXWAVE`**. In the dashboard: **"Sync VoxWave device"** →
browser directory picker → select the drive (or its `VOXWAVE` folder) → the app reads the files →
**animated import** → the device patient's detail updates.

### 8.2 File contract on the drive (the device writes it; the app reads it)
```
VOXWAVE/
  device.json
  sessions.json
  audio/            (optional) WAV files referenced by sessions.json
```
`device.json`
```json
{ "format": "voxwave-device/1", "deviceId": "VW-DEV-0003", "firmware": "0.3-demo",
  "patientId": "P-0142", "patientName": "Robert Hayes", "exportedAt": "2026-11-20T09:30:00Z" }
```
`sessions.json`
```json
{ "format": "voxwave-sessions/1", "patientId": "P-0142",
  "sessions": [
    { "id": "D-2026-11-14", "startedAt": "2026-11-14T08:05:00Z", "channel": "device",
      "activities": [
        { "type": "sustained_vowel", "durationSec": 5.1, "audio": "audio/2026-11-14_aah.wav" },
        { "type": "reading", "durationSec": 6.3, "audio": "audio/2026-11-14_read.wav" },
        { "type": "conversation", "durationSec": 21.8, "audio": "audio/2026-11-14_chat.wav" }
      ],
      "result": { "status": "stable", "deviceAlertShown": false,
        "metrics": { "jitterPct": 1.6, "pitchHz": 128, "rhythmSylPerSec": 4.3, "pauseSec": 0.36 } },
      "quality": { "noise": "low" } }
  ] }
```
The app must validate the format, ignore unknown fields, and tolerate missing audio files.

### 8.3 Sync UX (make it a show)
1. Modal "Connect your VoxWave device" with an illustration of the device + cable, steps "Plug the device
   into this computer → Choose the VOXWAVE drive". Button "Choose device".
2. After picking: device card lights up ("VW-DEV-0003 · Robert Hayes · 7 sessions found"), then
   **data packets (coral/teal dots) flow from the device illustration into the dashboard**, a progress
   ring counts sessions, each session row drops into the list.
3. Done state: "Synced 7 sessions · last one today 08:05" + "Open Robert's sessions".
4. Robert's card on the dashboard updates (status, last sync, sparkline extends with a draw animation).
5. **Fallback**: if the picker is unsupported/cancelled/fails → the demo control "Load device data"
   (§11) imports the same bundled `sample-device/` content with the same animation.

### 8.4 Browser notes
`showDirectoryPicker` works in Chrome/Edge over HTTPS (Vercel) or localhost. Use the `webkitdirectory`
input as fallback. Never write to the drive.

---

## 9. Data

### 9.1 Seeded people (generic English names)
Clinician: **Dr. Emma Lewis**, Neurology, "VoxWave Demo Clinic".

| id | Name | Age | Channel | Status | Story for the demo |
|---|---|---|---|---|---|
| **P-0187** | **Margaret Collins** | 71 | App | **Alert** | 2 weeks outside personal baseline (pitch variability ↓, pauses ↑). The hero alert from the video. |
| **P-0142** | **Robert Hayes** | 78 | **Home device** | Device | Lives rurally, no smartphone. Data arrives only through device sync. |
| P-0156 | James Turner | 66 | App | Watch | Pauses slightly rising, still inside the band. |
| P-0203 | Linda Morgan | 69 | App | Stable | Very steady, long streak (58 days). |
| P-0219 | Patricia Bennett | 74 | App | Stable | Steady. |
| P-0174 | Thomas Reed | 63 | App | Stable | Steady, recently improved after medication change (note). |
| P-0231 | Susan Walker | 67 | App | New | Building baseline (3 weeks of data, band dashed). |
| P-0198 | David Clarke | 72 | App | Watch | Adherence dropping (missed 3 sessions this week). |
| P-DEMO | {name entered, default "Alex"} | — | App | New | Created by whoever tries the patient app. |

Optionally add 16 lightweight "other" patients (stable) so "24 patients monitored" is literal.

### 9.2 Types (TypeScript, suggested)
```ts
type Status = 'stable' | 'watch' | 'alert' | 'new' | 'device';
type Channel = 'app' | 'device';
type Metrics = { jitterPct: number; pitchHz: number; rhythmSylPerSec: number; pauseSec: number };
type ActivityType = 'sustained_vowel' | 'reading' | 'conversation';
interface Activity { type: ActivityType; durationSec: number; audioKey?: string; rmsAvg?: number; rmsPeak?: number }
interface Session { id: string; patientId: string; startedAt: string; channel: Channel;
  activities: Activity[]; result: { status: 'stable' | 'attention'; metrics: Metrics };
  quality?: { noise: 'low' | 'medium' | 'high' } }
interface WeeklyPoint { week: string; score: number }           // composite "voice stability" index
interface Patient { id: string; name: string; age: number; yearsSinceDiagnosis: number; channel: Channel;
  status: Status; streak: number; adherencePct: number; baseline: { low: number; high: number };
  trend: WeeklyPoint[]; latest: Metrics; baselineMetrics: Metrics; notes: string[]; lastSessionAt?: string;
  deviceId?: string; lastSyncAt?: string }
```

### 9.3 How data flows (all client-side)
- Seed data lives in `src/data/seed.ts` (deterministic; use a seeded PRNG for trends so charts look
  natural but are identical on every load).
- App state (sessions created by the patient portal, synced device sessions, notes) lives in a Zustand
  store persisted to localStorage; audio blobs in IndexedDB keyed by `sessionId/activityType`.
- When the patient finishes a session: append it to `P-DEMO`, update streak, and post
  `{type:'session:new', sessionId}` on the BroadcastChannel. `/clinic` listens and animates it in.
- Scripted analysis: `scriptedResult(mode)` returns metrics close to baseline for `stable`, or shifted
  values (pitch variability down, pauses up) for `attention`. Default mode: `stable`.
- The **demo scenario** reproduces the video values for P-0187 (latest: Tremor 1.8 %, Pitch 124 Hz,
  Rhythm 4.2 syl/s, Pauses 0.38 s; last 2 weekly points outside the band).
- "Reset demo" restores seed data and clears local recordings.

---

## 10. Hardcoding policy
Hardcode everything that does not need to be live: clinician, patients, history, biomarkers, alerts,
quality flags, report text, adherence, notes, device id. **Real**: microphone, waveform, recordings,
durations/loudness, the patient → clinic hand-off in the same browser, and reading the device files.
Prefer readable data files over generated complexity.

---

## 11. Demo controls (hidden, for the stage)
Open with **`Shift + D`** (or `?demo=1` in the URL). A small floating panel with:
- **Next result: Stable / Attention** (what the patient's next session will return).
- **Simulate session from patient** (inject a finished `P-DEMO` session with bundled sample audio) — in
  case the mic fails on stage.
- **Load device data** (import `public/sample-device/` with the full sync animation) — fallback for §8.
- **Trigger P-0187 alert animation** (replays the alert banner entrance).
- **Reset demo** (seed state, clear recordings, streak back to 46).
- Toggle **reduced motion** for testing.
The panel must be invisible otherwise and never block normal use.

---

## 12. Project structure (suggested)
```
src/
  app/            routes, layout shells (PatientShell, ClinicShell), providers
  design/         tokens.css, tailwind theme, Grain background, motion presets
  components/     Logo, LogoAnimation, VoiceWave (live/idle), Waveform replay, Sparkline, TrendChart,
                  BiomarkerRing, StatusChip, StatCounter, Toast, DeviceIllustration, DataPacketsFlow
  features/patient/   Welcome, Home, Session (steps), Analysing, Result, Progress
  features/clinic/    Login, Dashboard, PatientDetail, Report, DeviceSyncModal
  audio/          useMicrophone, useAnalyser, recorder, idb storage
  data/           seed.ts, scripted.ts, types.ts, store.ts, broadcast.ts, deviceImport.ts
  demo/           DemoPanel, shortcuts
public/
  sample-audio/   2–3 short sample clips for seeded patients / simulated session
  sample-device/VOXWAVE/  device.json, sessions.json, audio/ (same contract as §8.2)
```

---

## 13. Demo script (what the MVP must make possible, ~90 s)
1. Laptop on the projector with two windows of the same browser side by side: `/clinic/dashboard`
   (already signed in) and `/patient/home` (in its phone frame). A real phone cannot feed the laptop's
   dashboard (no server), so the live hand-off is always shown on the laptop.
2. Presenter does today's session in the patient window: "aah" → read the line → chat → analysing →
   "Session complete". The live waveform visibly follows the voice.
3. The dashboard window shows "New session received · Alex · just now"; the Live check-in card replays it;
   open it and **play the recording**.
4. Point at the coral alert: open **Margaret Collins (P-0187)** → the trend draws, the last two points fall
   outside the band → open the **one-page report**.
5. Plug the Raspberry Pi device → **Sync VoxWave device** → choose `VOXWAVE` → packets flow → "Synced 7
   sessions" → Robert Hayes' card updates. "Patients without a smartphone are covered too."
Every step has a demo-control fallback (§11).

---

## 14. Build order (milestones)
1. **Scaffold + design system**: Vite/TS/Tailwind/Framer Motion, tokens, fonts, grain background, Logo +
   LogoAnimation, landing page, deploy a first version to Vercel.
2. **Data layer**: types, seed (with seeded PRNG trends), store with persist, IndexedDB, BroadcastChannel.
3. **Clinic dashboard + patient detail + report** with all charts and animations (static data first).
4. **Patient flow** with real mic, live waveform, recording, analysing, result, progress; demo mode
   without mic.
5. **Hand-off**: patient session → clinic (live in another tab), audio playback.
6. **Device sync** (picker + fallback input + sample device folder + the animation).
7. **Demo panel** and all fallbacks.
8. **Polish pass**: motion timing, empty states, mobile Safari/iOS mic quirks, print stylesheet, favicon,
   Open Graph image, performance. Rehearse §13 end to end.

---

## 15. Definition of done (acceptance checklist)
- [ ] Deployed on Vercel over HTTPS; landing, `/patient` and `/clinic` reachable by URL.
- [ ] Patient can complete a full session on **iPhone Safari** and **Android Chrome** (mic works, waveform
      reacts, recording plays back in the clinic of the same browser).
- [ ] Mic denied → demo mode still completes the session.
- [ ] Clinic dashboard shows all seeded patients, P-0187 alert with the video's numbers, live arrival of a
      new patient session from another tab.
- [ ] Patient detail: trend with baseline band draws on load; biomarkers count up; sessions play audio.
- [ ] One-page report prints cleanly to A4 / PDF.
- [ ] Device sync reads a real `VOXWAVE` folder (test with `public/sample-device/` copied to a USB stick)
      and animates the import; fallback via demo panel works.
- [ ] `Shift + D` demo panel works; Reset restores the initial state.
- [ ] No console errors; smooth on a mid-range laptop and phone; `prefers-reduced-motion` respected.
- [ ] Every screen shows "Prototype · illustrative data · not a medical device" somewhere discreet.
- [ ] Nothing is sent to any server (check the network tab).

---

## Appendix A — The home device (context for the sync contract)
- Hardware: Raspberry Pi 4 (borrowed), 1.3" OLED (I2C), one coral arcade button, optional coral LED,
  USB lavalier microphone, in a small white case. No speaker: all instructions are on the screen.
- Device flow on the OLED (scripted): "Good morning · Day 47 · Press to start" → "1/3 Hold 'aah'" (with a
  real mic level bar) → "2/3 Read: The river runs past the old mill." → "3/3 Tell me about your morning" →
  "Analysing…" → "Session complete ✓ · See you tomorrow" **or** (secret long press) "Voice change
  detected · Contact your neurologist" with the LED blinking.
- Sync: the Pi exposes a FAT disk image as a **USB mass-storage gadget** on its USB-C port (Pi 4 OTG:
  `dtoverlay=dwc2` + `g_mass_storage`), labelled `VOXWAVE`, containing the files of §8.2. The device code
  lives in a separate folder/repo; the platform only depends on the file contract.

## Appendix B — Words and numbers to keep consistent with the pitch
"We measure; doctors decide." · "A small daily habit, for your voice." · "Every day. 3 minutes." ·
activities: Hold an "aah" / Read a line ("The river runs past the old mill.") / Chat a little ("Tell us
about your morning.") · "Voice drift detected · Patient 0187 · 2 weeks outside personal baseline" ·
"Clinician dashboard · Today · 24 patients monitored" · biomarkers Tremor 1.8 %, Pitch 124 Hz, Rhythm
4.2 syl/s, Pauses 0.38 s · "one clear page" · "Device included if needed".
