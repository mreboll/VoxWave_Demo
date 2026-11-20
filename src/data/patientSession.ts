// Turns what the patient app recorded into a Session (brief §9.2–9.3). Pure, so it is easy to test.
import { scriptedResult, DEFAULT_BASELINE_METRICS, type ResultMode } from './scripted';
import { DEMO_PATIENT_ID, SAMPLE_AUDIO } from './seed';
import type { Activity, ActivityType, Session } from './types';
import { now as clockNow } from './clock';

export interface ActivityCapture {
  type: ActivityType;
  durationSec: number;
  rmsAvg: number | null;
  rmsPeak: number | null;
  /** IndexedDB key if the recording was saved, otherwise undefined. */
  audioKey?: string;
  mimeType?: string;
  /** Recorded in demo mode (synthetic waveform, no microphone). */
  simulated: boolean;
}

export const newSessionId = (now: Date = clockNow()) => `S-DEMO-${now.getTime().toString(36)}`;

export function buildPatientSession(
  id: string,
  startedAt: Date,
  captures: ActivityCapture[],
  mode: ResultMode,
  patientId: string = DEMO_PATIENT_ID,
): Session {
  const activities: Activity[] = captures.map((c) => ({
    type: c.type,
    durationSec: c.durationSec,
    ...(c.rmsAvg !== null ? { rmsAvg: c.rmsAvg } : {}),
    ...(c.rmsPeak !== null ? { rmsPeak: c.rmsPeak } : {}),
    ...(c.audioKey
      ? { audioKey: c.audioKey, ...(c.mimeType ? { mimeType: c.mimeType } : {}) }
      : c.simulated
        ? // Demo mode: the clinic plays the bundled sample clip instead of silence (D45).
          { audioSrc: SAMPLE_AUDIO[c.type], mimeType: 'audio/wav' }
        : {}),
  }));
  return {
    id,
    patientId,
    startedAt: startedAt.toISOString(),
    channel: 'app',
    activities,
    result: { status: mode, metrics: scriptedResult(mode, DEFAULT_BASELINE_METRICS, startedAt.getTime()) },
    quality: { noise: 'low' },
    ...(captures.some((c) => c.simulated) ? { simulated: true } : {}),
  };
}
