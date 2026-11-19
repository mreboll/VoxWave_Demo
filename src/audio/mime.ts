// Recording format: pick the first type this browser's MediaRecorder can produce.
// Chrome/Edge/Firefox → webm/opus; Safari (macOS and iOS) → mp4/aac (no webm recording).

export const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
  'audio/aac',
  'audio/ogg;codecs=opus',
] as const;

export const canRecord = () => typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined';

/**
 * The best supported recording type, '' to let the browser choose (older Safari has MediaRecorder but no
 * isTypeSupported), or null when recording is impossible.
 */
export function pickMimeType(recorder: { isTypeSupported?: (t: string) => boolean } | undefined = globalThis.MediaRecorder): string | null {
  if (!recorder) return null;
  if (typeof recorder.isTypeSupported !== 'function') return '';
  return MIME_CANDIDATES.find((t) => recorder.isTypeSupported!(t)) ?? '';
}

/** The container part of a MIME type ("audio/webm;codecs=opus" → "audio/webm"), for storing with the blob. */
export const baseMime = (t: string) => t.split(';')[0].trim();
