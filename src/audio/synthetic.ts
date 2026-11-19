// Synthetic "voice" for demo mode (no microphone): fills the same buffers the analyser would, so the live
// waveform looks alive and the session still completes (brief §6.3).

export type SyntheticMode = 'sustain' | 'speech' | 'idle';

export interface FrameSource {
  /** Fills `buf` with time-domain samples in [-1, 1]. */
  read: (buf: Float32Array) => void;
}

export function createSyntheticSource(getMode: () => SyntheticMode): FrameSource {
  const start = performance.now();
  return {
    read: (buf) => {
      const t = (performance.now() - start) / 1000;
      const mode = getMode();
      let env: number;
      if (mode === 'idle') env = 0.015;
      else if (mode === 'sustain') env = 0.32 + 0.04 * Math.sin(t * 2.1) + 0.02 * Math.sin(t * 7.3);
      else {
        // Syllables ~4.5/s with a longer pause every ~2 s.
        const syll = Math.max(0, Math.sin(t * Math.PI * 4.5)) ** 0.7;
        const phrase = (t % 2.2) < 1.8 ? 1 : 0.08;
        env = 0.05 + 0.32 * syll * phrase;
      }
      const f0 = 128 + 6 * Math.sin(t * 0.8);
      for (let i = 0; i < buf.length; i++) {
        // ~2048 samples shown as one "window" of a few periods, like an oscilloscope.
        const x = i / buf.length;
        const ph = 2 * Math.PI * (x * f0 * 0.06 + t * 3);
        buf[i] = env * (Math.sin(ph) + 0.45 * Math.sin(2 * ph + 0.6) + 0.2 * Math.sin(3 * ph + 1.3)) * 0.7;
      }
    },
  };
}

/** A FrameSource backed by a real analyser. */
export const analyserSource = (analyser: AnalyserNode): FrameSource => ({
  read: (buf) => analyser.getFloatTimeDomainData(buf as Float32Array<ArrayBuffer>),
});
