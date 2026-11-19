import { describe, expect, it } from 'vitest';
import { buildPatientSession, type ActivityCapture } from './patientSession';
import { calendarWeeks, currentStreak, currentWeek, dayState, doneDays } from './patientCalendar';
import { addDays, toDateKey } from './dates';
import { DEMO_PATIENT_ID, SAMPLE_AUDIO } from './seed';

const NOW = new Date(2026, 10, 20, 10, 0); // Friday of the final

const capture = (over: Partial<ActivityCapture> = {}): ActivityCapture => ({
  type: 'sustained_vowel',
  durationSec: 5.1,
  rmsAvg: 0.08,
  rmsPeak: 0.21,
  simulated: false,
  ...over,
});

describe('buildPatientSession', () => {
  it('keeps real recordings (IndexedDB key + MIME type) and the measured numbers', () => {
    const s = buildPatientSession('S-1', NOW, [capture({ audioKey: 'S-1/sustained_vowel', mimeType: 'audio/mp4' })], 'stable');
    expect(s.patientId).toBe(DEMO_PATIENT_ID);
    expect(s.channel).toBe('app');
    expect(s.activities[0]).toEqual({ type: 'sustained_vowel', durationSec: 5.1, rmsAvg: 0.08, rmsPeak: 0.21, audioKey: 'S-1/sustained_vowel', mimeType: 'audio/mp4' });
    expect(s.simulated).toBeUndefined();
    expect(s.result.status).toBe('stable');
  });

  it('demo mode: no loudness, sample clip for the clinic, flagged as simulated', () => {
    const s = buildPatientSession('S-2', NOW, [capture({ simulated: true, rmsAvg: null, rmsPeak: null })], 'attention');
    expect(s.activities[0]).toEqual({ type: 'sustained_vowel', durationSec: 5.1, audioSrc: SAMPLE_AUDIO.sustained_vowel, mimeType: 'audio/wav' });
    expect(s.simulated).toBe(true);
    expect(s.result.status).toBe('attention');
  });

  it('a real mic with no file (no MediaRecorder) has no audio rather than a fake clip', () => {
    const s = buildPatientSession('S-3', NOW, [capture()], 'stable');
    expect(s.activities[0].audioKey).toBeUndefined();
    expect(s.activities[0].audioSrc).toBeUndefined();
  });
});

describe('patient calendar', () => {
  it('seeded streak is 46 before today and 47 once today is done', () => {
    expect(currentStreak(doneDays([], NOW), NOW)).toBe(46);
    const today = buildPatientSession('S-4', new Date(2026, 10, 20, 9, 30), [capture()], 'stable');
    expect(currentStreak(doneDays([today], NOW), NOW)).toBe(47);
  });

  it('day 47 before today is the miss where the streak started', () => {
    const done = doneDays([], NOW);
    expect(done.has(toDateKey(addDays(NOW, -46)))).toBe(true);
    expect(done.has(toDateKey(addDays(NOW, -47)))).toBe(false);
  });

  it('marks today, past and future days', () => {
    const done = doneDays([], NOW);
    expect(dayState(NOW, done, NOW)).toBe('today');
    expect(dayState(addDays(NOW, -1), done, NOW)).toBe('done');
    expect(dayState(addDays(NOW, 1), done, NOW)).toBe('future');
  });

  it('weeks run Monday → Sunday; the calendar has 8 rows ending this week', () => {
    const week = currentWeek(NOW);
    expect(week[0].getDay()).toBe(1);
    expect(week[6].getDay()).toBe(0);
    const cal = calendarWeeks(NOW, 8);
    expect(cal).toHaveLength(8);
    expect(toDateKey(cal[7][0])).toBe('2026-11-16');
  });
});
