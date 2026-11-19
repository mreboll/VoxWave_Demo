import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useReducedMotion } from '../../design/useReducedMotion';
import { LogoAnimation } from '../../components/LogoAnimation';
import { PrototypeFooter } from '../../components/PrototypeFooter';
import { springSoft } from '../../design/motion';

/** A wave drawn at full height; it is calmed by squashing it (scaleY), not by redrawing the path. */
function wavePath(amp: number, phase: number, freq: number, width = 300, mid = 60, points = 40) {
  let d = '';
  for (let i = 0; i <= points; i++) {
    const x = (i / points) * width;
    const edge = Math.sin((i / points) * Math.PI);
    const y = mid + Math.sin((i / points) * Math.PI * 2 * freq + phase) * amp * edge;
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)} `;
  }
  return d.trim();
}

const STROKES = [
  { color: 'var(--color-coral)', freq: 3, phase: 0, width: 3.5 },
  { color: 'var(--color-teal-bright)', freq: 2.5, phase: 1.4, width: 2.5 },
  { color: '#f4f8fa', freq: 3.6, phase: 2.6, width: 2 },
];
const WAVE_AMPLITUDE = 38;
/** How flat the waves end up (the old 1.5 px amplitude, as a fraction of the full one). */
const CALM = 0.04;
/** Paper disc that "turns the lights on": large enough to cover the tallest phone frame from its centre. */
const LIGHT_DIAMETER = 1200;

/**
 * 2–3 s "Analysing…" (brief §6.4): the voice wave calms into three strokes, the screen lights up from navy
 * to paper and the three strokes become the VoxWave symbol, as in the pitch video. Only transform and
 * opacity animate: the waves are squashed flat and the paper opens as a disc from the centre.
 */
export function Analysing({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion();
  const [stage, setStage] = useState<'calming' | 'logo' | 'done'>(reduced ? 'logo' : 'calming');

  useEffect(() => {
    const timers = reduced
      ? [window.setTimeout(() => setStage('done'), 700), window.setTimeout(onDone, 1400)]
      : [
          window.setTimeout(() => setStage('logo'), 950),
          window.setTimeout(() => setStage('done'), 1950),
          window.setTimeout(onDone, 2600),
        ];
    return () => timers.forEach(window.clearTimeout);
    // onDone is called once; re-running would restart the moment.
  }, []);

  const paths = useMemo(() => STROKES.map((s) => wavePath(WAVE_AMPLITUDE, s.phase, s.freq)), []);
  const lit = stage !== 'calming';

  return (
    <motion.div
      className="absolute inset-0 z-40 flex flex-col items-center justify-center overflow-hidden bg-navy"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      role="status"
      aria-live="polite"
    >
      {/* The lights come on: a paper disc grows from the centre until it covers the screen. */}
      <motion.div
        aria-hidden
        className="absolute top-1/2 left-1/2 rounded-full bg-paper"
        style={{ width: LIGHT_DIAMETER, height: LIGHT_DIAMETER, marginTop: -LIGHT_DIAMETER / 2, marginLeft: -LIGHT_DIAMETER / 2 }}
        initial={{ scale: reduced ? 1 : 0 }}
        animate={{ scale: lit ? 1 : 0 }}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 130, damping: 24 }}
      />

      <div className="relative flex h-[140px] w-[300px] items-center justify-center">
        <AnimatePresence>
          {!lit && (
            <motion.svg
              key="waves"
              viewBox="0 0 300 120"
              width={300}
              height={120}
              className="absolute"
              exit={{ opacity: 0, scaleX: 0.6, transition: { duration: 0.3 } }}
            >
              {/* Squashed inside the SVG (around its own centre), so the strokes keep their weight. */}
              <motion.g initial={{ scaleY: 1 }} animate={{ scaleY: CALM }} transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}>
                {STROKES.map((s, i) => (
                  <path
                    key={s.color}
                    d={paths[i]}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={s.width}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </motion.g>
            </motion.svg>
          )}
        </AnimatePresence>
        {lit && (
          <motion.div initial={{ scale: 0.85 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }}>
            <LogoAnimation size={84} withWordmark={false} delay={0.1} />
          </motion.div>
        )}
      </div>

      <div className="relative mt-8 h-8">
        <AnimatePresence mode="wait">
          <motion.p
            // Re-enters when the lights come on (white → navy) and again for "Done".
            key={stage === 'done' ? 'done' : lit ? 'listening-lit' : 'listening'}
            className={`font-display text-xl font-bold tracking-tight ${lit ? 'text-navy' : 'text-white'}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.12 } }}
            transition={springSoft}
          >
            {stage === 'done' ? 'Done' : 'Listening closely…'}
          </motion.p>
        </AnimatePresence>
      </div>
      <PrototypeFooter dark={!lit} className="absolute bottom-5 text-center" />
    </motion.div>
  );
}
