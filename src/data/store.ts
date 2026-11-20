// App state (brief §9.3, D114). What the demo creates (demo patient, its sessions, synced device sessions,
// notes, scheduled visits, demo settings) is shared through Supabase when configured, so every device sees
// the same data; localStorage keeps a copy for an instant first paint and as the offline fallback. The seed is
// rebuilt from today's date on every load (derive.ts) and is never stored. Audio: audio/storage.ts.
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { clearAudio, saveAudioMany } from '../audio/storage';
import { onRemoteConnected, postDemoMessage, subscribeDemoMessages } from './broadcast';
import { derive, type SyncedDevice } from './derive';
import { mergeSyncedSessions, type DeviceImport } from './deviceImport';
import { fetchShared, KV, remoteEnabled, setKv, setManyKv, upsertSessions, wipeShared } from './remote';
import { buildSeed, DEMO_PATIENT_ID } from './seed';
import type { SharedState } from './sharedState';
import type { DemoMessage, Session } from './types';
import { now as clockNow } from './clock';

export const STORE_KEY = 'voxwave-demo-state';
/** Safety-net refresh while the page is visible, in case a realtime message was missed. */
const POLL_MS = 30_000;

interface PersistedState extends SharedState {
  /** User-picked exports belong to this browser. Remote pulls and resets on other devices cannot remove them. */
  folderSessions: Session[];
  folderDevices: Record<string, SyncedDevice>;
  /** Per device: the laptop stays signed in to the clinic; the phone doesn't need to be. */
  clinicSignedIn: boolean;
  /** Per device. Demo panel override; 'system' follows prefers-reduced-motion. */
  motion: 'system' | 'reduce';
}

interface Actions {
  /** Creates the demo patient P-DEMO (welcome + consent). */
  startAsPatient: (name: string) => void;
  /** Appends a finished patient session (audio already saved) and tells the other windows once it is stored. */
  addPatientSession: (session: Session) => Promise<void>;
  /** Saves device recordings, merges its sessions and tells the other windows. Returns how many were new. */
  importDevice: (data: DeviceImport, source: 'pick' | 'sample') => Promise<number>;
  setNote: (patientId: string, text: string) => void;
  scheduleVisit: (patientId: string) => void;
  setNextResult: (mode: SharedState['nextResult']) => void;
  setClinicSignedIn: (v: boolean) => void;
  setMotion: (m: PersistedState['motion']) => void;
  /** Shared, so both devices agree on "today". Stored before it is applied, because applying it reloads. */
  setRehearsal: (on: boolean) => Promise<void>;
  /**
   * Back to the initial state on every device: shared data and recordings deleted, seed only, no demo
   * patient (streak back to 46), next result stable, clock back to normal. Only this device's clinician
   * sign-in and motion setting survive (stage setup, D35). Throws if the shared data couldn't be deleted.
   */
  resetDemo: () => Promise<void>;
}

export type AppState = PersistedState & Actions;

const initialShared: SharedState = {
  demoName: null,
  sessions: [],
  syncedDevices: {},
  notes: {},
  scheduledVisits: {},
  nextResult: 'stable',
  rehearsal: false,
};

const initialState: PersistedState = { ...initialShared, folderSessions: [], folderDevices: {}, clinicSignedIn: false, motion: 'system' };

// ---- Writes to Supabase -----------------------------------------------------------------------------------
// Local state changes first (the UI never waits on the network), then the write is queued. Writes run one
// after another so they land in order, and a pull waits for them so it never brings back an older value.

let writeQueue: Promise<void> = Promise.resolve();
let writeSeq = 0;

function pushRemote(what: string, write: () => Promise<void>): Promise<void> {
  if (!remoteEnabled) return Promise.resolve();
  writeSeq++;
  writeQueue = writeQueue.then(write).catch((e: unknown) => console.warn(`[sync] ${what}:`, e));
  return writeQueue;
}

/** Stores a change, then tells the other windows to pull it. */
function share(what: string, write: () => Promise<void>, message: DemoMessage = { type: 'state:changed' }) {
  return pushRemote(what, write).then(() => postDemoMessage(message));
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,

      startAsPatient: (name) => {
        const demoName = name.trim() || 'Alex';
        set({ demoName });
        void share('demo patient', () => setKv(KV.demoName, demoName));
      },

      addPatientSession: async (session) => {
        // "Next result" is one-shot: once a session has used it, back to stable, so an "Attention" left armed
        // after testing can't surprise the stage demo (D87).
        set((s) => ({ sessions: [...s.sessions.filter((x) => x.id !== session.id), session], nextResult: 'stable' }));
        const { demoName } = get();
        await share(
          'session',
          async () => {
            await upsertSessions([session]);
            await setManyKv([
              [KV.nextResult, 'stable'],
              ...(session.patientId === DEMO_PATIENT_ID && demoName ? [[KV.demoName, demoName] as [string, string]] : []),
            ]);
          },
          { type: 'session:new', sessionId: session.id },
        );
      },

      importDevice: async (data, source) => {
        await saveAudioMany(data.audio, source === 'sample');
        const { sessions, folderSessions } = get();
        const known = new Map([...folderSessions, ...sessions].map((s) => [s.id, s]));
        const fresh = data.sessions.filter((s) => !known.has(s.id)).length;
        const sync: SyncedDevice = {
          deviceId: data.device.deviceId,
          patientId: data.device.patientId,
          syncedAt: (source === 'pick' ? new Date() : clockNow()).toISOString(),
          ...(data.device.exportedAt ? { exportedAt: data.device.exportedAt } : {}),
          sessionCount: data.sessions.length,
        };
        if (source === 'pick') {
          const imported = data.sessions.map((s) => s.captureClockSynced === false && !s.receivedAt
            ? { ...s, receivedAt: known.get(s.id)?.receivedAt ?? sync.syncedAt }
            : s);
          set((s) => ({
            folderSessions: mergeSyncedSessions(s.folderSessions, imported),
            folderDevices: { ...s.folderDevices, [sync.deviceId]: sync },
          }));
          return fresh;
        }
        const merged = mergeSyncedSessions(sessions, data.sessions);
        const imported = new Set(data.sessions.map((s) => s.id));
        set((s) => ({ sessions: merged, syncedDevices: { ...s.syncedDevices, [sync.deviceId]: sync } }));
        await share(
          'device sync',
          async () => {
            await upsertSessions(merged.filter((s) => imported.has(s.id)));
            await setKv(KV.device(sync.deviceId), sync);
          },
          { type: 'device:synced', deviceId: sync.deviceId, patientId: sync.patientId, count: data.sessions.length },
        );
        return fresh;
      },

      setNote: (patientId, text) => {
        set((s) => ({ notes: { ...s.notes, [patientId]: text } }));
        void share('note', () => setKv(KV.note(patientId), text));
      },
      scheduleVisit: (patientId) => {
        const at = clockNow().toISOString();
        set((s) => ({ scheduledVisits: { ...s.scheduledVisits, [patientId]: at } }));
        void share('visit', () => setKv(KV.visit(patientId), at));
      },
      setNextResult: (nextResult) => {
        set({ nextResult });
        void share('next result', () => setKv(KV.nextResult, nextResult));
      },
      setClinicSignedIn: (clinicSignedIn) => set({ clinicSignedIn }),
      setMotion: (motion) => set({ motion }),
      setRehearsal: async (rehearsal) => {
        await share('rehearsal clock', () => setKv(KV.rehearsal, rehearsal));
        set({ rehearsal }); // reloads this page (main.tsx)
      },

      resetDemo: async () => {
        if (remoteEnabled) {
          await writeQueue; // nothing queued may land after the wipe
          await wipeShared();
        }
        // Recordings first: changing `rehearsal` below reloads the page (main.tsx), which would cut this short.
        await clearAudio().catch(() => undefined);
        postDemoMessage({ type: 'demo:reset' });
        const { clinicSignedIn, motion } = get();
        set({ ...initialState, clinicSignedIn, motion });
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
        folderSessions: s.folderSessions,
        folderDevices: s.folderDevices,
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

// ---- Reads from Supabase ----------------------------------------------------------------------------------

let pulling: Promise<void> | null = null;

async function pullOnce() {
  await writeQueue;
  const seq = writeSeq;
  try {
    const shared = await fetchShared();
    // A local change queued while we were reading is newer than what we read: keep it, the next pull catches up.
    if (seq !== writeSeq) return;
    const current = useAppStore.getState();
    // Keep a quiet poll from rewriting localStorage and rerendering every chart in every open tab.
    const changed = (Object.keys(shared) as (keyof SharedState)[]).some((key) =>
      JSON.stringify(current[key]) !== JSON.stringify(shared[key]));
    if (changed) useAppStore.setState(shared);
  } catch (e) {
    console.warn('[sync] pull failed, showing the copy kept in this browser:', e);
  }
}

/**
 * Brings this window up to date: from Supabase when configured, else from localStorage (other tabs).
 * Concurrent calls share one request.
 */
export function refreshShared(): Promise<void> {
  if (!remoteEnabled) return useAppStore.persist.rehydrate() ?? Promise.resolve();
  pulling ??= pullOnce().finally(() => (pulling = null));
  return pulling;
}

/**
 * Subscribes to messages from other windows and devices. The shared state is re-read *before* the handler
 * runs, so the handler already sees the new session / synced data.
 */
export function onDemoMessage(handler: (m: DemoMessage) => void): () => void {
  return subscribeDemoMessages(async (m) => {
    await refreshShared();
    handler(m);
  });
}

if (typeof window !== 'undefined') {
  // Same browser: keep every tab current even without a message listener (e.g. a note edited in another tab).
  window.addEventListener('storage', (e) => {
    if (e.key === STORE_KEY) void useAppStore.persist.rehydrate();
  });
  if (remoteEnabled) {
    void refreshShared();
    // Messages without a listener of their own (note, setting): pull them.
    subscribeDemoMessages((m) => m.type === 'state:changed' && void refreshShared());
    onRemoteConnected(() => void refreshShared());
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && void refreshShared());
    window.setInterval(() => document.visibilityState === 'visible' && void refreshShared(), POLL_MS);
  }
}

// ---- Selectors --------------------------------------------------------------------------------------------

/** Patients and sessions: the seed for today merged with the demo's own data. */
export function useDerivedData() {
  const demoName = useAppStore((s) => s.demoName);
  const sessions = useAppStore((s) => s.sessions);
  const syncedDevices = useAppStore((s) => s.syncedDevices);
  const folderSessions = useAppStore((s) => s.folderSessions);
  const folderDevices = useAppStore((s) => s.folderDevices);
  return useMemo(() => {
    const now = clockNow();
    const devices = { ...syncedDevices };
    for (const sync of Object.values(folderDevices)) {
      if (!devices[sync.deviceId] || Date.parse(sync.syncedAt) > Date.parse(devices[sync.deviceId].syncedAt)) devices[sync.deviceId] = sync;
    }
    const combined = mergeSyncedSessions(folderSessions, sessions);
    return { ...derive(buildSeed(now), { demoName, sessions: combined, syncedDevices: devices }, now), syncedDevices: devices };
  }, [demoName, sessions, syncedDevices, folderSessions, folderDevices]);
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
