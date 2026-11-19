// Seed data (brief §9.1). Deterministic: one seeded PRNG per patient, dates relative to `now` (D7).
import { createRng, hashString, round, type Rng } from './prng';
import { addDays, atTime, hourMinute, startOfDay, startOfWeek, toDateKey } from './dates';
import type { Activity, Clinician, Metrics, NoiseLevel, Patient, Session, WeeklyPoint } from './types';
import { now as clockNow } from './clock';

export const CLINICIAN: Clinician = {
  name: 'Dr. Emma Lewis',
  specialty: 'Neurology',
  clinic: 'VoxWave Demo Clinic',
};

export const TREND_WEEKS = 14;
export const DEMO_PATIENT_ID = 'P-DEMO';
export const DEMO_STREAK_SEED = 46;
export const DEVICE_PATIENT_ID = 'P-0142';
export const ALERT_PATIENT_ID = 'P-0187';

/** The video's numbers for P-0187 (brief §1, App. B). */
export const VIDEO_BIOMARKERS: Metrics = { jitterPct: 1.8, pitchHz: 124, rhythmSylPerSec: 4.2, pauseSec: 0.38 };

export const SAMPLE_AUDIO = {
  sustained_vowel: '/sample-audio/aah.wav',
  reading: '/sample-audio/read.wav',
  conversation: '/sample-audio/chat.wav',
} as const;

/** How each main patient's 14-week trend behaves. Scores are a 0–100 "voice stability" index. */
type TrendShape =
  | { kind: 'steady' }
  | { kind: 'drift'; lastWeeksOutside: number; drop: number } // P-0187
  | { kind: 'sagging'; sag: number } // P-0156: falling but still inside the band
  | { kind: 'improved'; fromWeek: number; lift: number } // P-0174
  | { kind: 'short'; weeks: number } // P-0231: building baseline
  | { kind: 'untilLastSync'; missingWeeks: number }; // P-0142: last week arrives with the device sync

interface PatientSpec {
  id: string;
  name: string;
  age: number;
  yearsSinceDiagnosis: number;
  channel: Patient['channel'];
  status: Patient['status'];
  streak: number;
  adherencePct: number;
  bandCenter: number;
  bandHalf: number;
  shape: TrendShape;
  baselineMetrics: Metrics;
  /** Overrides the generated latest metrics (P-0187 uses the video values). */
  latest?: Metrics;
  /** Days ago of the most recent session (0 = today). */
  lastSessionDaysAgo: number;
  lastSessionTime: [number, number];
  /** Indexes (0 = most recent) of sessions flagged with background noise. */
  noisySessions?: number[];
  notes: string[];
  deviceId?: string;
}

const MAIN: PatientSpec[] = [
  {
    id: 'P-0187',
    name: 'Margaret Collins',
    age: 71,
    yearsSinceDiagnosis: 6,
    channel: 'app',
    status: 'alert',
    streak: 31,
    adherencePct: 94,
    bandCenter: 76,
    bandHalf: 6,
    shape: { kind: 'drift', lastWeeksOutside: 2, drop: 12 },
    baselineMetrics: { jitterPct: 1.3, pitchHz: 131, rhythmSylPerSec: 4.6, pauseSec: 0.29 },
    latest: VIDEO_BIOMARKERS,
    lastSessionDaysAgo: 0,
    lastSessionTime: [9, 12],
    noisySessions: [3, 7],
    notes: [
      'Levodopa 100/25 mg TID, stable dose since March.',
      'Reports more effort when speaking in the evenings (last visit).',
    ],
  },
  {
    id: 'P-0142',
    name: 'Robert Hayes',
    age: 78,
    yearsSinceDiagnosis: 9,
    channel: 'device',
    status: 'device',
    streak: 12,
    adherencePct: 88,
    bandCenter: 74,
    bandHalf: 7,
    shape: { kind: 'untilLastSync', missingWeeks: 1 },
    baselineMetrics: { jitterPct: 1.6, pitchHz: 129, rhythmSylPerSec: 4.3, pauseSec: 0.35 },
    lastSessionDaysAgo: 7,
    lastSessionTime: [8, 10],
    notes: ['Lives rurally, no smartphone. Uses the VoxWave home device; data arrives at each visit.'],
    deviceId: 'VW-DEV-0003',
  },
  {
    id: 'P-0156',
    name: 'James Turner',
    age: 66,
    yearsSinceDiagnosis: 3,
    channel: 'app',
    status: 'watch',
    streak: 19,
    adherencePct: 90,
    bandCenter: 78,
    bandHalf: 6,
    shape: { kind: 'sagging', sag: 4.6 },
    baselineMetrics: { jitterPct: 1.1, pitchHz: 118, rhythmSylPerSec: 4.8, pauseSec: 0.3 },
    latest: { jitterPct: 1.2, pitchHz: 117, rhythmSylPerSec: 4.6, pauseSec: 0.35 },
    lastSessionDaysAgo: 0,
    lastSessionTime: [8, 41],
    notes: ['Pauses slightly longer over the last 5 weeks, still inside personal baseline.'],
  },
  {
    id: 'P-0203',
    name: 'Linda Morgan',
    age: 69,
    yearsSinceDiagnosis: 4,
    channel: 'app',
    status: 'stable',
    streak: 58,
    adherencePct: 98,
    bandCenter: 80,
    bandHalf: 5,
    shape: { kind: 'steady' },
    baselineMetrics: { jitterPct: 0.9, pitchHz: 196, rhythmSylPerSec: 4.9, pauseSec: 0.26 },
    lastSessionDaysAgo: 0,
    lastSessionTime: [7, 58],
    notes: ['Very consistent. Enjoys the daily topic.'],
  },
  {
    id: 'P-0219',
    name: 'Patricia Bennett',
    age: 74,
    yearsSinceDiagnosis: 5,
    channel: 'app',
    status: 'stable',
    streak: 23,
    adherencePct: 93,
    bandCenter: 75,
    bandHalf: 6,
    shape: { kind: 'steady' },
    baselineMetrics: { jitterPct: 1.2, pitchHz: 188, rhythmSylPerSec: 4.4, pauseSec: 0.31 },
    lastSessionDaysAgo: 1,
    lastSessionTime: [10, 5],
    notes: [],
  },
  {
    id: 'P-0174',
    name: 'Thomas Reed',
    age: 63,
    yearsSinceDiagnosis: 2,
    channel: 'app',
    status: 'stable',
    streak: 14,
    adherencePct: 91,
    bandCenter: 77,
    bandHalf: 6,
    shape: { kind: 'improved', fromWeek: 7, lift: 6 },
    baselineMetrics: { jitterPct: 1.0, pitchHz: 121, rhythmSylPerSec: 4.7, pauseSec: 0.28 },
    lastSessionDaysAgo: 0,
    lastSessionTime: [8, 2],
    notes: ['Medication change (rasagiline added) 7 weeks ago — voice stability improved since.'],
  },
  {
    id: 'P-0231',
    name: 'Susan Walker',
    age: 67,
    yearsSinceDiagnosis: 1,
    channel: 'app',
    status: 'new',
    streak: 18,
    adherencePct: 86,
    bandCenter: 77,
    bandHalf: 7,
    shape: { kind: 'short', weeks: 3 },
    baselineMetrics: { jitterPct: 1.1, pitchHz: 201, rhythmSylPerSec: 4.6, pauseSec: 0.3 },
    lastSessionDaysAgo: 0,
    lastSessionTime: [9, 30],
    notes: ['Joined 3 weeks ago. Personal baseline still being built.'],
  },
  {
    id: 'P-0198',
    name: 'David Clarke',
    age: 72,
    yearsSinceDiagnosis: 7,
    channel: 'app',
    status: 'watch',
    streak: 0,
    adherencePct: 57,
    bandCenter: 74,
    bandHalf: 6,
    shape: { kind: 'steady' },
    baselineMetrics: { jitterPct: 1.4, pitchHz: 112, rhythmSylPerSec: 4.2, pauseSec: 0.34 },
    lastSessionDaysAgo: 3,
    lastSessionTime: [11, 20],
    notes: ['Missed 3 sessions this week. Consider a check-in call.'],
  },
];

/** 16 lightweight stable patients so "24 patients monitored" is literal (D6). */
const OTHERS: Array<[string, string, number]> = [
  ['P-0102', 'Helen Price', 70],
  ['P-0109', 'George Wright', 75],
  ['P-0113', 'Barbara Hughes', 68],
  ['P-0121', 'Richard Lee', 73],
  ['P-0127', 'Carol Edwards', 65],
  ['P-0133', 'Michael Ward', 77],
  ['P-0138', 'Dorothy Hill', 72],
  ['P-0147', 'William Cooper', 69],
  ['P-0151', 'Nancy Baker', 66],
  ['P-0162', 'Charles Foster', 80],
  ['P-0166', 'Karen Mitchell', 64],
  ['P-0179', 'Peter Russell', 71],
  ['P-0183', 'Joan Palmer', 76],
  ['P-0191', 'Kenneth Shaw', 68],
  ['P-0207', 'Ruth Armstrong', 73],
  ['P-0214', 'Brian Lawson', 70],
];

export interface SeedData {
  patients: Patient[];
  sessions: Session[];
}

export function weekKeys(now: Date, count = TREND_WEEKS): string[] {
  const thisWeek = startOfWeek(now);
  return Array.from({ length: count }, (_, i) => toDateKey(addDays(thisWeek, -7 * (count - 1 - i))));
}

function buildTrend(spec: PatientSpec, weeks: string[], rng: Rng): WeeklyPoint[] {
  const { bandCenter: c, bandHalf: h, shape } = spec;
  // Wobble stays well inside the band so only scripted drifts leave it.
  const wobble = () => rng.gauss() * h * 0.22;
  const n = weeks.length;
  const points = weeks.map((week, i) => {
    let score = c + wobble();
    switch (shape.kind) {
      case 'drift':
        if (i >= n - shape.lastWeeksOutside) score = c - h - 2 - (i - (n - shape.lastWeeksOutside)) * 2.2 - rng.range(0.5, 1.5);
        else if (i >= n - shape.lastWeeksOutside - 2) score = c - h * 0.45 + rng.gauss() * 0.6;
        break;
      case 'sagging':
        if (i >= n - 5) score = c - ((i - (n - 6)) / 5) * shape.sag + rng.gauss() * 0.5;
        break;
      case 'improved':
        score = i < shape.fromWeek ? c - shape.lift * 0.75 + wobble() : c + wobble() * 0.7;
        break;
    }
    return { week, score: round(Math.max(c - h * 0.92, Math.min(c + h * 0.92, score)) , 1) };
  });
  // Re-apply the drift without clamping: those points must fall outside the band.
  if (shape.kind === 'drift') {
    for (let i = n - shape.lastWeeksOutside; i < n; i++) {
      points[i].score = round(c - h - 2 - (i - (n - shape.lastWeeksOutside)) * 2.2 - rng.range(0.5, 1.5), 1);
    }
  }
  if (shape.kind === 'short') return points.slice(-shape.weeks);
  if (shape.kind === 'untilLastSync') return points.slice(0, n - shape.missingWeeks);
  return points;
}

function jitterMetrics(m: Metrics, rng: Rng, spread = 1): Metrics {
  return {
    jitterPct: round(m.jitterPct + rng.gauss() * 0.06 * spread, 2),
    pitchHz: Math.round(m.pitchHz + rng.gauss() * 1.5 * spread),
    rhythmSylPerSec: round(m.rhythmSylPerSec + rng.gauss() * 0.06 * spread, 2),
    pauseSec: round(m.pauseSec + rng.gauss() * 0.01 * spread, 2),
  };
}

function buildActivities(rng: Rng, withAudio: boolean): Activity[] {
  const a = (type: Activity['type'], durationSec: number): Activity => ({
    type,
    durationSec: round(durationSec, 1),
    ...(withAudio ? { audioSrc: SAMPLE_AUDIO[type], mimeType: 'audio/wav' } : {}),
  });
  return [a('sustained_vowel', rng.range(4.8, 5.3)), a('reading', rng.range(5.8, 6.6)), a('conversation', rng.range(16, 28))];
}

/**
 * Recent sessions for a main patient: newest first in generation, returned oldest → newest.
 * `outsideWeeks`: weeks whose trend point is outside the band. A session is "attention" exactly when its
 * week is one of them, so the list, the chart and "2 weeks outside personal baseline" always agree (D78).
 */
function buildSessions(spec: PatientSpec, latest: Metrics, now: Date, rng: Rng, outsideWeeks: Set<string>): Session[] {
  const today = startOfDay(now);
  // A session "today 09:12" must not be in the future: if it is too early, it happened yesterday.
  let offset = spec.lastSessionDaysAgo;
  const [hh, mm] = spec.lastSessionTime;
  const clock = hourMinute(now);
  if (offset === 0 && (clock.h < hh || (clock.h === hh && clock.mi < mm))) offset = 1;

  // The alert patient gets ~2 weeks more history, so whatever the day, the list also shows sessions from
  // before the drift (inside the band).
  const count = spec.status === 'alert' ? 16 : spec.shape.kind === 'short' ? 12 : 10;
  const sessions: Session[] = [];
  let day = offset;
  for (let i = 0; i < count; i++) {
    // Low-adherence patients skip days.
    if (i > 0) day += rng.next() * 100 > spec.adherencePct ? 2 : 1;
    const date = addDays(today, -day);
    const time = i === 0 ? spec.lastSessionTime : ([hh + rng.int(-1, 1), rng.int(0, 59)] as [number, number]);
    const outside = outsideWeeks.has(toDateKey(startOfWeek(date)));
    // Sessions in weeks outside the band carry most of the drift; earlier ones stay close to baseline.
    const t = outside ? Math.max(0.55, 1 - i / 14) : Math.min(0.3, Math.max(0, 1 - i / 12) * 0.4);
    const metrics: Metrics =
      i === 0
        ? latest
        : jitterMetrics(
            {
              jitterPct: spec.baselineMetrics.jitterPct + (latest.jitterPct - spec.baselineMetrics.jitterPct) * t,
              pitchHz: spec.baselineMetrics.pitchHz + (latest.pitchHz - spec.baselineMetrics.pitchHz) * t,
              rhythmSylPerSec:
                spec.baselineMetrics.rhythmSylPerSec + (latest.rhythmSylPerSec - spec.baselineMetrics.rhythmSylPerSec) * t,
              pauseSec: spec.baselineMetrics.pauseSec + (latest.pauseSec - spec.baselineMetrics.pauseSec) * t,
            },
            rng,
          );
    const noise: NoiseLevel = spec.noisySessions?.includes(i) ? 'medium' : 'low';
    sessions.push({
      id: `S-${spec.id}-${toDateKey(date)}`,
      patientId: spec.id,
      startedAt: atTime(date, time[0], time[1]),
      channel: spec.channel,
      activities: buildActivities(rng, i < 3),
      result: { status: outside ? 'attention' : 'stable', metrics },
      quality: { noise },
    });
  }
  return sessions.reverse();
}

function buildMain(spec: PatientSpec, now: Date, weeks: string[]): { patient: Patient; sessions: Session[] } {
  const rng = createRng(hashString(spec.id));
  const trend = buildTrend(spec, weeks, rng);
  const latest = spec.latest ?? jitterMetrics(spec.baselineMetrics, rng, 0.8);
  const outsideWeeks = new Set(
    trend.filter((p) => p.score < spec.bandCenter - spec.bandHalf || p.score > spec.bandCenter + spec.bandHalf).map((p) => p.week),
  );
  const sessions = buildSessions(spec, latest, now, rng, outsideWeeks);
  const last = sessions[sessions.length - 1];
  const patient: Patient = {
    id: spec.id,
    name: spec.name,
    age: spec.age,
    yearsSinceDiagnosis: spec.yearsSinceDiagnosis,
    channel: spec.channel,
    status: spec.status,
    streak: spec.streak,
    adherencePct: spec.adherencePct,
    baseline: { low: spec.bandCenter - spec.bandHalf, high: spec.bandCenter + spec.bandHalf },
    baselineBuilding: spec.shape.kind === 'short' || undefined,
    trend,
    latest,
    baselineMetrics: spec.baselineMetrics,
    notes: spec.notes,
    lastSessionAt: last.startedAt,
    ...(spec.deviceId
      ? { deviceId: spec.deviceId, lastSyncAt: atTime(addDays(startOfDay(now), -spec.lastSessionDaysAgo), 10, 30) }
      : {}),
  };
  return { patient, sessions };
}

function buildOther([id, name, age]: [string, string, number], now: Date, weeks: string[]): Patient {
  const rng = createRng(hashString(id));
  const c = Math.round(rng.range(72, 81));
  const h = 6;
  const baselineMetrics: Metrics = {
    jitterPct: round(rng.range(0.9, 1.6), 2),
    pitchHz: Math.round(rng.next() > 0.5 ? rng.range(105, 135) : rng.range(175, 210)),
    rhythmSylPerSec: round(rng.range(4.1, 4.9), 2),
    pauseSec: round(rng.range(0.26, 0.36), 2),
  };
  const daysAgo = rng.next() > 0.7 ? 1 : 0;
  const day = addDays(startOfDay(now), -daysAgo);
  const hour = daysAgo === 0 ? Math.min(rng.int(7, 10), Math.max(0, hourMinute(now).h - 1)) : rng.int(7, 11);
  return {
    id,
    name,
    age,
    yearsSinceDiagnosis: rng.int(1, 10),
    channel: 'app',
    status: 'stable',
    streak: rng.int(5, 70),
    adherencePct: rng.int(85, 99),
    baseline: { low: c - h, high: c + h },
    trend: weeks.map((week) => ({ week, score: round(c + rng.gauss() * h * 0.22, 1) })),
    latest: jitterMetrics(baselineMetrics, rng, 0.7),
    baselineMetrics,
    notes: [],
    lastSessionAt: atTime(day, hour, rng.int(0, 59)),
    minor: true,
  };
}

/** Generates the seed relative to `now`. Pure and deterministic for a given `now`. */
export function generateSeed(now: Date): SeedData {
  const weeks = weekKeys(now);
  const main = MAIN.map((spec) => buildMain(spec, now, weeks));
  return {
    patients: [...main.map((m) => m.patient), ...OTHERS.map((o) => buildOther(o, now, weeks))],
    sessions: main.flatMap((m) => m.sessions),
  };
}

let cache: { key: string; data: SeedData } | null = null;

/**
 * Seed for `now`, cached per local hour: times like "today 09:12" depend on the hour (a session can't be in
 * the future), so the cache refreshes hourly and stays referentially stable in between.
 */
export function buildSeed(now: Date = clockNow()): SeedData {
  const key = `${toDateKey(now)}T${hourMinute(now).h}`;
  if (cache?.key !== key) cache = { key, data: generateSeed(now) };
  return cache.data;
}
