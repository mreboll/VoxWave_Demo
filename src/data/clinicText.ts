// Scripted clinician-facing text (brief §7.4, §10): precise, calm, never a diagnosis.
import { formatDay } from './dates';
import { weeksOutsideBand } from './scripted';
import { DEMO_PATIENT_ID } from './seed';
import type { Patient, Session } from './types';

/** "Patient 0187" — how the video names patients. */
export const patientNumber = (id: string) =>
  id === DEMO_PATIENT_ID ? 'Demo patient' : id.startsWith('P-') ? `Patient ${id.slice(2)}` : id;

/** Dashboard stat from the video (hardcoded per brief §10). */
export const WEEK_ADHERENCE_PCT = 92;

const BY_ID: Record<string, string> = {
  'P-0187': 'Gradual change in pitch variability and pauses over the last 2 weeks. Suggest review at next visit.',
  'P-0156': 'Pauses slightly longer over the last 5 weeks, still within personal baseline. Keep monitoring.',
  'P-0198':
    'Voice stable when measured. Adherence dropped to 57 % this week (3 missed sessions). Consider a check-in call.',
  'P-0174': 'Voice stability improved after the medication change 7 weeks ago and has held since.',
  'P-0231': 'Personal baseline still being built (3 weeks of data). No change can be assessed yet.',
};

export function reportSummary(p: Patient): string {
  if (BY_ID[p.id]) return BY_ID[p.id];
  switch (p.status) {
    case 'alert':
      return `Voice outside personal baseline for ${weeksOutsideBand(p)} weeks. Suggest review at next visit.`;
    case 'watch':
      return 'Some variation in recent sessions, still within personal baseline. Keep monitoring.';
    case 'new':
      return 'Personal baseline still being built. No change can be assessed yet.';
    case 'device':
      return p.lastSyncAt
        ? `Voice stable within personal baseline. Data from the VoxWave home device, last synced ${formatDay(p.lastSyncAt)}.`
        : 'Voice stable within personal baseline. Data from the VoxWave home device.';
    default:
      return 'Voice stable within personal baseline over the last 14 weeks.';
  }
}

/** Quality flags for the report: counts of sessions with background noise. */
export function qualityFlags(sessions: Session[]): string[] {
  const noisy = sessions.filter((s) => s.quality && s.quality.noise !== 'low').length;
  return noisy > 0 ? [`${noisy} session${noisy > 1 ? 's' : ''} with background noise`] : ['No quality issues'];
}
