import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  DeviceImportError,
  locateExportRoot,
  mergeSyncedSessions,
  parseDevice,
  parseSessions,
  readDeviceExport,
  type DeviceFiles,
} from './deviceImport';

const SAMPLE = 'public/sample-device/VOXWAVE/';
const sampleText = (name: string) => readFileSync(SAMPLE + name, 'utf8');
const json = (name: string) => JSON.parse(sampleText(name)) as Record<string, unknown>;
const blob = (text: string) => new Blob([text], { type: 'application/json' });

/** The sample as a picked drive: E:\VOXWAVE\... (plus noise the OS puts on drives). */
function driveFiles(extra: Record<string, string> = {}): DeviceFiles {
  const files: DeviceFiles = new Map([
    ['VOXWAVE/device.json', blob(sampleText('device.json'))],
    ['VOXWAVE/sessions.json', blob(sampleText('sessions.json'))],
    ['System Volume Information/IndexerVolumeGuid', blob('x')],
  ]);
  for (const [p, t] of Object.entries(extra)) files.set(p, new Blob([t], { type: 'audio/wav' }));
  return files;
}

describe('device import — bundled sample (final: 14–20 Nov 2026)', () => {
  it('reads 7 sessions, oldest → newest, the last on the 20th at 06:05Z', async () => {
    const result = await readDeviceExport(driveFiles());
    expect(result.device).toMatchObject({ deviceId: 'VW-DEV-0003', patientId: 'P-0142', patientName: 'Robert Hayes' });
    expect(result.device.exportedAt).toBe('2026-11-20T07:30:00Z');
    expect(result.sessions).toHaveLength(7);
    expect(result.sessions.map((s) => s.startedAt.slice(0, 10))).toEqual([
      '2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20',
    ]);
    expect(result.sessions.at(-1)!.startedAt).toBe('2026-11-20T06:05:00.000Z');
    expect(result.sessions.every((s) => s.channel === 'device' && s.activities.length === 3)).toBe(true);
  });

  it('tolerates missing audio (warns, no audioKey) and links audio that exists', async () => {
    const result = await readDeviceExport(driveFiles({ 'VOXWAVE/audio/2026-11-20_aah.wav': 'RIFF' }));
    expect(result.audio).toHaveLength(1);
    expect(result.audio[0].key).toBe('D-2026-11-20/sustained_vowel');
    const last = result.sessions.at(-1)!;
    expect(last.activities[0].audioKey).toBe('D-2026-11-20/sustained_vowel');
    expect(last.activities[1].audioKey).toBeUndefined();
    expect(result.warnings.filter((w) => w.includes('not found'))).toHaveLength(20);
  });

  it('finds the export whether the drive or the VOXWAVE folder was picked, case-insensitively', () => {
    const fromFolder: DeviceFiles = new Map([['VOXWAVE/device.json', blob('{}')], ['VOXWAVE/sessions.json', blob('{}')]]);
    expect([...locateExportRoot(fromFolder).keys()]).toEqual(['device.json', 'sessions.json']);
    const lower: DeviceFiles = new Map([['voxwave/Device.JSON', blob('{}')]]);
    expect([...locateExportRoot(lower).keys()]).toEqual(['Device.JSON']);
    expect(() => locateExportRoot(new Map([['photos/a.jpg', blob('')]]))).toThrow(DeviceImportError);
  });
});

describe('device import — validation', () => {
  const device = parseDevice(json('device.json'));

  it('rejects unknown formats and missing ids', () => {
    expect(() => parseDevice({ ...json('device.json'), format: 'voxwave-device/9' })).toThrow(/Unsupported device format/);
    expect(() => parseDevice({ format: 'voxwave-device/1' })).toThrow(/deviceId/);
    expect(() => parseSessions({ format: 'nope', sessions: [] }, device)).toThrow(/Unsupported sessions format/);
  });

  it('rejects sessions of another patient', () => {
    expect(() => parseSessions({ ...json('sessions.json'), patientId: 'P-9999' }, device)).toThrow(/P-9999/);
  });

  it('ignores unknown fields, skips invalid sessions and activities without failing', () => {
    const good = (json('sessions.json').sessions as unknown[])[0] as Record<string, unknown>;
    const result = parseSessions(
      {
        format: 'voxwave-sessions/1',
        patientId: 'P-0142',
        futureField: { anything: true },
        sessions: [
          { ...good, extra: 42 },
          { ...good, id: 'D-no-metrics', result: { status: 'stable' } },
          { id: 'D-no-date' },
          { ...good }, // duplicate id
          { ...good, id: 'D-odd-activity', activities: [{ type: 'singing', durationSec: 3 }] },
        ],
      },
      device,
    );
    expect(result.sessions.map((s) => s.id)).toEqual(['D-2026-11-14', 'D-odd-activity']);
    expect(result.sessions[0]).not.toHaveProperty('extra');
    expect(result.sessions[1].activities).toHaveLength(0);
    expect(result.warnings.some((w) => w.includes('D-no-metrics'))).toBe(true);
    expect(result.warnings.some((w) => w.includes('duplicate'))).toBe(true);
  });

  it('treats deviceAlertShown as attention when status is missing', () => {
    const good = (json('sessions.json').sessions as unknown[])[0] as Record<string, unknown>;
    const metrics = (good.result as Record<string, unknown>).metrics;
    const result = parseSessions(
      { format: 'voxwave-sessions/1', sessions: [{ ...good, result: { deviceAlertShown: true, metrics } }] },
      device,
    );
    expect(result.sessions[0].result.status).toBe('attention');
  });
});

describe('re-syncing a device', () => {
  it('replaces sessions by id and keeps audio from an earlier sync when the new read has none', async () => {
    const withAudio = await readDeviceExport(driveFiles({ 'VOXWAVE/audio/2026-11-20_aah.wav': 'RIFF' }));
    const withoutAudio = await readDeviceExport(driveFiles());
    const first = mergeSyncedSessions([], withAudio.sessions);
    const second = mergeSyncedSessions(first, withoutAudio.sessions);
    expect(second).toHaveLength(7);
    const last = second.find((s) => s.id === 'D-2026-11-20')!;
    expect(last.activities[0].audioKey).toBe('D-2026-11-20/sustained_vowel');
    expect(last.activities[1].audioKey).toBeUndefined();
  });

  it('the bundled sample drive references 21 audio files that exist', async () => {
    const { existsSync } = await import('node:fs');
    const refs = (json('sessions.json').sessions as Array<{ activities: Array<{ audio: string }> }>).flatMap((s) => s.activities.map((a) => a.audio));
    expect(refs).toHaveLength(21);
    expect(refs.filter((r) => !existsSync(SAMPLE + r))).toEqual([]);
  });
});
