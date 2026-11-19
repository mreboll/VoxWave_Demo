import { describe, expect, it } from 'vitest';
import { baseMime, pickMimeType } from './mime';

const recorderSupporting = (...types: string[]) => ({ isTypeSupported: (t: string) => types.includes(t) });

describe('pickMimeType', () => {
  it('prefers webm/opus where supported (Chrome, Edge, Android)', () => {
    expect(pickMimeType(recorderSupporting('audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'))).toBe('audio/webm;codecs=opus');
  });

  it('falls back to mp4/aac on Safari (iOS can’t record webm)', () => {
    expect(pickMimeType(recorderSupporting('audio/mp4;codecs=mp4a.40.2', 'audio/mp4'))).toBe('audio/mp4;codecs=mp4a.40.2');
    expect(pickMimeType(recorderSupporting('audio/mp4'))).toBe('audio/mp4');
  });

  it('lets the browser choose when isTypeSupported is missing or nothing matches', () => {
    expect(pickMimeType({})).toBe('');
    expect(pickMimeType(recorderSupporting('video/x-made-up'))).toBe('');
  });

  it('returns null without MediaRecorder', () => {
    expect(pickMimeType(undefined)).toBeNull();
  });

  it('stores the container type without codecs', () => {
    expect(baseMime('audio/webm;codecs=opus')).toBe('audio/webm');
    expect(baseMime('audio/mp4')).toBe('audio/mp4');
  });
});
