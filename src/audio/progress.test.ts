import { describe, expect, it } from 'vitest';
import { playbackProgress } from './progress';

describe('playbackProgress', () => {
  it('uses the media duration when the file reports one', () => {
    expect(playbackProgress(2, 8, 5)).toBe(0.25);
  });

  it('falls back to the recorded duration when the file has none (MediaRecorder WebM reports Infinity)', () => {
    expect(playbackProgress(2.5, Infinity, 5)).toBe(0.5);
    expect(playbackProgress(2.5, NaN, 5)).toBe(0.5);
    expect(playbackProgress(2.5, 0, 5)).toBe(0.5);
  });

  it('stays within 0–1', () => {
    expect(playbackProgress(6, Infinity, 5)).toBe(1);
    expect(playbackProgress(-1, 8, 5)).toBe(0);
  });

  it('returns 0 when no duration is known at all', () => {
    expect(playbackProgress(3, Infinity, undefined)).toBe(0);
    expect(playbackProgress(3, Infinity, 0)).toBe(0);
  });
});
