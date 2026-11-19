import { create } from 'zustand';
import { now } from '../../data/clock';

/** Transient clinic UI state (not persisted). */
interface ClinicUi {
  syncOpen: boolean;
  /**
   * 'pick' = the clinician chooses the VOXWAVE drive; 'sample' = import public/sample-device/ straight away
   * with the same animation (demo-control fallback, brief §8.3 step 5).
   */
  syncSource: 'pick' | 'sample';
  openSync: (source?: 'pick' | 'sample') => void;
  closeSync: () => void;
  /** Bumped to replay the alert banner entrance (demo control, milestone 7). */
  alertReplay: number;
  replayAlert: () => void;
  /** Patient whose card jumps to the top with a glow (a session just arrived / a device just synced). */
  highlightId: string | null;
  /** When it was highlighted (ms, app clock): the "Just now" badge expires after 10 minutes. */
  highlightAt: number;
  highlight: (id: string) => void;
  /** Session announced by the patient window: the Live check-in shows it, whatever else is newer (D77). */
  liveSessionId: string | null;
  showLive: (sessionId: string) => void;
}

export const useClinicUi = create<ClinicUi>((set) => ({
  syncOpen: false,
  syncSource: 'pick',
  openSync: (source = 'pick') => set({ syncOpen: true, syncSource: source }),
  closeSync: () => set({ syncOpen: false }),
  alertReplay: 0,
  replayAlert: () => set((s) => ({ alertReplay: s.alertReplay + 1 })),
  highlightId: null,
  highlightAt: 0,
  highlight: (id) => set({ highlightId: id, highlightAt: now().getTime() }),
  liveSessionId: null,
  showLive: (sessionId) => set({ liveSessionId: sessionId }),
}));
