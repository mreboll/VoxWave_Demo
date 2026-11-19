import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useReducedMotion } from '../../design/useReducedMotion';
import { weekKeys } from '../../data/seed';
import { isOutsideBand, weeksOutsideBand } from '../../data/scripted';
import { formatDay } from '../../data/dates';
import type { Patient } from '../../data/types';
import { useElementWidth } from '../useElementWidth';
import { clamp, linear, smoothPath } from './geometry';
import { now } from '../../data/clock';

interface TrendChartProps {
  patient: Pick<Patient, 'trend' | 'baseline' | 'baselineBuilding'>;
  height?: number;
  /** Seconds before the line starts drawing. */
  delay?: number;
  interactive?: boolean;
  /** Coral annotation next to the points outside the band. */
  annotate?: boolean;
  /** Static rendering (print / report): no draw-in, no hover. */
  still?: boolean;
}

const PAD = { l: 36, r: 18, t: 20, b: 30 };
const LINE_DURATION = 1.3;

/**
 * "Voice trend · 14 weeks" (brief §7.3): weekly stability index with the personal baseline band.
 * The band fades in, the line draws itself, then the points pop — coral when outside the band.
 */
export function TrendChart({ patient, height = 280, delay = 0, interactive = true, annotate = true, still = false }: TrendChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>(640);
  const reduced = useReducedMotion();
  const animated = !still && !reduced;
  const [hover, setHover] = useState<number | null>(null);

  const slots = useMemo(() => weekKeys(now()), []);
  const points = useMemo(
    () =>
      patient.trend
        .map((p) => ({ ...p, slot: slots.indexOf(p.week), outside: isOutsideBand(p, patient) }))
        .filter((p) => p.slot >= 0),
    [patient, slots],
  );

  const scores = points.map((p) => p.score);
  const yMin = Math.floor(Math.min(patient.baseline.low, ...scores) - 4);
  const yMax = Math.ceil(Math.max(patient.baseline.high, ...scores) + 4);
  const innerW = Math.max(10, width - PAD.l - PAD.r);
  const x = linear(0, slots.length - 1, PAD.l, PAD.l + innerW);
  const y = linear(yMin, yMax, height - PAD.b, PAD.t);

  const xy = points.map((p) => [x(p.slot), y(p.score)] as [number, number]);
  const line = smoothPath(xy);
  const bandTop = y(patient.baseline.high);
  const bandBottom = y(patient.baseline.low);
  const outsideWeeks = weeksOutsideBand(patient);
  const ticks = niceTicks(yMin, yMax);

  const pointDelay = (i: number) => delay + (LINE_DURATION * (i + 1)) / Math.max(points.length, 1);
  // The trailing run of points outside the band (what the annotation points at).
  const outsideRun = points.slice(points.length - outsideWeeks);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!interactive || still || points.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(x(p.slot) - px) < Math.abs(x(points[best].slot) - px)) best = i;
    });
    setHover(best);
  };

  const hovered = hover !== null ? points[hover] : null;

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          className="block overflow-visible"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          role="img"
          aria-label={`Voice stability over ${slots.length} weeks; personal baseline ${patient.baseline.low} to ${patient.baseline.high}.`}
        >
          {/* Grid + y labels */}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={PAD.l + innerW} y1={y(t)} y2={y(t)} stroke="var(--color-ink-hairline)" strokeWidth={1} />
              <text x={PAD.l - 10} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink-muted text-[11px] tabular-nums">
                {t}
              </text>
            </g>
          ))}

          {/* Personal baseline band */}
          <motion.g
            initial={animated ? { opacity: 0, scaleY: 0.6 } : false}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ delay, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: `0px ${(bandTop + bandBottom) / 2}px` }}
          >
            <rect x={PAD.l} y={bandTop} width={innerW} height={bandBottom - bandTop} fill="var(--color-teal)" opacity={0.08} />
            {[bandTop, bandBottom].map((yy) => (
              <line
                key={yy}
                x1={PAD.l}
                x2={PAD.l + innerW}
                y1={yy}
                y2={yy}
                stroke="var(--color-teal)"
                strokeOpacity={0.4}
                strokeWidth={1}
                strokeDasharray={patient.baselineBuilding ? '4 4' : undefined}
              />
            ))}
            <text x={PAD.l + innerW} y={bandTop - 7} textAnchor="end" className="fill-teal text-[11px] font-semibold">
              {patient.baselineBuilding ? 'Personal baseline · building' : 'Personal baseline'}
            </text>
          </motion.g>

          {/* X axis: a rule, a tick per week, a date every other week */}
          <line x1={PAD.l} x2={PAD.l + innerW} y1={height - PAD.b} y2={height - PAD.b} stroke="var(--color-ink-faint)" strokeWidth={1} />
          {slots.map((w, i) => (
            <g key={w}>
              <line x1={x(i)} x2={x(i)} y1={height - PAD.b} y2={height - PAD.b + 4} stroke="var(--color-ink-faint)" strokeWidth={1} />
              {i % 2 === (slots.length - 1) % 2 && (
                <text x={x(i)} y={height - 8} textAnchor="middle" className="fill-ink-muted text-[11px] tabular-nums">
                  {formatDay(`${w}T12:00:00`)}
                </text>
              )}
            </g>
          ))}

          {/* Hover guide */}
          {hovered && <line x1={x(hovered.slot)} x2={x(hovered.slot)} y1={PAD.t} y2={height - PAD.b} stroke="var(--color-navy)" strokeOpacity={0.18} />}

          {/* The line */}
          <motion.path
            d={line}
            fill="none"
            stroke="var(--color-navy)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={animated ? { pathLength: 0 } : false}
            animate={{ pathLength: 1 }}
            transition={{ delay: delay + 0.15, duration: LINE_DURATION, ease: [0.65, 0, 0.35, 1] }}
          />

          {/* Points */}
          {points.map((p, i) => {
            const isLast = i === points.length - 1;
            const r = p.outside ? 6 : hover === i ? 5 : 3.5;
            return (
              <g key={p.week} transform={`translate(${x(p.slot)},${y(p.score)})`}>
                {p.outside && isLast && animated && (
                  <motion.circle
                    r={6}
                    fill="var(--color-coral)"
                    initial={{ opacity: 0.5, scale: 1 }}
                    animate={{ opacity: [0.45, 0], scale: [1, 3] }}
                    transition={{ delay: pointDelay(i) + 0.3, duration: 1.8, repeat: Infinity, repeatDelay: 0.6 }}
                  />
                )}
                <motion.circle
                  r={r}
                  // Outside the band: a solid coral dot with a card-coloured edge, so it stands clear of the line.
                  fill={p.outside ? 'var(--color-coral)' : 'var(--color-card)'}
                  stroke={p.outside ? 'var(--color-card)' : 'var(--color-navy)'}
                  strokeWidth={2}
                  initial={animated ? { scale: 0 } : false}
                  animate={{ scale: 1 }}
                  transition={{ delay: pointDelay(i), type: 'spring', stiffness: 500, damping: p.outside ? 12 : 22 }}
                />
              </g>
            );
          })}

          {/* Annotation for weeks outside the band */}
          {annotate && outsideRun.length > 0 && (
            <Annotation
              target={[x(outsideRun[0].slot), y(outsideRun[0].score)]}
              // Level with the most extreme point: left of the run the line is back inside the band, so it's free.
              labelY={outsideRun.reduce((m, p) => (Math.abs(y(p.score) - bandBottom) > Math.abs(m - bandBottom) ? y(p.score) : m), y(outsideRun[0].score))}
              minX={PAD.l + 4}
              weeks={outsideWeeks}
              delay={animated ? pointDelay(points.length - 1) + 0.25 : 0}
              animated={animated}
            />
          )}
        </svg>
      )}

      {/* Outer div positions (its transform is static); inner one animates, so Motion can't override the offset. */}
      {hovered && (
        <div
          className="pointer-events-none absolute z-10"
          style={{
            left: clamp(x(hovered.slot), 92, width - 92),
            top: y(hovered.score) - 14,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <AnimatePresence>
            <motion.div
              key="tip"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="w-max rounded-xl bg-navy px-3.5 py-2.5 text-xs text-white shadow-overlay"
            >
              <div className="text-white/60">Week of {formatDay(`${hovered.week}T12:00:00`)}</div>
              <div className="mt-1 font-display text-[15px] font-bold tracking-tight tabular-nums">Stability {hovered.score.toFixed(1)}</div>
              <div className={hovered.outside ? 'text-coral-soft' : 'text-white/70'}>
                {hovered.outside ? 'Outside personal baseline' : 'Within personal baseline'}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/** Coral pill to the left of the first out-of-band point, with a short leader line to it. */
function Annotation({
  target: [tx, ty],
  labelY,
  minX,
  weeks,
  delay,
  animated,
}: {
  target: [number, number];
  labelY: number;
  minX: number;
  weeks: number;
  delay: number;
  animated: boolean;
}) {
  const label = `Outside personal baseline · ${weeks} week${weeks > 1 ? 's' : ''}`;
  const w = label.length * 6.1 + 20;
  const bx = Math.max(minX, tx - w - 22);
  const by = labelY - 11;
  const tipX = tx - 8;
  return (
    <motion.g
      initial={animated ? { opacity: 0, x: -8 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, type: 'spring', stiffness: 260, damping: 22 }}
    >
      <path d={`M${bx + w},${labelY} L${tipX},${ty}`} stroke="var(--color-coral)" strokeWidth={1.5} strokeLinecap="round" fill="none" />
      <rect x={bx} y={by} width={w} height={22} rx={11} fill="var(--color-coral)" />
      <text x={bx + w / 2} y={by + 11} dy="0.34em" textAnchor="middle" className="fill-on-coral text-[11px] font-semibold">
        {label}
      </text>
    </motion.g>
  );
}

function niceTicks(min: number, max: number): number[] {
  const span = max - min;
  const step = span > 30 ? 10 : 5;
  const out: number[] = [];
  for (let t = Math.ceil(min / step) * step; t <= max; t += step) out.push(t);
  return out;
}
