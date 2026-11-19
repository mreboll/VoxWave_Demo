import { useMemo } from 'react';
import { motion } from 'motion/react';
import { useReducedMotion } from '../design/useReducedMotion';
import { createRng } from '../data/prng';

const COLORS = ['var(--color-coral)', 'var(--color-teal)', 'var(--color-navy)', 'var(--color-coral-soft)', 'var(--color-watch)'];

/** A short, subtle burst from the centre (brief §6.5). Flat shapes in brand colours, then gone. */
export function Confetti({ count = 26, delay = 0 }: { count?: number; delay?: number }) {
  const reduced = useReducedMotion();
  const pieces = useMemo(() => {
    const rng = createRng(2611);
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + rng.range(-0.2, 0.2);
      const dist = rng.range(90, 170);
      return {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist * 0.8 - 30,
        rotate: rng.range(-220, 220),
        color: COLORS[i % COLORS.length],
        w: rng.next() > 0.5 ? 8 : 5,
        h: rng.next() > 0.5 ? 4 : 9,
        round: rng.next() > 0.6,
      };
    });
  }, [count]);

  if (reduced) return null;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className="absolute"
          style={{ width: p.w, height: p.h, background: p.color, borderRadius: p.round ? 999 : 1.5 }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.4, rotate: 0 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 70], opacity: [0, 1, 0], scale: 1, rotate: p.rotate }}
          transition={{ delay, duration: 1.6, ease: [0.16, 1, 0.3, 1], times: [0, 0.45, 1] }}
        />
      ))}
    </div>
  );
}
