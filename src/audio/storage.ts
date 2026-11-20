// Audio blobs, keyed `sessionId/activityType` (brief §9.3). Always cached in this browser's IndexedDB
// (localStorage can't hold them); with Supabase configured they are also uploaded to the shared bucket, so a
// recording made on the phone plays on the laptop (D114).
import { clear, createStore, get, set, setMany } from 'idb-keyval';
import type { Activity } from '../data/types';
import { downloadAudio, remoteEnabled, uploadAudio } from '../data/remote';

const store = createStore('voxwave-audio', 'blobs');

export const audioKey = (sessionId: string, type: Activity['type']) => `${sessionId}/${type}`;

/**
 * Saves a recording locally and, when shared data is on, uploads it. Fails only if it ended up nowhere:
 * either copy is enough for the session to keep its audio.
 */
export async function saveAudio(key: string, blob: Blob, share = true): Promise<void> {
  const ops = [set(key, blob, store), ...(share && remoteEnabled ? [uploadAudio(key, blob)] : [])];
  const results = await Promise.allSettled(ops);
  results.forEach((r) => r.status === 'rejected' && console.warn(`[audio] ${key}:`, r.reason));
  if (results.every((r) => r.status === 'rejected')) throw new Error(`Recording ${key} could not be saved`);
}

export async function saveAudioMany(entries: Array<{ key: string; blob: Blob }>, shareSample: boolean): Promise<void> {
  if (!entries.length) return;
  const localWrite = setMany(entries.map((e) => [e.key, e.blob] as [string, Blob]), store);
  if (!shareSample || !remoteEnabled) return localWrite;
  const cached = await localWrite.then(() => true, () => false);
  const results = await Promise.allSettled(entries.map((e) => uploadAudio(e.key, e.blob)));
  results.forEach((r, i) => r.status === 'rejected' && console.warn(`[audio] ${entries[i].key}:`, r.reason));
  if (!cached && results.some((r) => r.status === 'rejected')) throw new Error('Sample recordings could not be saved');
}

export async function getAudio(key: string): Promise<Blob | undefined> {
  const local = await get<Blob>(key, store).catch(() => undefined);
  if (local || !remoteEnabled) return local;
  const remote = await downloadAudio(key).catch(() => undefined);
  if (remote) void set(key, remote, store).catch(() => undefined); // cache for the next replay
  return remote;
}

/** Clears this browser's copies only; the shared bucket is emptied by `wipeShared` (data/remote.ts). */
export async function clearAudio(): Promise<void> {
  await clear(store);
}

/**
 * A playable URL for an activity: its recording (this browser, else the shared bucket), else its bundled
 * sample clip, else null ("audio not in demo"). Caller must `URL.revokeObjectURL` the result when `revoke`.
 */
export async function resolveActivityAudio(a: Activity): Promise<{ url: string; revoke: boolean } | null> {
  if (a.audioKey) {
    const blob = await getAudio(a.audioKey);
    if (blob) return { url: URL.createObjectURL(blob), revoke: true };
  }
  if (a.audioSrc) return { url: a.audioSrc, revoke: false };
  return null;
}
