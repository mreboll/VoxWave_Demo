// Domain types (brief §9.2), plus a few fields the demo needs.

export type Status = 'stable' | 'watch' | 'alert' | 'new' | 'device';
export type Channel = 'app' | 'device';
export type ResultStatus = 'stable' | 'attention';
export type NoiseLevel = 'low' | 'medium' | 'high';

export interface Metrics {
  jitterPct: number;
  pitchHz: number;
  rhythmSylPerSec: number;
  pauseSec: number;
}

export type ActivityType = 'sustained_vowel' | 'reading' | 'conversation';

export interface Activity {
  type: ActivityType;
  durationSec: number;
  /** IndexedDB key (`sessionId/activityType`) for recordings made or imported in this browser. */
  audioKey?: string;
  /** Public URL of a bundled sample clip (seeded patients, simulated sessions). */
  audioSrc?: string;
  /** MIME type of the stored recording (webm/opus on Chrome, mp4/aac on Safari). */
  mimeType?: string;
  rmsAvg?: number;
  rmsPeak?: number;
}

export interface Session {
  id: string;
  patientId: string;
  /** ISO 8601, UTC. */
  startedAt: string;
  channel: Channel;
  activities: Activity[];
  result: { status: ResultStatus; metrics: Metrics };
  quality?: { noise: NoiseLevel };
  /** Done in demo mode (no microphone): the clinic labels it and plays sample clips. */
  simulated?: boolean;
}

/** Composite "voice stability" index for one week. `week` is the ISO date (YYYY-MM-DD) of its Monday. */
export interface WeeklyPoint {
  week: string;
  score: number;
}

export interface Patient {
  id: string;
  name: string;
  /** null for the demo patient, whose age is unknown (shown as "—"). */
  age: number | null;
  yearsSinceDiagnosis: number | null;
  channel: Channel;
  status: Status;
  streak: number;
  adherencePct: number;
  baseline: { low: number; high: number };
  /** True while the baseline is still being built (band drawn dashed). */
  baselineBuilding?: boolean;
  trend: WeeklyPoint[];
  latest: Metrics;
  baselineMetrics: Metrics;
  notes: string[];
  lastSessionAt?: string;
  deviceId?: string;
  lastSyncAt?: string;
  /** Lightweight "other" patients that only fill the 24-patient count. */
  minor?: boolean;
}

export interface Clinician {
  name: string;
  specialty: string;
  clinic: string;
}

/** Messages on the `voxwave-demo` BroadcastChannel. */
export type DemoMessage =
  | { type: 'session:new'; sessionId: string }
  | { type: 'device:synced'; deviceId: string; patientId: string; count: number }
  | { type: 'alert:replay' }
  | { type: 'demo:reset' };
