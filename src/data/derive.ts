// Pure merge of the seed (relative to today) with what happened in this browser: demo-patient sessions and
// synced device sessions. Keeping the seed out of localStorage means it never goes stale (D7) and
// "Reset demo" only has to clear the deltas.
import { createRng, hashString, round } from './prng';
import { compareSessionTimes, sessionTime, startOfWeek, toDateKey } from './dates';
import { DEFAULT_BASELINE_METRICS, stabilityScore, bandCenter } from './scripted';
import { DEMO_PATIENT_ID, DEMO_STREAK_SEED, TREND_WEEKS, weekKeys, type SeedData } from './seed';
import type { Patient, Session, WeeklyPoint } from './types';
import { now as clockNow } from './clock';

export interface SyncedDevice {
  deviceId: string;
  patientId: string;
  /** When the clinician synced it (now). */
  syncedAt: string;
  /** When the device wrote the export (device.json). */
  exportedAt?: string;
  sessionCount: number;
}

/** The persisted, per-browser part of the demo (see store.ts). */
export interface LocalState {
  demoName: string | null;
  sessions: Session[];
  syncedDevices: Record<string, SyncedDevice>;
}

/** Distinct local days with a session. */
const distinctDays = (sessions: Session[]) => new Set(sessions.map((s) => toDateKey(new Date(s.startedAt)))).size;

/** Mean weekly scores of sessions, for weeks strictly after `afterWeek`. */
function weeklyPointsFrom(sessions: Session[], patient: Patient, afterWeek: string | undefined): WeeklyPoint[] {
  const groups = new Map<string, number[]>();
  for (const s of sessions) {
    const week = toDateKey(startOfWeek(new Date(sessionTime(s))));
    if (afterWeek && week <= afterWeek) continue;
    const score = stabilityScore(s.result.metrics, patient.baselineMetrics, bandCenter(patient));
    groups.set(week, [...(groups.get(week) ?? []), score]);
  }
  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, scores]) => ({ week, score: round(scores.reduce((x, y) => x + y, 0) / scores.length, 1) }));
}

export function buildDemoPatient(name: string, sessions: Session[], now: Date): Patient {
  const rng = createRng(hashString(DEMO_PATIENT_ID));
  const center = 77;
  const half = 7;
  const base: Omit<Patient, 'trend'> = {
    id: DEMO_PATIENT_ID,
    name,
    age: null,
    yearsSinceDiagnosis: null,
    channel: 'app',
    status: 'new',
    streak: DEMO_STREAK_SEED + distinctDays(sessions),
    adherencePct: 96,
    baseline: { low: center - half, high: center + half },
    baselineBuilding: true,
    latest: sessions.at(-1)?.result.metrics ?? DEFAULT_BASELINE_METRICS,
    baselineMetrics: DEFAULT_BASELINE_METRICS,
    notes: ['Demo patient created from the patient app in this browser.'],
    ...(sessions.length ? { lastSessionAt: sessions.at(-1)!.startedAt } : {}),
  };
  // Three seeded weeks of history (like a new patient), then the live weeks from this browser's sessions.
  const history = weekKeys(now, 4)
    .slice(0, 3)
    .map((week) => ({ week, score: round(center + rng.gauss() * 1.4, 1) }));
  const live = weeklyPointsFrom(sessions, { ...base, trend: [] }, history.at(-1)?.week);
  const latestStatus = sessions.at(-1)?.result.status;
  return { ...base, status: latestStatus === 'attention' ? 'watch' : 'new', trend: [...history, ...live] };
}

function applyDeviceSync(patient: Patient, sessions: Session[], sync: SyncedDevice | undefined): Patient {
  if (patient.channel !== 'device' || sessions.length === 0) return patient;
  const sorted = [...sessions].sort(compareSessionTimes);
  const last = sorted[sorted.length - 1];
  const appended = weeklyPointsFrom(sorted, patient, patient.trend.at(-1)?.week);
  const trend = [...patient.trend, ...appended].slice(-TREND_WEEKS);
  const latestTime = sessionTime(last);
  const newer = !patient.lastSessionAt || Date.parse(latestTime) >= Date.parse(patient.lastSessionAt);
  return {
    ...patient,
    trend,
    lastSyncAt: [sync?.syncedAt, last.receivedAt, patient.lastSyncAt].filter((s): s is string => !!s)
      .sort((a, b) => Date.parse(a) - Date.parse(b)).at(-1),
    ...(newer ? { lastSessionAt: latestTime, latest: last.result.metrics } : {}),
  };
}

export interface DerivedData {
  patients: Patient[];
  sessions: Session[];
}

export function derive(seed: SeedData, local: LocalState, now: Date = clockNow()): DerivedData {
  // Seed first, local sessions override by id (a re-synced device session replaces itself, never duplicates).
  const sessionsById = new Map<string, Session>();
  for (const s of [...seed.sessions, ...local.sessions]) sessionsById.set(s.id, s);
  const sessions = [...sessionsById.values()].sort(compareSessionTimes);

  const localByPatient = new Map<string, Session[]>();
  for (const s of local.sessions) localByPatient.set(s.patientId, [...(localByPatient.get(s.patientId) ?? []), s]);

  const syncByPatient = new Map(Object.values(local.syncedDevices).map((d) => [d.patientId, d]));

  let patients = seed.patients.map((p) => applyDeviceSync(p, localByPatient.get(p.id) ?? [], syncByPatient.get(p.id)));
  if (local.demoName !== null) {
    // The demo patient takes the place of the last filler patient, so "24 patients monitored" stays literal (D31).
    const lastMinor = patients.findLastIndex((p) => p.minor);
    if (lastMinor >= 0) patients = patients.filter((_, i) => i !== lastMinor);
    patients.push(buildDemoPatient(local.demoName, (localByPatient.get(DEMO_PATIENT_ID) ?? []).sort(compareSessionTimes), now));
  }
  return { patients, sessions };
}
