import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  DeviceImportError,
  filesFromDirectoryHandle,
  filesFromFileList,
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
    expect(result.device).toMatchObject({ deviceId: 'VW-DEV-0003', patientId: 'P-0142', patientName: 'Javier de Paz' });
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
  it('orders two unsynchronised recordings with the same receipt by their observed capture time', () => {
    const device = parseDevice(json('device.json'));
    const sample = (json('sessions.json').sessions as Record<string, unknown>[])[0];
    const imported = {
      ...sample, captureClockSynced: false, receivedAt: '2026-11-20T10:00:00.000Z',
    };
    const { sessions } = parseSessions({
      format: 'voxwave-sessions/1',
      sessions: [
        { ...imported, id: 'new', startedAt: '1970-01-01T00:01:23Z' },
        { ...imported, id: 'old', startedAt: '1970-01-01T00:00:08Z' },
      ],
    }, device);
    expect(sessions.map((s) => s.id)).toEqual(['old', 'new']);
    expect(mergeSyncedSessions(sessions, sessions).map((s) => s.id)).toEqual(['old', 'new']);
  });

  it('keeps the hardware recording and completed transcript when a stale export is imported again', async () => {
    const take = {
      id: 'take-1', startedAt: '1970-01-01T00:00:13Z', captureClockSynced: false,
      receivedAt: '2026-11-20T08:05:04Z',
      activities: [{ type: 'conversation', audio: 'audio/take-1.wav', durationSec: 8 }],
      result: { status: 'stable', metricsSource: 'demo', metrics: { jitterPct: 1, pitchHz: 120, rhythmSylPerSec: 4, pauseSec: 0.3 } },
      transcription: { status: 'pending' },
    };
    const manifest = (entry: typeof take) => blob(JSON.stringify({ format: 'voxwave-sessions/1', sessions: [entry] }));
    const files = driveFiles({ 'VOXWAVE/audio/take-1.wav': 'RIFF hardware bytes' });
    files.set('VOXWAVE/sessions.json', manifest(take));
    const pending = await readDeviceExport(files);
    expect(pending.sessions[0]).toMatchObject({
      captureClockSynced: false, startedAt: '1970-01-01T00:00:13.000Z', receivedAt: '2026-11-20T08:05:04.000Z',
      activities: [{ audioKey: 'take-1/conversation' }], transcription: { status: 'pending' }, result: { metricsSource: 'demo' },
    });
    expect(pending.sessions[0]).not.toHaveProperty('simulated');
    expect(await pending.audio[0].blob.text()).toBe('RIFF hardware bytes');
    for (const transcription of [{ status: 'failed' }, { status: 'ready', text: "It's ten past nine." }]) {
      files.set('VOXWAVE/sessions.json', manifest({ ...take, transcription }));
      const newer = await readDeviceExport(files);
      expect(mergeSyncedSessions(newer.sessions, pending.sessions).map((s) => s.transcription)).toEqual([transcription]);
    }
  });

  it('imports the same export from a directory handle or an input FileList', async () => {
    const sampleFile = (name: string, contents: string) => {
      const file = new File([contents], name);
      Object.defineProperty(file, 'webkitRelativePath', { value: `VOXWAVE/${name}` });
      return file;
    };
    const files = ['device.json', 'sessions.json'].map((name) => sampleFile(name, sampleText(name)));
    const handle = {
      async *values() {
        for (const file of files) yield { name: file.name, kind: 'file', getFile: async () => file };
      },
    } as unknown as FileSystemDirectoryHandle;
    const fromHandle = await readDeviceExport(await filesFromDirectoryHandle(handle));
    const fromInput = await readDeviceExport(filesFromFileList(files));
    expect(fromHandle.sessions).toHaveLength(7);
    expect(fromHandle).toEqual(fromInput);
  });

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
