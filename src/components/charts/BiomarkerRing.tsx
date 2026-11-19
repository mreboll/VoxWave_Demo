import { motion } from 'motion/react';
import { useReducedMotion } from '../../design/useReducedMotion';
import { deltaLevel, formatDelta, type BiomarkerDef } from '../../data/biomarkers';
import { useCountUp } from '../StatCounter';
import { arcPath, clamp } from './geometry';
import { MiniLine } from './Sparkline';

interface BiomarkerRingProps {
  def: BiomarkerDef;
  value: number;
  baseline: number;
  /** Recent values for the tiny sparkline. */
  history: number[];
  delay?: number;
  still?: boolean;
}

const LEVEL_COLOR = { steady: 'var(--color-teal)', watch: 'var(--color-watch)', alert: 'var(--color-coral)' } as const;
const LEVEL_TEXT = { steady: 'text-teal', watch: 'text-watch-ink', alert: 'text-coral-ink' } as const;
const SWEEP = 270; // gauge opens at the bottom
const START = -SWEEP / 2;

// Drawn in a 120-unit box and scaled to the card, so the ring is as large as the card allows.
const BOX = 120;
const CENTRE = BOX / 2;
const RADIUS = 48;
const STROKE = 9;
const TICK = 8; // the baseline tick reaches this far inside and outside the ring

/** "Biomarkers · today" card: ring gauge with a baseline tick, count-up value and delta (brief §7.3). */
export function BiomarkerRing({ def, value, baseline, history, delay = 0, still = false }: BiomarkerRingProps) {
  const reduced = useReducedMotion();
  const animated = !still && !reduced;
  const shown = useCountUp(value, { delay, duration: 1.2 });
  const level = deltaLevel(value, baseline);
  const color = LEVEL_COLOR[level];
  const frac = (v: number) => clamp((v - def.range[0]) / (def.range[1] - def.range[0]), 0, 1);
  const end = START + SWEEP * frac(value);
  const baseAngle = ((START + SWEEP * frac(baseline) - 90) * Math.PI) / 180;
  const tickAt = (r: number) => [CENTRE + r * Math.cos(baseAngle), CENTRE + r * Math.sin(baseAngle)] as const;
  const [tx1, ty1] = tickAt(RADIUS - TICK);
  const [tx2, ty2] = tickAt(RADIUS + TICK);

  return (
    <div className="surface @container flex flex-col rounded-2xl p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display text-[15px] font-semibold text-navy">{def.label}</span>
        <span className="text-[11px] text-ink-muted">{def.measure}</span>
      </div>
      {/* The gauge is open at the bottom: pull the footer up into that gap. */}
      <div className="relative mx-auto mt-3 -mb-2 aspect-square w-full max-w-[136px]">
        <svg viewBox={`0 0 ${BOX} ${BOX}`} className="block h-full w-full" aria-hidden>
          <path d={arcPath(CENTRE, CENTRE, RADIUS, START, START + SWEEP)} fill="none" stroke="var(--color-ink-faint)" strokeWidth={STROKE} strokeLinecap="round" />
          <motion.path
            d={arcPath(CENTRE, CENTRE, RADIUS, START, Math.max(START + 0.5, end))}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            initial={animated ? { pathLength: 0 } : false}
            animate={{ pathLength: 1 }}
            transition={{ delay, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          />
          {/* Baseline tick: a card-coloured gap first, so it reads as a notch on the ring. */}
          <line x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke="var(--color-card)" strokeWidth={6} strokeLinecap="round" />
          <line x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke="var(--color-navy)" strokeWidth={2.25} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="numeral text-[clamp(22px,13cqw,30px)] text-navy">{(still ? value : shown).toFixed(def.decimals)}</span>
          <span className="mt-1.5 text-[11px] font-medium text-ink-muted">{def.unit}</span>
        </div>
      </div>
      {/* In a narrow card (four across at 1024 px) the mini trend wraps under the delta. */}
      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-2 gap-y-2 border-t border-ink-hairline pt-3">
        <div className="min-w-0">
          <div className={`text-[13px] font-semibold ${LEVEL_TEXT[level]}`}>{formatDelta(value, baseline)}</div>
          <div className="mt-0.5 text-[11px] text-ink-muted tabular-nums">
            Baseline {baseline.toFixed(def.decimals)}
            {def.suffix}
          </div>
        </div>
        <MiniLine values={history} color={color} width={72} />
      </div>
    </div>
  );
}
