// Which days the demo patient "did" a session: a seeded history (streak of 46 up to yesterday, D27) plus the
// real sessions done in this browser. Used by the week strip, the calendar heat-map and the streaks.
import { addDays, startOfDay, startOfWeek, toDateKey } from './dates';
import { createRng } from './prng';
import { DEMO_STREAK_SEED } from './seed';
import type { Session } from './types';

export type DayState = 'done' | 'missed' | 'today' | 'future';

/** Best streak the demo patient had before this one (seeded). */
export const DEMO_BEST_STREAK_SEED = 52;

export function doneDays(sessions: Session[], now: Date): Set<string> {
  const today = startOfDay(now);
  const done = new Set(sessions.map((s) => toDateKey(new Date(s.startedAt))));
  // Seeded streak: the 46 days before today.
  for (let i = 1; i <= DEMO_STREAK_SEED; i++) done.add(toDateKey(addDays(today, -i)));
  // Before the streak: mostly done, a few missed (deterministic). Day 47 is a miss: that's where it started.
  const rng = createRng(4646);
  for (let i = DEMO_STREAK_SEED + 2; i <= 120; i++) if (rng.next() < 0.82) done.add(toDateKey(addDays(today, -i)));
  return done;
}

export function dayState(day: Date, done: Set<string>, now: Date): DayState {
  const d = startOfDay(day).getTime();
  const today = startOfDay(now).getTime();
  if (d > today) return 'future';
  if (done.has(toDateKey(day))) return 'done';
  return d === today ? 'today' : 'missed';
}

/** Monday → Sunday of the current week. */
export function currentWeek(now: Date): Date[] {
  const monday = startOfWeek(now);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** Last `weeks` weeks as rows (oldest first) of Monday → Sunday. */
export function calendarWeeks(now: Date, weeks = 8): Date[][] {
  const monday = startOfWeek(now);
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(monday, -7 * (weeks - 1 - w) + d)),
  );
}

export function currentStreak(done: Set<string>, now: Date): number {
  const today = startOfDay(now);
  // Today not done yet doesn't break the streak; it just isn't counted.
  let i = done.has(toDateKey(today)) ? 0 : 1;
  let n = 0;
  while (done.has(toDateKey(addDays(today, -i)))) {
    n++;
    i++;
  }
  return n;
}

export const bestStreak = (current: number) => Math.max(current, DEMO_BEST_STREAK_SEED);
