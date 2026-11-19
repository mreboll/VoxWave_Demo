// Audio blobs live in IndexedDB (localStorage can't hold them), keyed `sessionId/activityType` (brief §9.3).
// Nothing is ever uploaded: blobs stay in this browser.
import { clear, createStore, get, set, setMany } from 'idb-keyval';
import type { Activity } from '../data/types';

const store = createStore('voxwave-audio', 'blobs');

export const audioKey = (sessionId: string, type: Activity['type']) => `${sessionId}/${type}`;

export async function saveAudio(key: string, blob: Blob): Promise<void> {
  await set(key, blob, store);
}

export async function saveAudioMany(entries: Array<{ key: string; blob: Blob }>): Promise<void> {
  if (entries.length) await setMany(entries.map((e) => [e.key, e.blob] as [string, Blob]), store);
}

export async function getAudio(key: string): Promise<Blob | undefined> {
  return get<Blob>(key, store);
}

export async function clearAudio(): Promise<void> {
  await clear(store);
}

/**
 * A playable URL for an activity: its recording from IndexedDB, else its bundled sample clip, else null
 * ("audio not in demo"). Caller must `URL.revokeObjectURL` the result when `revoke` is true.
 */
export async function resolveActivityAudio(a: Activity): Promise<{ url: string; revoke: boolean } | null> {
  if (a.audioKey) {
    const blob = await getAudio(a.audioKey).catch(() => undefined);
    if (blob) return { url: URL.createObjectURL(blob), revoke: true };
  }
  if (a.audioSrc) return { url: a.audioSrc, revoke: false };
  return null;
}
