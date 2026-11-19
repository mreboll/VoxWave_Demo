import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../design/useReducedMotion';
import { createRng, hashString } from '../data/prng';

interface WaveformReplayProps {
  /** Seeds the synthetic shape used until (or instead of) a real envelope. */
  seed: string;
  /** Loudness envelope of the real recording (0–1). When given, the bars are the actual voice. */
  envelope?: number[] | null;
  /** Playback position 0–1 while the clip plays; otherwise the playhead sweeps on its own ("replay"). */
  progress?: number | null;
  height?: number;
  className?: string;
  /** Bar colour for the played part. */
  color?: string;
  /** Bar colour for the part not yet played (light by default: the card is on navy). */
  restColor?: string;
}

const BAR = 3;
const GAP = 2;
const SWEEP_MS = 4200;

/**
 * Waveform replay for the Live check-in card (brief §7.2). With a real envelope the whole recording is laid
 * out and a playhead sweeps across it (or follows playback); without one, speech-shaped bars scroll past.
 */
export function WaveformReplay({
  seed,
  envelope = null,
  progress = null,
  height = 64,
  className = '',
  color = 'var(--color-coral)',
  restColor = 'rgba(244, 248, 250, 0.22)',
}: WaveformReplayProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const css = getComputedStyle(canvas);
    const resolve = (c: string) => (c.startsWith('var(') ? css.getPropertyValue(c.slice(4, -1)).trim() : c);
    const played = resolve(color);
    const rest = resolve(restColor);

    // Synthetic fallback: speech-like bursts (syllables) with short and long pauses.
    const rng = createRng(hashString(seed));
    const synthetic: number[] = [];
    while (synthetic.length < 600) {
      const len = 4 + Math.floor(rng.next() * 7);
      for (let i = 0; i < len; i++) synthetic.push(Math.sin((i / len) * Math.PI) * (0.45 + rng.next() * 0.55));
      const gap = rng.next() < 0.2 ? 6 + Math.floor(rng.next() * 6) : 1 + Math.floor(rng.next() * 2);
      for (let i = 0; i < gap; i++) synthetic.push(0.04 + rng.next() * 0.04);
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    const resize = () => {
      width = canvas.clientWidth;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    const start = performance.now();
    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height);
      const bars = Math.floor(width / (BAR + GAP));
      const elapsed = t - start;
      let playhead: number;
      let valueAt: (i: number) => number;

      if (envelope && envelope.length) {
        // Whole recording, resampled to the bar count; playhead follows playback or sweeps.
        const p = progressRef.current;
        const frac = p !== null && p !== undefined ? p : reduced ? 1 : (elapsed % SWEEP_MS) / SWEEP_MS;
        playhead = Math.floor(bars * frac);
        valueAt = (i) => envelope[Math.min(envelope.length - 1, Math.floor((i / bars) * envelope.length))];
      } else {
        const offset = reduced ? 0 : (elapsed / 70) % synthetic.length;
        playhead = Math.floor(bars * 0.62);
        valueAt = (i) => synthetic[Math.floor(i + offset) % synthetic.length];
      }

      for (let i = 0; i < bars; i++) {
        const v = Math.max(0.04, valueAt(i));
        const h = Math.max(2, v * (height - 6));
        const isPlayed = i <= playhead;
        ctx.fillStyle = isPlayed ? played : rest;
        ctx.globalAlpha = isPlayed ? 0.45 + 0.55 * (playhead ? i / playhead : 1) : 1;
        ctx.beginPath();
        ctx.roundRect(i * (BAR + GAP), (height - h) / 2, BAR, h, 1.5);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (!reduced || envelope) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [seed, envelope, height, color, restColor, reduced]);

  return <canvas ref={ref} className={`block w-full ${className}`} style={{ height }} aria-hidden />;
}
