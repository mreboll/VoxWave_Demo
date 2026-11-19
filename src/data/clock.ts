// The app's clock. Normally the real time in the browser's zone. In rehearsal mode (demo panel) it is
// "20 November 2026 in Vilnius" at the current Vilnius time of day, so the stage demo can be rehearsed
// exactly as it will run at the final (D66). Imported data is never shifted: only "now" changes.
import { instantOf, partsIn } from './tz';

export const FINAL_ZONE = 'Europe/Vilnius';
export const FINAL_DAY = { y: 2026, m: 11, d: 20 } as const;

let offsetMs = 0;
let zone: string | undefined;

/** Current instant (shifted in rehearsal mode). Use instead of `new Date()` for anything date-related. */
export const now = () => new Date(Date.now() + offsetMs);

/** Zone used for "today", weeks and displayed times; undefined = the browser's zone. */
export const timeZone = () => zone;

export const isRehearsal = () => zone !== undefined;

/** Called once at startup (and after a reload when the setting changes). */
export function applyRehearsal(on: boolean, realNow: Date = new Date()) {
  if (!on) {
    offsetMs = 0;
    zone = undefined;
    return;
  }
  zone = FINAL_ZONE;
  const p = partsIn(realNow, FINAL_ZONE);
  const target = instantOf({ ...FINAL_DAY, h: p.h, mi: p.mi, s: p.s }, FINAL_ZONE);
  offsetMs = target.getTime() - realNow.getTime();
}
