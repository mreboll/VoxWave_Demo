import { describe, expect, it } from 'vitest';
import { formatInSentence, formatSessionTime, startOfWeek, toDateKey } from './dates';

// TZ = Europe/Vilnius (vitest.config.ts): UTC+2 in November.
const FINAL_MORNING = new Date('2026-11-20T08:00:00Z'); // 10:00 in Vilnius

describe('dates (D19: "today" only when it is today)', () => {
  it('says Today for a session on the same local day', () => {
    expect(formatSessionTime('2026-11-20T06:05:00Z', FINAL_MORNING)).toBe('Today 08:05');
    expect(formatInSentence('2026-11-20T06:05:00Z', FINAL_MORNING)).toBe('today 08:05');
  });

  it('shows the real date otherwise', () => {
    expect(formatSessionTime('2026-11-14T06:20:00Z', FINAL_MORNING)).toBe('14 Nov · 08:20');
    expect(formatInSentence('2026-11-20T06:05:00Z', new Date('2026-11-03T12:00:00Z'))).toBe('20 Nov 08:05');
  });

  it('uses the local day, not the UTC day', () => {
    // 23:30Z on the 19th is already 01:30 on the 20th in Vilnius.
    expect(formatSessionTime('2026-11-19T23:30:00Z', FINAL_MORNING)).toBe('Today 01:30');
  });

  it('adds the year for other years', () => {
    expect(formatSessionTime('2025-11-14T06:20:00Z', FINAL_MORNING)).toBe('14 Nov 2025 · 08:20');
  });

  it('weeks start on Monday', () => {
    expect(toDateKey(startOfWeek(new Date(2026, 10, 20)))).toBe('2026-11-16'); // Fri → Mon
    expect(toDateKey(startOfWeek(new Date(2026, 10, 22)))).toBe('2026-11-16'); // Sun → Mon
  });
});
