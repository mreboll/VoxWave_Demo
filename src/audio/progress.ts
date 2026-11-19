// Playback progress of a clip (0–1). Recordings made with MediaRecorder (WebM on Chrome/Android) carry no
// duration in their header, so the browser reports `duration = Infinity` until it has read almost the whole
// file; dividing by it kept the replay wave still until the very end. The duration measured while recording
// (Activity.durationSec) is used instead whenever the file doesn't give a usable one.

const usable = (d: number | undefined): d is number => typeof d === 'number' && Number.isFinite(d) && d > 0;

export function playbackProgress(currentTime: number, mediaDuration: number, recordedDuration: number | undefined): number {
  const duration = usable(mediaDuration) ? mediaDuration : usable(recordedDuration) ? recordedDuration : null;
  if (duration === null) return 0;
  return Math.min(1, Math.max(0, currentTime / duration));
}
