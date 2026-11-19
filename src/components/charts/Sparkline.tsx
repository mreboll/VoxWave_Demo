import { useMemo } from 'react';
import { motion } from 'motion/react';
import { useReducedMotion } from '../../design/useReducedMotion';
import { weekKeys } from '../../data/seed';
import { isOutsideBand } from '../../data/scripted';
import type { Patient } from '../../data/types';
import { linear, smoothPath } from './geometry';
import { now } from '../../data/clock';

interface SparklineProps {
  patient: Pick<Patient, 'trend' | 'baseline' | 'baselineBuilding'>;
  width?: number;
  height?: number;
  delay?: number;
}

/** 14-week trend in miniature, with the baseline band (dashboard cards). */
export function Sparkline({ patient, width = 132, height = 38, delay = 0 }: SparklineProps) {
  const reduced = useReducedMotion();
  const slots = useMemo(() => weekKeys(now()), []);
  const pts = patient.trend.map((p) => ({ ...p, slot: slots.indexOf(p.week) })).filter((p) => p.slot >= 0);
  const scores = pts.map((p) => p.score);
  const min = Math.min(patient.baseline.low, ...scores) - 2;
  const max = Math.max(patient.baseline.high, ...scores) + 2;
  const x = linear(0, slots.length - 1, 3, width - 5);
  const y = linear(min, max, height - 3, 3);
  const last = pts[pts.length - 1];
  const lastOutside = last ? isOutsideBand(last, patient) : false;

  return (
    <svg width={width} height={height} className="block overflow-visible" aria-hidden>
      <rect
        x={0}
        y={y(patient.baseline.high)}
        width={width}
        height={y(patient.baseline.low) - y(patient.baseline.high)}
        fill="var(--color-teal)"
        opacity={0.1}
        rx={2}
      />
      {patient.baselineBuilding && (
        <rect
          x={0.5}
          y={y(patient.baseline.high)}
          width={width - 1}
          height={y(patient.baseline.low) - y(patient.baseline.high)}
          fill="none"
          stroke="var(--color-teal)"
          strokeOpacity={0.4}
          strokeDasharray="3 3"
          rx={2}
        />
      )}
      {/* Keyed by the number of points so an extended trend (device sync) redraws itself. */}
      <motion.path
        key={pts.length}
        d={smoothPath(pts.map((p) => [x(p.slot), y(p.score)]))}
        fill="none"
        stroke="var(--color-navy)"
        strokeWidth={1.6}
        strokeLinecap="round"
        initial={reduced ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay, duration: 0.9, ease: [0.65, 0, 0.35, 1] }}
      />
      {last && (
        <motion.circle
          key={`dot-${pts.length}`}
          cx={x(last.slot)}
          cy={y(last.score)}
          r={lastOutside ? 3.5 : 2.5}
          fill={lastOutside ? 'var(--color-coral)' : 'var(--color-navy)'}
          initial={reduced ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: delay + 0.85, type: 'spring', stiffness: 500, damping: 14 }}
        />
      )}
    </svg>
  );
}

/** Tiny line of raw values (biomarker cards). */
export function MiniLine({ values, width = 84, height = 24, color = 'var(--color-teal)' }: { values: number[]; width?: number; height?: number; color?: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const x = linear(0, values.length - 1, 1, width - 3);
  const y = linear(min - (max - min || 1) * 0.15, max + (max - min || 1) * 0.15, height - 1, 1);
  const pts = values.map((v, i) => [x(i), y(v)] as [number, number]);
  const lastPt = pts[pts.length - 1];
  return (
    <svg width={width} height={height} className="block overflow-visible" aria-hidden>
      <path d={smoothPath(pts)} fill="none" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
      <circle cx={lastPt[0]} cy={lastPt[1]} r={2.25} fill={color} />
    </svg>
  );
}
