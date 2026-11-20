// Date helpers, all in the clock's zone (clock.ts): the browser's zone normally, Vilnius in rehearsal mode.
// Rule D19: say "Today" only when the date is today; otherwise show the real date. Imported dates are never
// rewritten.
import { now as clockNow, timeZone } from './clock';
import { instantOf, partsIn } from './tz';
import type { Session } from './types';

/** Order unsynchronised captures by receipt while retaining the device clock for inspection. */
export const sessionTime = (s: Session) => s.captureClockSynced === false && s.receivedAt ? s.receivedAt : s.startedAt;
export const compareSessionTimes = (a: Session, b: Session) =>
  Date.parse(sessionTime(a)) - Date.parse(sessionTime(b)) || Date.parse(a.startedAt) - Date.parse(b.startedAt);

const parts = (d: Date) => partsIn(d, timeZone());
const pad = (n: number) => String(n).padStart(2, '0');

// Fixed three-letter months: en-GB's locale data writes "Sept", which reads inconsistently next to "Nov".
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** YYYY-MM-DD of the calendar day (in the clock's zone, so week keys don't shift across zones). */
export function toDateKey(d: Date): string {
  const p = parts(d);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b);
}

/** "09:12". */
export function formatTime(iso: string): string {
  const p = parts(new Date(iso));
  return `${pad(p.h)}:${pad(p.mi)}`;
}

/** "14 Nov" (adds the year if it differs from `now`). */
export function formatDay(iso: string, now: Date = clockNow()): string {
  const p = parts(new Date(iso));
  const day = `${p.d} ${MONTHS[p.m - 1]}`;
  return p.y !== parts(now).y ? `${day} ${p.y}` : day;
}

/** "Today 09:12" or "14 Nov · 08:20". */
export function formatSessionTime(iso: string, now: Date = clockNow()): string {
  return isSameLocalDay(new Date(iso), now) ? `Today ${formatTime(iso)}` : `${formatDay(iso, now)} · ${formatTime(iso)}`;
}

/** "today 08:05" / "14 Nov 08:20" for use inside sentences ("last one today 08:05"). */
export function formatInSentence(iso: string, now: Date = clockNow()): string {
  return isSameLocalDay(new Date(iso), now) ? `today ${formatTime(iso)}` : `${formatDay(iso, now)} ${formatTime(iso)}`;
}

/** Locale-formatted date in the clock's zone, e.g. { weekday: 'long', day: 'numeric', month: 'long' }. */
export function formatDate(d: Date, options: Intl.DateTimeFormatOptions): string {
  return d.toLocaleDateString('en-GB', { ...options, timeZone: timeZone() });
}

/** Hour and minute of the wall clock. */
export function hourMinute(d: Date): { h: number; mi: number } {
  const p = parts(d);
  return { h: p.h, mi: p.mi };
}

/** Midnight of that day. */
export function startOfDay(d: Date): Date {
  const p = parts(d);
  return instantOf({ y: p.y, m: p.m, d: p.d }, timeZone());
}

/** Midnight of the Monday of the week containing `d`. */
export function startOfWeek(d: Date): Date {
  const p = parts(d);
  return instantOf({ y: p.y, m: p.m, d: p.d - ((p.wd + 6) % 7) }, timeZone());
}

/** Same wall-clock time, `days` calendar days later (DST-safe). */
export function addDays(d: Date, days: number): Date {
  const p = parts(d);
  return instantOf({ y: p.y, m: p.m, d: p.d + days, h: p.h, mi: p.mi, s: p.s }, timeZone());
}

/** That day at hour:minute, as ISO string. */
export function atTime(day: Date, hour: number, minute: number): string {
  const p = parts(day);
  return instantOf({ y: p.y, m: p.m, d: p.d, h: hour, mi: minute }, timeZone()).toISOString();
}

export function greeting(now: Date = clockNow()): string {
  const h = parts(now).h;
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
