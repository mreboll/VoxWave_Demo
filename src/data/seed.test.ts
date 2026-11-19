import { describe, expect, it } from 'vitest';
import { ALERT_PATIENT_ID, DEVICE_PATIENT_ID, generateSeed, TREND_WEEKS, VIDEO_BIOMARKERS } from './seed';
import { isOutsideBand, weeksOutsideBand } from './scripted';
import { formatSessionTime, startOfWeek, toDateKey } from './dates';

const NOON = new Date(2026, 10, 20, 12, 0); // final day, 12:00 local
const EARLY = new Date(2026, 10, 20, 7, 0); // before Margaret's 09:12 session

const byId = (now: Date, id: string) => generateSeed(now).patients.find((p) => p.id === id)!;

describe('seed', () => {
  it('is deterministic for the same moment', () => {
    expect(JSON.stringify(generateSeed(NOON))).toBe(JSON.stringify(generateSeed(new Date(NOON))));
  });

  it('has 24 patients with unique ids, 8 of them detailed', () => {
    const { patients } = generateSeed(NOON);
    expect(patients).toHaveLength(24);
    expect(new Set(patients.map((p) => p.id)).size).toBe(24);
    expect(patients.filter((p) => !p.minor)).toHaveLength(8);
  });

  it('P-0187 shows the video numbers and exactly the last 2 weeks outside the band', () => {
    const p = byId(NOON, ALERT_PATIENT_ID);
    expect(p.status).toBe('alert');
    expect(p.latest).toEqual(VIDEO_BIOMARKERS);
    expect(p.trend).toHaveLength(TREND_WEEKS);
    expect(weeksOutsideBand(p)).toBe(2);
    expect(p.trend.slice(0, -2).every((pt) => !isOutsideBand(pt, p))).toBe(true);
  });

  it('keeps every other main patient inside their band', () => {
    for (const id of ['P-0156', 'P-0203', 'P-0219', 'P-0174', 'P-0231', 'P-0198', DEVICE_PATIENT_ID]) {
      const p = byId(NOON, id);
      expect(p.trend.every((pt) => !isOutsideBand(pt, p)), id).toBe(true);
    }
  });

  it('P-0231 is building a 3-week baseline; P-0142 is missing the week the device will bring', () => {
    expect(byId(NOON, 'P-0231').trend).toHaveLength(3);
    expect(byId(NOON, 'P-0231').baselineBuilding).toBe(true);
    expect(byId(NOON, DEVICE_PATIENT_ID).trend).toHaveLength(TREND_WEEKS - 1);
    expect(byId(NOON, DEVICE_PATIENT_ID).deviceId).toBe('VW-DEV-0003');
  });

  it('Margaret\'s last session reads "Today 09:12" at noon, and is never in the future', () => {
    expect(formatSessionTime(byId(NOON, ALERT_PATIENT_ID).lastSessionAt!, NOON)).toBe('Today 09:12');
    for (const now of [NOON, EARLY]) {
      for (const s of generateSeed(now).sessions) expect(new Date(s.startedAt).getTime()).toBeLessThanOrEqual(now.getTime());
      for (const p of generateSeed(now).patients) {
        expect(new Date(p.lastSessionAt!).getTime(), p.id).toBeLessThanOrEqual(now.getTime());
      }
    }
    expect(formatSessionTime(byId(EARLY, ALERT_PATIENT_ID).lastSessionAt!, EARLY)).toBe('19 Nov · 09:12');
  });

  it('P-0187: a session is "outside baseline" exactly when its week is outside the band (list = chart)', () => {
    for (const now of [NOON, new Date(2026, 10, 3, 18, 0) /* a Tuesday, like the review */]) {
      const seed = generateSeed(now);
      const p = seed.patients.find((x) => x.id === ALERT_PATIENT_ID)!;
      const outsideWeeks = new Set(p.trend.filter((pt) => isOutsideBand(pt, p)).map((pt) => pt.week));
      expect(outsideWeeks.size).toBe(2);
      const sessions = seed.sessions.filter((s) => s.patientId === ALERT_PATIENT_ID);
      for (const s of sessions) {
        const week = toDateKey(startOfWeek(new Date(s.startedAt)));
        expect(s.result.status, `${s.startedAt}`).toBe(outsideWeeks.has(week) ? 'attention' : 'stable');
      }
      // The list always shows both: drift sessions and earlier ones inside the band.
      expect(sessions.some((s) => s.result.status === 'attention')).toBe(true);
      expect(sessions.some((s) => s.result.status === 'stable')).toBe(true);
    }
  });

  it('P-0187 has 2 sessions with background noise (report quality flag)', () => {
    const noisy = generateSeed(NOON).sessions.filter((s) => s.patientId === ALERT_PATIENT_ID && s.quality?.noise !== 'low');
    expect(noisy).toHaveLength(2);
  });
});
