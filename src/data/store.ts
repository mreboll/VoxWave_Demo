// App state (brief §9.3): Zustand persisted to localStorage. Only what happens in this browser is stored
// (demo patient, its sessions, synced device sessions, notes, demo settings); the seed is rebuilt from
// today's date on every load (derive.ts). Audio blobs go to IndexedDB (audio/storage.ts).
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { clearAudio, saveAudioMany } from '../audio/storage';
import { postDemoMessage, subscribeDemoMessages } from './broadcast';
import { derive, type LocalState, type SyncedDevice } from './derive';
import { mergeSyncedSessions, type DeviceImport } from './deviceImport';
import type { ResultMode } from './scripted';
import { buildSeed, DEMO_PATIENT_ID } from './seed';
import type { DemoMessage, Session } from './types';
import { now as clockNow } from './clock';

export const STORE_KEY = 'voxwave-demo-state';

interface PersistedState extends LocalState {
  /** Clinician's editable notes per patient (the seeded notes stay in the seed). */
  notes: Record<string, string>;
  /** Visits scheduled from the clinic (fake confirmation), ISO time of scheduling. */
  scheduledVisits: Record<string, string>;
  /** What the patient's next session returns (demo control). One-shot: resets to stable after a session. */
  nextResult: ResultMode;
  clinicSignedIn: boolean;
  /** Demo panel override; 'system' follows prefers-reduced-motion. */
  motion: 'system' | 'reduce';
  /** Rehearsal clock: "today" is 20 Nov 2026 in Vilnius time (clock.ts). Applied on load; toggling reloads. */
  rehearsal: boolean;
}

interface Actions {
  /** Creates the demo patient P-DEMO (welcome + consent). */
  startAsPatient: (name: string) => void;
  /** Appends a finished patient session (audio already saved to IndexedDB) and tells other tabs. */
  addPatientSession: (session: Session) => void;
  /** Saves device recordings, merges its sessions and tells other tabs. Returns how many were new. */
  importDevice: (data: DeviceImport) => Promise<number>;
  setNote: (patientId: string, text: string) => void;
  scheduleVisit: (patientId: string) => void;
  setNextResult: (mode: ResultMode) => void;
  setClinicSignedIn: (v: boolean) => void;
  setMotion: (m: PersistedState['motion']) => void;
  setRehearsal: (on: boolean) => void;
  /**
   * Back to the initial state: seed only, recordings cleared, no demo patient (streak back to 46), next
   * result stable, motion and clock back to normal. Only the clinician sign-in survives (stage setup, D35).
   */
  resetDemo: () => Promise<void>;
}

export type AppState = PersistedState & Actions;

const initialState: PersistedState = {
  demoName: null,
  sessions: [],
  syncedDevices: {},
  notes: {},
  scheduledVisits: {},
  nextResult: 'stable',
  clinicSignedIn: false,
  motion: 'system',
  rehearsal: false,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,

      startAsPatient: (name) => set({ demoName: name.trim() || 'Alex' }),

      addPatientSession: (session) => {
        // "Next result" is one-shot: once a session has used it, back to stable, so an "Attention" left armed
        // after testing can't surprise the stage demo (D87).
        set((s) => ({ sessions: [...s.sessions.filter((x) => x.id !== session.id), session], nextResult: 'stable' }));
        postDemoMessage({ type: 'session:new', sessionId: session.id });
      },

      importDevice: async (data) => {
        await saveAudioMany(data.audio);
        const known = new Set(get().sessions.map((s) => s.id));
        const fresh = data.sessions.filter((s) => !known.has(s.id)).length;
        const sync: SyncedDevice = {
          deviceId: data.device.deviceId,
          patientId: data.device.patientId,
          syncedAt: clockNow().toISOString(),
          ...(data.device.exportedAt ? { exportedAt: data.device.exportedAt } : {}),
          sessionCount: data.sessions.length,
        };
        set((s) => ({
          sessions: mergeSyncedSessions(s.sessions, data.sessions),
          syncedDevices: { ...s.syncedDevices, [sync.deviceId]: sync },
        }));
        postDemoMessage({
          type: 'device:synced',
          deviceId: sync.deviceId,
          patientId: sync.patientId,
          count: data.sessions.length,
        });
        return fresh;
      },

      setNote: (patientId, text) => set((s) => ({ notes: { ...s.notes, [patientId]: text } })),
      scheduleVisit: (patientId) =>
        set((s) => ({ scheduledVisits: { ...s.scheduledVisits, [patientId]: clockNow().toISOString() } })),
      setNextResult: (nextResult) => set({ nextResult }),
      setClinicSignedIn: (clinicSignedIn) => set({ clinicSignedIn }),
      setMotion: (motion) => set({ motion }),
      setRehearsal: (rehearsal) => set({ rehearsal }),

      resetDemo: async () => {
        // Recordings first: changing `rehearsal` below reloads the page (main.tsx), which would cut this short.
        await clearAudio().catch(() => undefined);
        const { clinicSignedIn } = get();
        set({ ...initialState, clinicSignedIn });
        postDemoMessage({ type: 'demo:reset' });
      },
    }),
    {
      name: STORE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s): PersistedState => ({
        demoName: s.demoName,
        sessions: s.sessions,
        syncedDevices: s.syncedDevices,
        notes: s.notes,
        scheduledVisits: s.scheduledVisits,
        nextResult: s.nextResult,
        clinicSignedIn: s.clinicSignedIn,
        motion: s.motion,
        rehearsal: s.rehearsal,
      }),
    },
  ),
);

// ---- Cross-tab sync ---------------------------------------------------------------------------------------

/**
 * Subscribes to messages from other tabs. The store is re-read from localStorage *before* the handler runs,
 * so the handler already sees the new session / synced data.
 */
export function onDemoMessage(handler: (m: DemoMessage) => void): () => void {
  return subscribeDemoMessages(async (m) => {
    await useAppStore.persist.rehydrate();
    handler(m);
  });
}

// Keep every tab's store current even without a message listener (e.g. a note edited in another tab).
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORE_KEY) void useAppStore.persist.rehydrate();
  });
}

// ---- Selectors --------------------------------------------------------------------------------------------

/** Patients and sessions: the seed for today merged with this browser's state. */
export function useDerivedData() {
  const demoName = useAppStore((s) => s.demoName);
  const sessions = useAppStore((s) => s.sessions);
  const syncedDevices = useAppStore((s) => s.syncedDevices);
  return useMemo(() => {
    const now = clockNow();
    return derive(buildSeed(now), { demoName, sessions, syncedDevices }, now);
  }, [demoName, sessions, syncedDevices]);
}

export function usePatient(id: string | undefined) {
  const { patients, sessions } = useDerivedData();
  return useMemo(() => {
    const patient = patients.find((p) => p.id === id);
    return { patient, sessions: sessions.filter((s) => s.patientId === id) };
  }, [patients, sessions, id]);
}

export const useDemoSessions = () => {
  const sessions = useAppStore((s) => s.sessions);
  return useMemo(() => sessions.filter((s) => s.patientId === DEMO_PATIENT_ID), [sessions]);
};
