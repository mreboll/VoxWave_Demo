// Scripted "analysis" (brief §9.3, §10). No real voice analysis: values are close to the patient's baseline
// for `stable`, or shifted (pitch variability down, pauses up) for `attention`.
import { createRng, round } from './prng';
import type { Metrics, Patient, ResultStatus, WeeklyPoint } from './types';

export type ResultMode = ResultStatus;

/** Baseline for patients without history (the demo patient). */
export const DEFAULT_BASELINE_METRICS: Metrics = { jitterPct: 1.2, pitchHz: 150, rhythmSylPerSec: 4.5, pauseSec: 0.3 };

export function scriptedResult(mode: ResultMode, baseline: Metrics = DEFAULT_BASELINE_METRICS, seed = Date.now()): Metrics {
  const rng = createRng(seed);
  if (mode === 'stable') {
    return {
      jitterPct: round(baseline.jitterPct + rng.gauss() * 0.05, 2),
      pitchHz: Math.round(baseline.pitchHz + rng.gauss() * 1.2),
      rhythmSylPerSec: round(baseline.rhythmSylPerSec + rng.gauss() * 0.05, 2),
      pauseSec: round(baseline.pauseSec + rng.gauss() * 0.008, 2),
    };
  }
  return {
    jitterPct: round(baseline.jitterPct * 1.35 + rng.gauss() * 0.04, 2),
    pitchHz: Math.round(baseline.pitchHz * 0.95),
    rhythmSylPerSec: round(baseline.rhythmSylPerSec * 0.9, 2),
    pauseSec: round(baseline.pauseSec * 1.3 + rng.gauss() * 0.006, 2),
  };
}

/**
 * Composite 0–100 "voice stability" index of a session vs the patient's own baseline.
 * Each biomarker's relative deviation costs points; a session at baseline sits at the band centre.
 */
export function stabilityScore(m: Metrics, baseline: Metrics, bandCenter: number): number {
  const rel = (v: number, b: number) => Math.abs(v - b) / b;
  const penalty =
    rel(m.jitterPct, baseline.jitterPct) * 30 +
    rel(m.pitchHz, baseline.pitchHz) * 60 +
    rel(m.rhythmSylPerSec, baseline.rhythmSylPerSec) * 40 +
    rel(m.pauseSec, baseline.pauseSec) * 30;
  return round(Math.max(0, Math.min(100, bandCenter + 2 - penalty)), 1);
}

export const bandCenter = (p: Pick<Patient, 'baseline'>) => (p.baseline.low + p.baseline.high) / 2;

export const isOutsideBand = (point: WeeklyPoint, p: Pick<Patient, 'baseline'>) =>
  point.score < p.baseline.low || point.score > p.baseline.high;

/** Number of most recent consecutive weeks outside the band (P-0187 → 2). */
export function weeksOutsideBand(p: Pick<Patient, 'baseline' | 'trend'>): number {
  let n = 0;
  for (let i = p.trend.length - 1; i >= 0 && isOutsideBand(p.trend[i], p); i--) n++;
  return n;
}
