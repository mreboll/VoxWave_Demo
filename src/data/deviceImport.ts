// Reads the VoxWave home device export (brief §8.2). Read-only: never writes to the drive.
// Validates the format strings, ignores unknown fields and tolerates missing audio files.
import type { Activity, ActivityType, Metrics, NoiseLevel, ResultStatus, Session } from './types';
import { compareSessionTimes } from './dates';

export const DEVICE_FORMAT = 'voxwave-device/1';
export const SESSIONS_FORMAT = 'voxwave-sessions/1';

export interface DeviceInfo {
  deviceId: string;
  firmware?: string;
  patientId: string;
  patientName?: string;
  exportedAt?: string;
}

export interface AudioBlob {
  key: string;
  blob: Blob;
  mimeType: string;
}

export interface DeviceImport {
  device: DeviceInfo;
  /** Valid sessions, oldest → newest. */
  sessions: Session[];
  /** Recordings found on the drive, keyed `sessionId/activityType` (same keys as Activity.audioKey). */
  audio: AudioBlob[];
  /** Non-fatal problems (skipped sessions, missing audio…), for logging; the import still succeeds. */
  warnings: string[];
}

export class DeviceImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeviceImportError';
  }
}

/** Files of the export, keyed by path relative to the VOXWAVE folder (e.g. `audio/2026-11-14_aah.wav`). */
export type DeviceFiles = Map<string, Blob>;

const ACTIVITY_TYPES: ActivityType[] = ['sustained_vowel', 'reading', 'conversation'];
const NOISE: NoiseLevel[] = ['low', 'medium', 'high'];

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isDate = (v: unknown): v is string => isStr(v) && !Number.isNaN(Date.parse(v));

export function parseTranscription(value: unknown): Session['transcription'] {
  if (!isObj(value)) return undefined;
  if (value.status === 'pending' || value.status === 'failed') return { status: value.status };
  if (value.status === 'ready' && isStr(value.text) && value.text.trim()) return { status: 'ready', text: value.text };
  return undefined;
}

export function parseDevice(json: unknown): DeviceInfo {
  if (!isObj(json)) throw new DeviceImportError('device.json is not a JSON object.');
  if (json.format !== DEVICE_FORMAT) {
    throw new DeviceImportError(`Unsupported device format "${String(json.format)}" (expected ${DEVICE_FORMAT}).`);
  }
  if (!isStr(json.deviceId) || !isStr(json.patientId)) {
    throw new DeviceImportError('device.json is missing deviceId or patientId.');
  }
  return {
    deviceId: json.deviceId,
    patientId: json.patientId,
    ...(isStr(json.firmware) ? { firmware: json.firmware } : {}),
    ...(isStr(json.patientName) ? { patientName: json.patientName } : {}),
    ...(isDate(json.exportedAt) ? { exportedAt: json.exportedAt } : {}),
  };
}

function parseMetrics(v: unknown): Metrics | null {
  if (!isObj(v)) return null;
  const { jitterPct, pitchHz, rhythmSylPerSec, pauseSec } = v;
  if (!isNum(jitterPct) || !isNum(pitchHz) || !isNum(rhythmSylPerSec) || !isNum(pauseSec)) return null;
  return { jitterPct, pitchHz, rhythmSylPerSec, pauseSec };
}

/** Normalises a path from sessions.json: forward slashes, no leading "./" or "/". */
const normalisePath = (p: string) => p.replace(/\\/g, '/').replace(/^\.?\/+/, '');

const mimeFromPath = (p: string) =>
  p.toLowerCase().endsWith('.wav') ? 'audio/wav' : p.toLowerCase().endsWith('.mp3') ? 'audio/mpeg' : 'application/octet-stream';

export function parseSessions(json: unknown, device: DeviceInfo, files: DeviceFiles = new Map()): Omit<DeviceImport, 'device'> {
  if (!isObj(json)) throw new DeviceImportError('sessions.json is not a JSON object.');
  if (json.format !== SESSIONS_FORMAT) {
    throw new DeviceImportError(`Unsupported sessions format "${String(json.format)}" (expected ${SESSIONS_FORMAT}).`);
  }
  if (!Array.isArray(json.sessions)) throw new DeviceImportError('sessions.json has no "sessions" list.');

  const warnings: string[] = [];
  const patientId = isStr(json.patientId) ? json.patientId : device.patientId;
  if (patientId !== device.patientId) {
    throw new DeviceImportError(`sessions.json is for ${patientId} but the device belongs to ${device.patientId}.`);
  }

  // Case-insensitive file lookup: FAT drives don't preserve case reliably.
  const byLowerPath = new Map([...files].map(([p, b]) => [p.toLowerCase(), b]));
  const audio: AudioBlob[] = [];
  const sessions: Session[] = [];
  const seen = new Set<string>();

  json.sessions.forEach((raw, i) => {
    const label = isObj(raw) && isStr(raw.id) ? raw.id : `#${i + 1}`;
    if (!isObj(raw) || !isStr(raw.id) || !isDate(raw.startedAt)) {
      warnings.push(`Session ${label}: missing id or startedAt — skipped.`);
      return;
    }
    if (seen.has(raw.id)) {
      warnings.push(`Session ${label}: duplicate id — skipped.`);
      return;
    }
    const result = isObj(raw.result) ? raw.result : null;
    const metrics = parseMetrics(result?.metrics);
    if (!result || !metrics) {
      warnings.push(`Session ${label}: missing result metrics — skipped.`);
      return;
    }
    const status: ResultStatus =
      result.status === 'attention' || result.status === 'stable'
        ? result.status
        : result.deviceAlertShown === true
          ? 'attention'
          : 'stable';

    const activities: Activity[] = [];
    for (const a of Array.isArray(raw.activities) ? raw.activities : []) {
      if (!isObj(a) || !ACTIVITY_TYPES.includes(a.type as ActivityType) || !isNum(a.durationSec)) {
        warnings.push(`Session ${label}: unrecognised activity ignored.`);
        continue;
      }
      const type = a.type as ActivityType;
      const activity: Activity = { type, durationSec: a.durationSec };
      if (isStr(a.audio)) {
        const path = normalisePath(a.audio);
        const blob = byLowerPath.get(path.toLowerCase());
        if (blob) {
          const key = `${raw.id}/${type}`;
          const mimeType = blob.type || mimeFromPath(path);
          activity.audioKey = key;
          activity.mimeType = mimeType;
          audio.push({ key, blob, mimeType });
        } else {
          warnings.push(`Session ${label}: audio file ${path} not found.`);
        }
      }
      activities.push(activity);
    }

    const noise = isObj(raw.quality) && NOISE.includes(raw.quality.noise as NoiseLevel) ? (raw.quality.noise as NoiseLevel) : undefined;
    const transcription = parseTranscription(raw.transcription);
    seen.add(raw.id);
    sessions.push({
      id: raw.id,
      patientId,
      startedAt: new Date(raw.startedAt).toISOString(),
      channel: 'device',
      activities,
      result: { status, metrics, ...(result.metricsSource === 'demo' ? { metricsSource: 'demo' } : {}) },
      ...(transcription ? { transcription } : {}),
      ...(typeof raw.captureClockSynced === 'boolean' ? { captureClockSynced: raw.captureClockSynced } : {}),
      ...(isDate(raw.receivedAt) ? { receivedAt: new Date(raw.receivedAt).toISOString() } : {}),
      ...(noise ? { quality: { noise } } : {}),
    });
  });

  sessions.sort(compareSessionTimes);
  return { sessions, audio, warnings };
}

/**
 * Adds synced sessions to the stored ones. Re-syncing replaces a session by id (never duplicates it), but an
 * activity keeps the audio from an earlier sync when this read brought none (e.g. a drive without audio/).
 */
export function mergeSyncedSessions(existing: Session[], incoming: Session[]): Session[] {
  const previous = new Map(existing.map((s) => [s.id, s]));
  const merged = incoming.map((session) => {
    const old = previous.get(session.id);
    if (!old) return session;
    // A stale snapshot may contain the same capture before Whisper finished or before it reported a failure.
    const transcription = session.transcription?.status === 'ready' ? session.transcription
      : old.transcription?.status === 'ready' || old.transcription?.status === 'failed' ? old.transcription
      : session.transcription ?? old.transcription;
    return {
      ...(old.receivedAt ? { receivedAt: old.receivedAt } : {}),
      ...(old.captureClockSynced !== undefined ? { captureClockSynced: old.captureClockSynced } : {}),
      ...session,
      ...(transcription ? { transcription } : {}),
      result: { ...old.result, ...session.result },
      activities: session.activities.map((a) => {
        const before = old.activities.find((o) => o.type === a.type);
        return a.audioKey || !before?.audioKey ? a : { ...a, audioKey: before.audioKey, mimeType: before.mimeType };
      }),
    };
  });
  const ids = new Set(incoming.map((s) => s.id));
  return [...existing.filter((s) => !ids.has(s.id)), ...merged];
}

async function readJson(blob: Blob, name: string): Promise<unknown> {
  try {
    return JSON.parse(await blob.text());
  } catch {
    throw new DeviceImportError(`${name} is not valid JSON.`);
  }
}

/**
 * Finds the VOXWAVE folder inside the picked files: the user may pick the drive itself (which contains
 * VOXWAVE/), the VOXWAVE folder, or a parent folder. Returns files re-keyed relative to that folder.
 */
export function locateExportRoot(files: DeviceFiles): DeviceFiles {
  const paths = [...files.keys()];
  const candidates = paths
    .filter((p) => /(^|\/)device\.json$/i.test(p))
    .map((p) => p.slice(0, p.length - 'device.json'.length))
    // Prefer a folder named VOXWAVE, then the shallowest one.
    .sort((a, b) => Number(!/voxwave\/$/i.test(a)) - Number(!/voxwave\/$/i.test(b)) || a.length - b.length);
  if (candidates.length === 0) {
    throw new DeviceImportError('No VoxWave data found. Choose the VOXWAVE drive or its VOXWAVE folder.');
  }
  const root = candidates[0];
  const out: DeviceFiles = new Map();
  for (const [p, b] of files) {
    if (p.toLowerCase().startsWith(root.toLowerCase())) out.set(p.slice(root.length), b);
  }
  return out;
}

/** Parses an export given its files (any of the three sources below produce this). */
export async function readDeviceExport(allFiles: DeviceFiles): Promise<DeviceImport> {
  const files = locateExportRoot(allFiles);
  const get = (name: string) => [...files].find(([p]) => p.toLowerCase() === name)?.[1];
  const deviceBlob = get('device.json');
  const sessionsBlob = get('sessions.json');
  if (!deviceBlob) throw new DeviceImportError('device.json not found.');
  if (!sessionsBlob) throw new DeviceImportError('sessions.json not found.');
  const device = parseDevice(await readJson(deviceBlob, 'device.json'));
  return { device, ...parseSessions(await readJson(sessionsBlob, 'sessions.json'), device, files) };
}

// ---- Sources ---------------------------------------------------------------------------------------------

/** Walks a directory picked with `showDirectoryPicker()` (Chrome/Edge). Only descends a few levels. */
export async function filesFromDirectoryHandle(dir: FileSystemDirectoryHandle, maxDepth = 3): Promise<DeviceFiles> {
  const out: DeviceFiles = new Map();
  const walk = async (handle: FileSystemDirectoryHandle, prefix: string, depth: number) => {
    // `values()` exists in Chromium; TS's DOM lib doesn't type the async iterator on all versions.
    const entries = (handle as unknown as { values(): AsyncIterable<FileSystemHandle> }).values();
    for await (const entry of entries) {
      if (entry.kind === 'file') {
        out.set(prefix + entry.name, await (entry as FileSystemFileHandle).getFile());
      } else if (depth < maxDepth && !entry.name.startsWith('.') && entry.name !== 'System Volume Information') {
        await walk(entry as FileSystemDirectoryHandle, `${prefix}${entry.name}/`, depth + 1);
      }
    }
  };
  await walk(dir, '', 0);
  return out;
}

/** Files from an `<input type="file" webkitdirectory>` (fallback). Paths include the picked folder's name. */
export function filesFromFileList(list: FileList | File[]): DeviceFiles {
  const out: DeviceFiles = new Map();
  for (const f of Array.from(list)) out.set(f.webkitRelativePath || f.name, f);
  return out;
}

/** The bundled sample export in `public/sample-device/VOXWAVE/` (demo control "Load device data"). */
export async function filesFromPublicSample(base = '/sample-device/VOXWAVE/'): Promise<DeviceFiles> {
  const fetchBlob = async (path: string) => {
    const res = await fetch(base + path);
    return res.ok ? res.blob() : undefined;
  };
  const out: DeviceFiles = new Map();
  const sessions = await fetchBlob('sessions.json');
  const device = await fetchBlob('device.json');
  if (device) out.set('VOXWAVE/device.json', device);
  if (!sessions) return out;
  out.set('VOXWAVE/sessions.json', sessions);
  // Fetch the audio the sessions reference; missing files are simply absent (tolerated by the parser).
  try {
    const json = JSON.parse(await sessions.text()) as { sessions?: Array<{ activities?: Array<{ audio?: string }> }> };
    const audioPaths = (json.sessions ?? []).flatMap((s) => (s.activities ?? []).map((a) => a.audio)).filter(isStr);
    await Promise.all(
      audioPaths.map(async (p) => {
        const blob = await fetchBlob(normalisePath(p));
        if (blob && !blob.type.startsWith('text/html')) out.set(`VOXWAVE/${normalisePath(p)}`, blob);
      }),
    );
  } catch {
    // Invalid JSON is reported by readDeviceExport.
  }
  return out;
}
