import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Session } from './types';

interface VisitorProfile {
  id: string;
  name: string;
  sessions: Session[];
}

interface VisitorState {
  profiles: VisitorProfile[];
  activeId: string | null;
  start: (name: string) => void;
  addSession: (session: Session) => void;
}

export const useVisitorStore = create<VisitorState>()(
  persist(
    (set) => ({
      profiles: [],
      activeId: null,
      start: (input) => {
        const name = input.trim().replace(/\s+/g, ' ') || 'Alex';
        set((state) => {
          const existing = state.profiles.find((profile) => profile.name.toLowerCase() === name.toLowerCase());
          if (existing) return { activeId: existing.id };
          const profile = { id: `V-${crypto.randomUUID()}`, name, sessions: [] };
          return { activeId: profile.id, profiles: [...state.profiles, profile] };
        });
      },
      addSession: (session) => set((state) => ({
        profiles: state.profiles.map((profile) => profile.id === session.patientId
          ? { ...profile, sessions: [...profile.sessions.filter((s) => s.id !== session.id), session] }
          : profile),
      })),
    }),
    {
      name: 'voxwave-visitor-profiles',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ profiles, activeId }) => ({ profiles, activeId }),
    },
  ),
);

export const useVisitorProfile = () =>
  useVisitorStore((state) => state.profiles.find((profile) => profile.id === state.activeId));
