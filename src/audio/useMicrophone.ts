import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type MicStatus = 'idle' | 'requesting' | 'ready' | 'denied' | 'unavailable' | 'error' | 'lost';

export interface MicHandles {
  stream: MediaStream;
  context: AudioContext;
  analyser: AnalyserNode;
}

type AudioContextCtor = typeof AudioContext;

/**
 * Microphone + analyser for the live waveform (brief §6.3). Audio never leaves the device.
 *
 * `request()` must be called from a tap/click: iOS Safari only lets an AudioContext start inside a user
 * gesture, so the context is created and resumed *before* awaiting the permission prompt.
 */
export function useMicrophone() {
  const [status, setStatus] = useState<MicStatus>('idle');
  const handles = useRef<MicHandles | null>(null);

  const release = useCallback(() => {
    const h = handles.current;
    handles.current = null;
    h?.stream.getTracks().forEach((t) => {
      t.onended = null;
      t.stop();
    });
    void h?.context.close().catch(() => undefined);
  }, []);

  const request = useCallback(async (): Promise<MicStatus> => {
    if (handles.current) return 'ready';
    const Ctor: AudioContextCtor | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
    if (!navigator.mediaDevices?.getUserMedia || !Ctor) {
      setStatus('unavailable');
      return 'unavailable';
    }
    const context = new Ctor();
    void context.resume().catch(() => undefined); // inside the gesture
    setStatus('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // AGC off so loudness (RMS) reflects the voice, not the browser's gain control.
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
      });
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.6;
      context.createMediaStreamSource(stream).connect(analyser);
      if (context.state === 'suspended') await context.resume().catch(() => undefined);
      handles.current = { stream, context, analyser };
      // Unplugged headset / revoked permission mid-session: the session falls back to demo mode.
      stream.getAudioTracks().forEach((t) => (t.onended = () => setStatus('lost')));
      setStatus('ready');
      return 'ready';
    } catch (err) {
      void context.close().catch(() => undefined);
      const name = err instanceof DOMException ? err.name : '';
      const next: MicStatus =
        name === 'NotAllowedError' || name === 'SecurityError'
          ? 'denied'
          : name === 'NotFoundError' || name === 'OverconstrainedError'
            ? 'unavailable'
            : 'error';
      setStatus(next);
      return next;
    }
  }, []);

  useEffect(() => release, [release]);

  // iOS Safari suspends ("interrupted") the AudioContext on screen lock, a call or an app switch, and the
  // waveform would stay frozen on return. Resume it whenever the page is visible again (D74).
  useEffect(() => {
    const resume = () => {
      const ctx = handles.current?.context;
      if (ctx && ctx.state !== 'running' && ctx.state !== 'closed' && document.visibilityState === 'visible') {
        void ctx.resume().catch(() => undefined);
      }
    };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('pageshow', resume);
    window.addEventListener('focus', resume);
    return () => {
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('pageshow', resume);
      window.removeEventListener('focus', resume);
    };
  }, []);

  const get = useCallback(() => handles.current, []);
  // Stable identity until the status changes, so effects depending on `mic` don't re-run every render.
  return useMemo(() => ({ status, request, release, get }), [status, request, release, get]);
}
