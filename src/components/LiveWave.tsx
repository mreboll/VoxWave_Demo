import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../design/useReducedMotion';
import type { FrameSource } from '../audio/synthetic';
import { rms } from '../audio/recorder';

interface LiveWaveProps {
  /** Where samples come from: the microphone analyser or the synthetic source. null = calm idle wave. */
  source: FrameSource | null;
  height?: number;
  className?: string;
  /** Called ~60×/s with the current loudness (0–1), e.g. for a glow. */
  onLevel?: (level: number) => void;
}

const N = 2048;
const POINTS = 96;

/**
 * The voice wave on the navy session screen (brief §4.4, §6.3). Three strokes — coral (the voice), bright
 * teal and a faint white echo — follow the live samples. A slow auto-gain keeps quiet voices visible
 * without blowing room noise up.
 */
export function LiveWave({ source, height = 180, className = '', onLevel }: LiveWaveProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const sourceRef = useRef(source);
  sourceRef.current = source;
  const onLevelRef = useRef(onLevel);
  onLevelRef.current = onLevel;
  // Read through a ref: a new height (the session sizes the wave to the space left) must only resize the
  // canvas, not restart the loop — restarting would reset the smoothed shape and the auto-gain mid-recording.
  const heightRef = useRef(height);
  heightRef.current = height;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const css = getComputedStyle(canvas);
    const coral = css.getPropertyValue('--color-coral').trim() || '#ff6e42';
    const teal = css.getPropertyValue('--color-teal-bright').trim() || '#2f9bcb';

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    const resize = () => {
      width = canvas.clientWidth;
      canvas.width = width * dpr;
      canvas.height = heightRef.current * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const buf = new Float32Array(N);
    const shape = new Float32Array(POINTS); // smoothed display values
    const echo = new Float32Array(POINTS);
    let peak = 0.08;
    let raf = 0;
    const start = performance.now();

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      const src = sourceRef.current;
      let level = 0;
      if (src) {
        src.read(buf);
        level = rms(buf);
      }
      onLevelRef.current?.(level);

      // Auto-gain: follow the peak quickly up, slowly down; never amplify below a noise floor.
      let maxAbs = 0;
      if (src) for (let i = 0; i < N; i += 4) maxAbs = Math.max(maxAbs, Math.abs(buf[i]));
      peak = maxAbs > peak ? maxAbs : peak * 0.985 + maxAbs * 0.015;
      const gain = Math.min(9, 0.85 / Math.max(peak, 0.035));

      const height = heightRef.current;
      const mid = height / 2;
      for (let p = 0; p < POINTS; p++) {
        const edge = Math.sin((p / (POINTS - 1)) * Math.PI) ** 1.2; // taper to the sides
        let v: number;
        if (src) {
          // Average a small window per point so the line is smooth, not jagged.
          const i0 = Math.floor((p / POINTS) * N);
          let s = 0;
          for (let k = 0; k < 16; k++) s += buf[(i0 + k) % N];
          v = (s / 16) * gain;
        } else {
          v = 0.08 * Math.sin(p * 0.16 + t * 1.6) + 0.04 * Math.sin(p * 0.37 - t * 1.1);
        }
        const target = Math.max(-1, Math.min(1, v)) * edge;
        shape[p] += (target - shape[p]) * (reduced ? 1 : 0.35);
        echo[p] += (shape[p] - echo[p]) * 0.12;
      }

      ctx.clearRect(0, 0, width, height);
      const line = (arr: Float32Array, scale: number, color: string, alpha: number, lw: number, offset = 0) => {
        ctx.beginPath();
        for (let p = 0; p < POINTS; p++) {
          const x = (p / (POINTS - 1)) * width;
          const y = mid + arr[p] * scale * (height * 0.45) + offset;
          if (p === 0) ctx.moveTo(x, y);
          else {
            const px = ((p - 1) / (POINTS - 1)) * width;
            const py = mid + arr[p - 1] * scale * (height * 0.45) + offset;
            ctx.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
          }
        }
        ctx.strokeStyle = color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = lw;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      };
      line(echo, -0.7, '#f4f8fa', 0.18, 1.5);
      line(echo, 0.85, teal, 0.75, 2.25);
      line(shape, 1, coral, 1, 3.5);
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
    // The ResizeObserver above picks up a new height (the canvas's CSS height changes with the prop).
  }, [reduced]);

  return <canvas ref={ref} className={`block w-full ${className}`} style={{ height }} aria-hidden />;
}
