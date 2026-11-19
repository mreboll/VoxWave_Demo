import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../design/useReducedMotion';

interface IdleWaveProps {
  className?: string;
  /** Stroke colors, back to front. */
  colors?: string[];
  amplitude?: number;
  height?: number;
}

/**
 * The calm "voice wave" motif used outside recording (brief §4.4).
 * Draws layered sine waves on a canvas; static single frame when reduced motion is on.
 */
const DEFAULT_COLORS = ['var(--color-teal)', 'var(--color-navy)', 'var(--color-coral)'];

export function IdleWave({
  className = '',
  colors = DEFAULT_COLORS,
  amplitude = 0.32,
  height = 120,
}: IdleWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resolved = colors.map((c) =>
      c.startsWith('var(') ? getComputedStyle(canvas).getPropertyValue(c.slice(4, -1)).trim() || '#092634' : c,
    );

    let raf = 0;
    let width = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = canvas.clientWidth;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height);
      const mid = height / 2;
      resolved.forEach((color, layer) => {
        const speed = 0.00045 + layer * 0.00018;
        const freq = 0.010 + layer * 0.0035;
        const amp = mid * amplitude * (1 - layer * 0.18);
        ctx.beginPath();
        for (let x = 0; x <= width; x += 3) {
          // Taper at both ends so the wave fades into the page.
          const edge = Math.sin((x / width) * Math.PI);
          const y =
            mid +
            Math.sin(x * freq + t * speed * 6 + layer * 1.7) * amp * edge +
            Math.sin(x * freq * 2.3 - t * speed * 4) * amp * 0.35 * edge;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = color;
        ctx.globalAlpha = layer === resolved.length - 1 ? 0.95 : 0.35 + layer * 0.15;
        ctx.lineWidth = layer === resolved.length - 1 ? 2.25 : 1.5;
        ctx.lineCap = 'round';
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
      if (!reduced) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [colors, amplitude, height, reduced]);

  return <canvas ref={canvasRef} className={`block w-full ${className}`} style={{ height }} aria-hidden />;
}
