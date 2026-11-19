// Display config for the four biomarkers (brief §7.3) and how far a value is from the patient's baseline.
import type { ActivityType, Metrics } from './types';

export type MetricKey = keyof Metrics;

export interface BiomarkerDef {
  key: MetricKey;
  label: string;
  /** What is measured, shown small under the label. */
  measure: string;
  unit: string;
  /** Unit as written after the number ("1.8 %", "124 Hz"). */
  suffix: string;
  decimals: number;
  /** Gauge range for the ring. */
  range: [number, number];
}

export const BIOMARKERS: BiomarkerDef[] = [
  { key: 'jitterPct', label: 'Tremor', measure: 'jitter', unit: '%', suffix: ' %', decimals: 1, range: [0, 3] },
  { key: 'pitchHz', label: 'Pitch', measure: 'mean F0', unit: 'Hz', suffix: ' Hz', decimals: 0, range: [60, 260] },
  { key: 'rhythmSylPerSec', label: 'Rhythm', measure: 'speech rate', unit: 'syl/s', suffix: ' syl/s', decimals: 1, range: [2, 6.5] },
  { key: 'pauseSec', label: 'Pauses', measure: 'mean pause', unit: 's', suffix: ' s', decimals: 2, range: [0, 0.8] },
];

export const formatMetric = (def: BiomarkerDef, v: number) => `${v.toFixed(def.decimals)}${def.suffix}`;

/** Relative change vs baseline, e.g. 0.38 → +38 %. */
export const relativeDelta = (value: number, baseline: number) => (baseline === 0 ? 0 : (value - baseline) / baseline);

export type DeltaLevel = 'steady' | 'watch' | 'alert';

/** ≤7 % steady, ≤15 % watch, beyond that alert. Scripted thresholds, not clinical ones. */
export function deltaLevel(value: number, baseline: number): DeltaLevel {
  const d = Math.abs(relativeDelta(value, baseline));
  return d > 0.15 ? 'alert' : d > 0.07 ? 'watch' : 'steady';
}

export function formatDelta(value: number, baseline: number): string {
  const pct = Math.round(relativeDelta(value, baseline) * 100);
  if (pct === 0) return 'At baseline';
  return `${pct > 0 ? '+' : '−'}${Math.abs(pct)} % vs baseline`;
}

export const ACTIVITY_LABEL: Record<ActivityType, string> = {
  sustained_vowel: 'Hold an “aah”',
  reading: 'Read a line',
  conversation: 'Chat a little',
};

export const ACTIVITY_SHORT: Record<ActivityType, string> = {
  sustained_vowel: 'Aah',
  reading: 'Read',
  conversation: 'Chat',
};
