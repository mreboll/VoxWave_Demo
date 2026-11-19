import { readFileSync } from 'node:fs';
import { afterEach, beforeAll, afterAll, describe, expect, it } from 'vitest';
import { applyRehearsal, isRehearsal, now } from './clock';
import { formatInSentence, formatSessionTime, toDateKey } from './dates';
import { instantOf, partsIn } from './tz';
import { derive } from './derive';
import { parseDevice, parseSessions } from './deviceImport';
import { DEVICE_PATIENT_ID, generateSeed, TREND_WEEKS } from './seed';

// Rehearse on a laptop that is NOT on Vilnius time: the clock must still speak Vilnius (D66).
const originalTz = process.env.TZ;
beforeAll(() => {
  process.env.TZ = 'Europe/Madrid'; // UTC+1 in November, one hour behind Vilnius
});
afterAll(() => {
  process.env.TZ = originalTz;
});
afterEach(() => applyRehearsal(false));

describe('tz helpers', () => {
  it('read and build wall-clock times in a given zone', () => {
    expect(partsIn(new Date('2026-11-20T06:05:00Z'), 'Europe/Vilnius')).toMatchObject({ y: 2026, m: 11, d: 20, h: 8, mi: 5, wd: 5 });
    expect(partsIn(new Date('2026-11-20T06:05:00Z'), 'Europe/Madrid')).toMatchObject({ h: 7, mi: 5 });
    expect(instantOf({ y: 2026, m: 11, d: 20, h: 8, mi: 5 }, 'Europe/Vilnius').toISOString()).toBe('2026-11-20T06:05:00.000Z');
  });

  it('day overflow rolls into the next month and DST changes are respected', () => {
    expect(instantOf({ y: 2026, m: 11, d: 31, h: 12 }, 'Europe/Vilnius').toISOString()).toBe('2026-12-01T10:00:00.000Z');
    // Last Sunday of March 2026: Vilnius goes from UTC+2 to UTC+3.
    expect(instantOf({ y: 2026, m: 3, d: 28, h: 12 }, 'Europe/Vilnius').toISOString()).toBe('2026-03-28T10:00:00.000Z');
    expect(instantOf({ y: 2026, m: 3, d: 30, h: 12 }, 'Europe/Vilnius').toISOString()).toBe('2026-03-30T09:00:00.000Z');
  });
});

describe('rehearsal clock', () => {
  it('is 20 Nov 2026 at the current Vilnius time of day', () => {
    applyRehearsal(true); // offset from the real current time
    const real = partsIn(new Date(), 'Europe/Vilnius');
    const shifted = partsIn(now(), 'Europe/Vilnius');
    expect(isRehearsal()).toBe(true);
    expect(toDateKey(now())).toBe('2026-11-20');
    expect(shifted.h * 60 + shifted.mi).toBeCloseTo(real.h * 60 + real.mi, -1); // same wall time (±1 min)
  });

  it('the USB sync line reads "last one today 08:05" (Vilnius time, even on a Madrid laptop)', () => {
    applyRehearsal(true); // offset from the real time, like the app: valid any day
    expect(formatInSentence('2026-11-20T06:05:00Z')).toBe('today 08:05');
    expect(formatSessionTime('2026-11-14T06:20:00Z')).toBe('14 Nov · 08:20');
  });

  it('Robert’s trend gains the week of 16 Nov with the device data, which stays untouched', () => {
    applyRehearsal(true); // offset from the real time, like the app: valid any day
    const raw = readFileSync('public/sample-device/VOXWAVE/sessions.json', 'utf8');
    const device = parseDevice(JSON.parse(readFileSync('public/sample-device/VOXWAVE/device.json', 'utf8')));
    const { sessions } = parseSessions(JSON.parse(raw), device);
    const syncedAt = now().toISOString();
    const robert = derive(
      generateSeed(now()),
      { demoName: null, sessions, syncedDevices: { 'VW-DEV-0003': { deviceId: 'VW-DEV-0003', patientId: DEVICE_PATIENT_ID, syncedAt, sessionCount: 7 } } },
      now(),
    ).patients.find((p) => p.id === DEVICE_PATIENT_ID)!;
    expect(robert.trend).toHaveLength(TREND_WEEKS);
    expect(robert.trend.at(-1)!.week).toBe('2026-11-16');
    expect(robert.lastSessionAt).toBe('2026-11-20T06:05:00.000Z'); // the device's own timestamp, not shifted
    expect(sessions.map((s) => s.startedAt)).toEqual(
      (JSON.parse(raw).sessions as Array<{ startedAt: string }>).map((s) => new Date(s.startedAt).toISOString()),
    );
  });

  it('turning it off restores the real clock', () => {
    applyRehearsal(true); // offset from the real time, like the app: valid any day
    applyRehearsal(false);
    expect(isRehearsal()).toBe(false);
    expect(Math.abs(now().getTime() - Date.now())).toBeLessThan(50);
  });
});
