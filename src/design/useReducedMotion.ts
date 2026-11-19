import { useReducedMotion as useOsReducedMotion } from 'motion/react';
import { useAppStore } from '../data/store';

/**
 * Reduced motion = the OS setting (prefers-reduced-motion) OR the demo panel's toggle (D72).
 * Motion's own hook only reads the OS setting, so canvas waves, drawn charts and count-ups would ignore the
 * toggle without this.
 */
export function useReducedMotion(): boolean {
  const os = useOsReducedMotion();
  const forced = useAppStore((s) => s.motion === 'reduce');
  return Boolean(os) || forced;
}
