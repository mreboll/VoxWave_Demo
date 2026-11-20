// Pure mapping between the app's shared state and the Supabase rows (D114). No network here: remote.ts
// does the I/O, this file decides what each row means, so it can be unit-tested.
import type { SyncedDevice } from './derive';
import { compareSessionTimes } from './dates';
import { parseTranscription } from './deviceImport';
import type { ResultMode } from './scripted';
import type { Session } from './types';

/** What every device sees the same. Per-device settings (clinician sign-in, motion) stay out of it. */
export interface SharedState {
  demoName: string | null;
  sessions: Session[];
  syncedDevices: Record<string, SyncedDevice>;
  notes: Record<string, string>;
  scheduledVisits: Record<string, string>;
  nextResult: ResultMode;
  rehearsal: boolean;
}

export interface KvRow {
  key: string;
  value: unknown;
}

export interface SessionRow {
  id: string;
  patient_id: string;
  started_at: string;
  data: unknown;
}

export const KV = {
  demoName: 'demoName',
  nextResult: 'nextResult',
  rehearsal: 'rehearsal',
  note: (patientId: string) => `note:${patientId}`,
  visit: (patientId: string) => `visit:${patientId}`,
  device: (deviceId: string) => `device:${deviceId}`,
} as const;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';

/** Minimal shape check: rows are written by any device, so anything malformed is skipped, not trusted. */
function isSession(v: unknown): v is Session {
  return (
    isObj(v) &&
    isStr(v.id) &&
    isStr(v.patientId) &&
    isStr(v.startedAt) && Number.isFinite(Date.parse(v.startedAt)) &&
    Array.isArray(v.activities) &&
    isObj(v.result) &&
    isObj(v.result.metrics)
  );
}

function isSyncedDevice(v: unknown): v is SyncedDevice {
  return isObj(v) && isStr(v.deviceId) && isStr(v.patientId) && isStr(v.syncedAt) && typeof v.sessionCount === 'number';
}

export const sessionToRow = (s: Session): SessionRow => ({
  id: s.id,
  patient_id: s.patientId,
  started_at: s.startedAt,
  data: s,
});

/** Builds the shared state from the rows of both tables. Unknown keys and malformed values are ignored. */
export function rowsToShared(kv: KvRow[], sessionRows: SessionRow[]): SharedState {
  const out: SharedState = {
    demoName: null,
    sessions: sessionRows.map((r) => r.data).filter(isSession).map((s) => {
      const { transcription, receivedAt, ...session } = s;
      const parsed = parseTranscription(transcription);
      return {
        ...session,
        ...(parsed ? { transcription: parsed } : {}),
        ...(typeof receivedAt === 'string' && Number.isFinite(Date.parse(receivedAt)) ? { receivedAt } : {}),
      };
    }).sort(compareSessionTimes),
    syncedDevices: {},
    notes: {},
    scheduledVisits: {},
    nextResult: 'stable',
    rehearsal: false,
  };
  for (const { key, value } of kv) {
    if (key === KV.demoName && isStr(value)) out.demoName = value;
    else if (key === KV.nextResult && (value === 'stable' || value === 'attention')) out.nextResult = value;
    else if (key === KV.rehearsal && typeof value === 'boolean') out.rehearsal = value;
    else if (key.startsWith('note:') && isStr(value)) out.notes = { ...out.notes, [key.slice(5)]: value };
    else if (key.startsWith('visit:') && isStr(value)) out.scheduledVisits = { ...out.scheduledVisits, [key.slice(6)]: value };
    else if (key.startsWith('device:') && isSyncedDevice(value)) out.syncedDevices = { ...out.syncedDevices, [value.deviceId]: value };
  }
  return out;
}

/**
 * Object name of a recording in the bucket. Flat (no folders) so "Reset demo" can list and delete everything
 * in one pass; characters outside a safe set become `_`.
 */
export const storagePath = (audioKey: string) => audioKey.replace(/[^A-Za-z0-9._-]/g, '_');

/** Content type without parameters (`audio/webm;codecs=opus` → `audio/webm`), as the bucket's allow-list expects. */
export const baseMime = (mime: string | undefined) => (mime?.split(';')[0]?.trim() || 'application/octet-stream');
