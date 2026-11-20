import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildPatientSession } from './patientSession';

vi.hoisted(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
});

import { useVisitorStore } from './visitor';

beforeEach(() => useVisitorStore.setState({ profiles: [], activeId: null }));

describe('visitor profiles', () => {
  it('returns to the same local profile and keeps another name separate', () => {
    const store = useVisitorStore;
    store.getState().start('  Javier  ');
    const first = store.getState().activeId!;
    const session = buildPatientSession('V-TEST-1', new Date(), [], 'stable', first);
    store.getState().addSession(session);
    store.getState().start('Laura');
    expect(store.getState().activeId).not.toBe(first);
    expect(store.getState().profiles.at(-1)?.sessions).toEqual([]);
    store.getState().start('javier');
    expect(store.getState().activeId).toBe(first);
    expect(store.getState().profiles.find((p) => p.id === first)?.sessions).toEqual([session]);
  });

  it('rehydrates only the local visitor data after a reload', async () => {
    useVisitorStore.getState().start('Alex');
    const id = useVisitorStore.getState().activeId;
    const saved = localStorage.getItem('voxwave-visitor-profiles')!;
    useVisitorStore.setState({ profiles: [], activeId: null });
    localStorage.setItem('voxwave-visitor-profiles', saved);
    await useVisitorStore.persist.rehydrate();
    expect(useVisitorStore.getState().activeId).toBe(id);
    expect(useVisitorStore.getState().profiles[0].name).toBe('Alex');
  });
});
