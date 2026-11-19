import { describe, expect, it } from 'vitest';
import { baseMime, KV, rowsToShared, sessionToRow, storagePath } from './sharedState';
import type { Session } from './types';

const session = (id: string, startedAt: string): Session => ({
  id,
  patientId: 'P-DEMO',
  startedAt,
  channel: 'app',
  activities: [{ type: 'reading', durationSec: 6, audioKey: `${id}/reading` }],
  result: { status: 'stable', metrics: { jitterPct: 1, pitchHz: 120, rhythmSylPerSec: 4, pauseSec: 0.3 } },
});

describe('rowsToShared', () => {
  it('returns the initial state when the database is empty', () => {
    expect(rowsToShared([], [])).toEqual({
      demoName: null,
      sessions: [],
      syncedDevices: {},
      notes: {},
      scheduledVisits: {},
      nextResult: 'stable',
      rehearsal: false,
    });
  });

  it('maps every kind of key to its field', () => {
    const device = { deviceId: 'VW-1', patientId: 'P-0142', syncedAt: '2026-11-20T09:00:00Z', sessionCount: 3 };
    const state = rowsToShared(
      [
        { key: KV.demoName, value: 'Alex' },
        { key: KV.nextResult, value: 'attention' },
        { key: KV.rehearsal, value: true },
        { key: KV.note('P-0187'), value: 'Call family' },
        { key: KV.visit('P-0187'), value: '2026-11-20T10:00:00Z' },
        { key: KV.device('VW-1'), value: device },
      ],
      [],
    );
    expect(state.demoName).toBe('Alex');
    expect(state.nextResult).toBe('attention');
    expect(state.rehearsal).toBe(true);
    expect(state.notes).toEqual({ 'P-0187': 'Call family' });
    expect(state.scheduledVisits).toEqual({ 'P-0187': '2026-11-20T10:00:00Z' });
    expect(state.syncedDevices).toEqual({ 'VW-1': device });
  });

  it('skips malformed values and unknown keys written by another device', () => {
    const state = rowsToShared(
      [
        { key: KV.nextResult, value: 'boom' },
        { key: KV.rehearsal, value: 'yes' },
        { key: KV.device('X'), value: { deviceId: 'X' } },
        { key: 'something-else', value: 1 },
      ],
      [{ id: 'bad', patient_id: 'P-DEMO', started_at: '2026-11-20T09:00:00Z', data: { id: 'bad' } }],
    );
    expect(state.nextResult).toBe('stable');
    expect(state.rehearsal).toBe(false);
    expect(state.syncedDevices).toEqual({});
    expect(state.sessions).toEqual([]);
  });

  it('round-trips sessions and sorts them by start time', () => {
    const late = session('S-2', '2026-11-20T10:00:00Z');
    const early = session('S-1', '2026-11-19T10:00:00Z');
    const state = rowsToShared([], [sessionToRow(late), sessionToRow(early)]);
    expect(state.sessions).toEqual([early, late]);
  });
});

describe('storagePath', () => {
  it('flattens the audio key into one safe object name', () => {
    expect(storagePath('S-DEMO-abc/sustained_vowel')).toBe('S-DEMO-abc_sustained_vowel');
    expect(storagePath('dev 1/räding')).toBe('dev_1_r_ding');
  });
});

describe('baseMime', () => {
  it('drops codec parameters and falls back to octet-stream', () => {
    expect(baseMime('audio/webm;codecs=opus')).toBe('audio/webm');
    expect(baseMime('audio/mp4')).toBe('audio/mp4');
    expect(baseMime(undefined)).toBe('application/octet-stream');
    expect(baseMime('')).toBe('application/octet-stream');
  });
});
