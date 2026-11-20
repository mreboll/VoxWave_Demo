import { beforeEach, describe, expect, it, vi } from 'vitest';
import { set } from 'idb-keyval';
import { uploadAudio } from '../data/remote';
import { saveAudio } from './storage';

vi.mock('idb-keyval', () => ({
  createStore: () => ({}), set: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn(), get: vi.fn(), setMany: vi.fn(),
}));
vi.mock('../data/remote', () => ({
  remoteEnabled: true, uploadAudio: vi.fn().mockResolvedValue(undefined), downloadAudio: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

describe('recording storage', () => {
  it('keeps visitor trial audio in IndexedDB', async () => {
    const blob = new Blob(['voice'], { type: 'audio/webm' });
    await saveAudio('visitor/conversation', blob, false);
    expect(set).toHaveBeenCalledWith('visitor/conversation', blob, expect.anything());
    expect(uploadAudio).not.toHaveBeenCalled();
  });

  it('preserves the existing shared-recording behavior', async () => {
    const blob = new Blob(['voice'], { type: 'audio/webm' });
    await saveAudio('shared/conversation', blob);
    expect(uploadAudio).toHaveBeenCalledWith('shared/conversation', blob);
  });
});
