// Records one activity with MediaRecorder and measures simple, real numbers (brief §6.3): duration and
// average / peak loudness (RMS). No analysis beyond that.
import { baseMime } from './mime';
import type { MicHandles } from './useMicrophone';

export interface RecordingResult {
  /** null in demo mode or when MediaRecorder isn't available. */
  blob: Blob | null;
  mimeType: string;
  durationSec: number;
  /** Linear RMS 0–1, null when there was no microphone. */
  rmsAvg: number | null;
  rmsPeak: number | null;
}

export interface RecordingHandle {
  stop: () => Promise<RecordingResult>;
  /** Discards everything (leaving the session). */
  cancel: () => void;
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

export function rms(buf: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return Math.sqrt(sum / buf.length);
}

/** Starts recording now. `mic` null = demo mode (only the duration is real). */
export function startRecording(mic: MicHandles | null, mimeType: string | null): RecordingHandle {
  const started = performance.now();
  const chunks: Blob[] = [];
  let recorder: MediaRecorder | null = null;

  if (mic && mimeType !== null && typeof MediaRecorder !== 'undefined') {
    try {
      recorder = new MediaRecorder(mic.stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      recorder.start();
    } catch {
      recorder = null; // keep the session going without a file
    }
  }

  // Loudness: sample the analyser every 50 ms while recording.
  let sum = 0;
  let count = 0;
  let peak = 0;
  const buf = mic ? new Float32Array(mic.analyser.fftSize) : null;
  const timer = mic
    ? window.setInterval(() => {
        mic.analyser.getFloatTimeDomainData(buf!);
        const v = rms(buf!);
        sum += v;
        count++;
        if (v > peak) peak = v;
      }, 50)
    : 0;

  const finish = (): Omit<RecordingResult, 'blob' | 'mimeType'> => {
    window.clearInterval(timer);
    return {
      durationSec: Math.round((performance.now() - started) / 100) / 10,
      rmsAvg: mic && count ? round3(sum / count) : null,
      rmsPeak: mic && count ? round3(peak) : null,
    };
  };

  return {
    stop: () => {
      const measured = finish();
      const rec = recorder;
      if (!rec || rec.state === 'inactive') return Promise.resolve({ ...measured, blob: null, mimeType: '' });
      return new Promise<RecordingResult>((resolve) => {
        let done = false;
        const resolveWithBlob = () => {
          if (done) return;
          done = true;
          const type = baseMime(rec.mimeType || mimeType || 'audio/webm');
          resolve({ ...measured, blob: chunks.length ? new Blob(chunks, { type }) : null, mimeType: type });
        };
        rec.onstop = resolveWithBlob;
        // Safety net: some browsers occasionally never fire `stop`.
        window.setTimeout(resolveWithBlob, 1500);
        try {
          rec.stop();
        } catch {
          resolveWithBlob();
        }
      });
    },
    cancel: () => {
      finish();
      try {
        if (recorder && recorder.state !== 'inactive') recorder.stop();
      } catch {
        /* ignore */
      }
    },
  };
}
