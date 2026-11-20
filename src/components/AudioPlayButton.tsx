import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { motion } from 'motion/react';
import { Pause, Play, VolumeX } from 'lucide-react';
import { playbackProgress } from '../audio/progress';
import { resolveActivityAudio } from '../audio/storage';
import type { Activity } from '../data/types';

// One shared <audio> element: starting a clip stops the previous one.
interface PlaybackState {
  current: string | null;
  progress: number;
  play: (id: string, activity: Activity) => Promise<boolean>;
  stop: () => void;
}

let audio: HTMLAudioElement | null = null;
let revoke: (() => void) | null = null;

export const usePlayback = create<PlaybackState>((set, get) => ({
  current: null,
  progress: 0,
  play: async (id, activity) => {
    get().stop();
    const src = await resolveActivityAudio(activity);
    if (!src) return false;
    audio ??= new Audio();
    audio.src = src.url;
    revoke = src.revoke ? () => URL.revokeObjectURL(src.url) : null;
    audio.ontimeupdate = () =>
      audio && set({ progress: playbackProgress(audio.currentTime, audio.duration, activity.durationSec) });
    audio.onended = () => get().stop();
    set({ current: id, progress: 0 });
    try {
      await audio.play();
      return true;
    } catch {
      get().stop();
      return false;
    }
  },
  stop: () => {
    audio?.pause();
    revoke?.();
    revoke = null;
    set({ current: null, progress: 0 });
  },
}));

/** True when an activity has something to play (a local recording or a bundled clip). */
export const hasAudio = (a: Activity) => Boolean(a.audioKey || a.audioSrc);

interface AudioPlayButtonProps {
  /** Unique per session + activity. */
  id: string;
  activity: Activity;
  label: string;
}

export function AudioPlayButton({ id, activity, label }: AudioPlayButtonProps) {
  const playing = usePlayback((s) => s.current === id);
  const progress = usePlayback((s) => (s.current === id ? s.progress : 0));
  const [missing, setMissing] = useState(false);
  const available = hasAudio(activity);

  useEffect(() => () => {
    if (usePlayback.getState().current === id) usePlayback.getState().stop();
  }, [id]);

  if (!available) {
    return (
      // No outline: clips that are not in the demo recede, so the playable ones stand out in a long list.
      <span className="inline-flex items-center gap-1 px-1.5 py-1 text-[11px] font-medium text-ink-muted/60" title="Audio not in demo">
        <VolumeX size={12} />
        {label}
      </span>
    );
  }

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      onClick={async () => {
        if (playing) return usePlayback.getState().stop();
        const ok = await usePlayback.getState().play(id, activity);
        setMissing(!ok);
      }}
      className={`btn relative inline-flex items-center gap-1.5 overflow-hidden rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${
        playing ? 'bg-navy text-white ring-navy' : 'bg-card text-navy ring-ink-faint'
      }`}
      title={missing ? 'Audio unavailable. Press to retry playback.' : undefined}
      aria-label={`${playing ? 'Stop' : missing ? 'Retry' : 'Play'} ${label}`}
    >
      {playing && <span className="absolute inset-0 origin-left bg-coral/35" style={{ transform: `scaleX(${progress})` }} />}
      <span className="relative inline-flex items-center gap-1.5">
        {playing ? <Pause size={11} fill="currentColor" /> : <Play size={11} fill="currentColor" />}
        {missing && !playing ? 'Retry' : label}
      </span>
    </motion.button>
  );
}
