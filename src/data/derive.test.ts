import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { derive, type LocalState } from './derive';
import { parseDevice, parseSessions } from './deviceImport';
import { DEMO_PATIENT_ID, DEMO_STREAK_SEED, DEVICE_PATIENT_ID, generateSeed, TREND_WEEKS } from './seed';
import { scriptedResult } from './scripted';
import type { Session } from './types';

const FINAL = new Date(2026, 10, 20, 10, 30); // demo time on the day of the final
const empty: LocalState = { demoName: null, sessions: [], syncedDevices: {} };

const demoSession = (startedAt: string, status: 'stable' | 'attention' = 'stable'): Session => ({
  id: `S-DEMO-${startedAt}`,
  patientId: DEMO_PATIENT_ID,
  startedAt,
  channel: 'app',
  activities: [{ type: 'sustained_vowel', durationSec: 5 }],
  result: { status, metrics: scriptedResult(status, undefined, 1) },
});

describe('derive', () => {
  it('without local state, is the seed (no demo patient)', () => {
    const seed = generateSeed(FINAL);
    const d = derive(seed, empty, FINAL);
    expect(d.patients).toHaveLength(24);
    expect(d.sessions).toHaveLength(seed.sessions.length);
  });

  it('adds the demo patient; streak goes 46 → 47 after today\'s session', () => {
    const seed = generateSeed(FINAL);
    const before = derive(seed, { ...empty, demoName: 'Alex' }, FINAL).patients.find((p) => p.id === DEMO_PATIENT_ID)!;
    expect(before.streak).toBe(DEMO_STREAK_SEED);
    expect(before.status).toBe('new');
    expect(before.age).toBeNull();

    const s = demoSession(new Date(2026, 10, 20, 10, 0).toISOString());
    const after = derive(seed, { ...empty, demoName: 'Alex', sessions: [s] }, FINAL);
    expect(after.patients).toHaveLength(24); // demo patient replaces a filler patient
    const demo = after.patients.find((p) => p.id === DEMO_PATIENT_ID)!;
    expect(demo.streak).toBe(DEMO_STREAK_SEED + 1);
    expect(demo.lastSessionAt).toBe(s.startedAt);
    expect(demo.trend).toHaveLength(4); // 3 seeded weeks + this week
    expect(after.sessions.some((x) => x.id === s.id)).toBe(true);
  });

  it('an "attention" session puts the demo patient on watch', () => {
    const s = demoSession(new Date(2026, 10, 20, 10, 0).toISOString(), 'attention');
    const d = derive(generateSeed(FINAL), { ...empty, demoName: 'Alex', sessions: [s] }, FINAL);
    expect(d.patients.find((p) => p.id === DEMO_PATIENT_ID)!.status).toBe('watch');
  });

  it('a device sync extends Robert\'s trend to 14 weeks and updates his last session', () => {
    const device = parseDevice(JSON.parse(readFileSync('public/sample-device/VOXWAVE/device.json', 'utf8')));
    const { sessions } = parseSessions(JSON.parse(readFileSync('public/sample-device/VOXWAVE/sessions.json', 'utf8')), device);
    const syncedAt = new Date(2026, 10, 20, 10, 15).toISOString();
    const local: LocalState = {
      ...empty,
      sessions,
      syncedDevices: { 'VW-DEV-0003': { deviceId: 'VW-DEV-0003', patientId: DEVICE_PATIENT_ID, syncedAt, sessionCount: 7 } },
    };
    const seed = generateSeed(FINAL);
    const before = seed.patients.find((p) => p.id === DEVICE_PATIENT_ID)!;
    const after = derive(seed, local, FINAL).patients.find((p) => p.id === DEVICE_PATIENT_ID)!;
    expect(before.trend).toHaveLength(TREND_WEEKS - 1);
    expect(after.trend).toHaveLength(TREND_WEEKS);
    expect(after.trend.at(-1)!.week).toBe('2026-11-16');
    expect(after.trend.at(-1)!.score).toBeGreaterThanOrEqual(after.baseline.low);
    expect(after.trend.at(-1)!.score).toBeLessThanOrEqual(after.baseline.high);
    expect(after.lastSessionAt).toBe('2026-11-20T06:05:00.000Z');
    expect(after.lastSyncAt).toBe(syncedAt);
    expect(after.latest.pitchHz).toBe(128);
  });

  it('re-syncing the same device does not duplicate sessions', () => {
    const s = demoSession(new Date(2026, 10, 20, 9, 0).toISOString());
    const d = derive(generateSeed(FINAL), { ...empty, demoName: 'Alex', sessions: [s, { ...s }] }, FINAL);
    expect(d.sessions.filter((x) => x.id === s.id)).toHaveLength(1);
  });

  it('places a received recording first even when the device clock was reset and no device KV was published', () => {
    const recordedAt = '1970-01-01T00:02:11Z';
    const receivedAt = FINAL.toISOString();
    const take: Session = {
      ...demoSession(recordedAt), patientId: DEVICE_PATIENT_ID, channel: 'device',
      receivedAt, captureClockSynced: false, transcription: { status: 'pending' },
    };
    const data = derive(generateSeed(FINAL), { ...empty, sessions: [take] }, FINAL);
    expect(data.sessions.filter((s) => s.patientId === DEVICE_PATIENT_ID).at(-1)).toEqual(take);
    expect(data.patients.find((p) => p.id === DEVICE_PATIENT_ID)).toMatchObject({
      lastSessionAt: receivedAt, lastSyncAt: receivedAt, latest: take.result.metrics,
    });
  });
});

describe('scriptedResult', () => {
  const baseline = { jitterPct: 1.3, pitchHz: 131, rhythmSylPerSec: 4.6, pauseSec: 0.29 };
  it('stable stays close to baseline', () => {
    const m = scriptedResult('stable', baseline, 7);
    expect(Math.abs(m.pitchHz - baseline.pitchHz)).toBeLessThan(6);
    expect(Math.abs(m.pauseSec - baseline.pauseSec)).toBeLessThan(0.05);
  });
  it('attention lengthens pauses and slows rhythm', () => {
    const m = scriptedResult('attention', baseline, 7);
    expect(m.pauseSec).toBeGreaterThan(baseline.pauseSec * 1.2);
    expect(m.rhythmSylPerSec).toBeLessThan(baseline.rhythmSylPerSec);
  });
});
