// Wall-clock parts of an instant in a time zone, and back. `tz` undefined = the browser's own zone.
// Lets the app compute "today", weeks and times in Vilnius time even on a laptop set to another zone (D66).

export interface ZonedParts {
  y: number;
  /** 1–12 */
  m: number;
  d: number;
  h: number;
  mi: number;
  s: number;
  /** 0 = Sunday … 6 = Saturday */
  wd: number;
}

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(tz: string | undefined) {
  const key = tz ?? '';
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      weekday: 'short',
    });
    formatters.set(key, f);
  }
  return f;
}

export function partsIn(date: Date, tz: string | undefined): ZonedParts {
  const out: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};
  for (const p of formatter(tz).formatToParts(date)) out[p.type] = p.value;
  return {
    y: Number(out.year),
    m: Number(out.month),
    d: Number(out.day),
    h: Number(out.hour) % 24,
    mi: Number(out.minute),
    s: Number(out.second),
    wd: WEEKDAYS[out.weekday ?? 'Sun'],
  };
}

/** Milliseconds the zone is ahead of UTC at instant `t`. */
function offsetAt(t: number, tz: string | undefined): number {
  const p = partsIn(new Date(t), tz);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(t / 1000) * 1000;
}

/**
 * The instant at which the zone's wall clock shows these parts. Out-of-range days roll over
 * (d = 32 → next month), which is how callers add days. DST gaps resolve to the later offset.
 */
export function instantOf(p: { y: number; m: number; d: number; h?: number; mi?: number; s?: number }, tz: string | undefined): Date {
  const guess = Date.UTC(p.y, p.m - 1, p.d, p.h ?? 0, p.mi ?? 0, p.s ?? 0);
  const first = offsetAt(guess, tz);
  let t = guess - first;
  const second = offsetAt(t, tz);
  if (second !== first) t = guess - second;
  return new Date(t);
}
