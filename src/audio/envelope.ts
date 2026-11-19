import { useEffect, useRef, useState } from 'react';
import type { Activity } from '../data/types';
import { resolveActivityAudio } from './storage';

// Loudness envelope of a real recording, for the Live check-in replay (the bars are the actual voice).
// Decoded with an OfflineAudioContext: no user gesture needed and nothing is played.

const cache = new Map<string, Promise<number[] | null>>();

type OfflineCtor = typeof OfflineAudioContext;

async function decodeEnvelope(activity: Activity, bars: number): Promise<number[] | null> {
  const src = await resolveActivityAudio(activity);
  if (!src) return null;
  try {
    const buf = await (await fetch(src.url)).arrayBuffer();
    const Ctor: OfflineCtor | undefined =
      window.OfflineAudioContext ?? (window as unknown as { webkitOfflineAudioContext?: OfflineCtor }).webkitOfflineAudioContext;
    if (!Ctor) return null;
    const ctx = new Ctor(1, 44100, 44100);
    const audio = await ctx.decodeAudioData(buf);
    const data = audio.getChannelData(0);
    const size = Math.max(1, Math.floor(data.length / bars));
    const out: number[] = [];
    for (let b = 0; b < bars; b++) {
      let sum = 0;
      for (let i = b * size; i < (b + 1) * size && i < data.length; i++) sum += data[i] * data[i];
      out.push(Math.sqrt(sum / size));
    }
    const peak = Math.max(...out, 1e-4);
    return out.map((v) => Math.min(1, v / peak));
  } catch {
    return null; // undecodable (rare codec): the card falls back to the synthetic replay
  } finally {
    if (src.revoke) URL.revokeObjectURL(src.url);
  }
}

/** Normalised envelope (0–1) of an activity's audio, or null while loading / when there is none. */
export function useAudioEnvelope(activity: Activity | undefined, cacheKey: string, bars = 140) {
  const [env, setEnv] = useState<number[] | null>(null);
  // Derived data re-creates activity objects on every store change; the key is what identifies the audio.
  const activityRef = useRef(activity);
  activityRef.current = activity;
  useEffect(() => {
    setEnv(null);
    const a = activityRef.current;
    if (!a) return;
    let alive = true;
    const key = `${cacheKey}:${bars}`;
    if (!cache.has(key)) cache.set(key, decodeEnvelope(a, bars));
    void cache.get(key)!.then((e) => alive && setEnv(e));
    return () => {
      alive = false;
    };
  }, [cacheKey, bars]);
  return env;
}
