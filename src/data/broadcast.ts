// Same-browser hand-off between tabs (brief §9.3): BroadcastChannel `voxwave-demo`, with a localStorage
// `storage`-event fallback for browsers without BroadcastChannel. Never crosses devices.
import type { DemoMessage } from './types';

export const CHANNEL_NAME = 'voxwave-demo';
const FALLBACK_KEY = 'voxwave-demo:message';

type Envelope = { nonce: string; message: DemoMessage };
type Handler = (message: DemoMessage) => void;

const handlers = new Set<Handler>();
const seen = new Set<string>();
let channel: BroadcastChannel | null = null;
let listening = false;

const nonce = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function deliver(env: Envelope | null) {
  if (!env?.message || seen.has(env.nonce)) return;
  seen.add(env.nonce);
  handlers.forEach((h) => h(env.message));
}

function ensureListening() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  if ('BroadcastChannel' in window) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (e: MessageEvent<Envelope>) => deliver(e.data);
  }
  window.addEventListener('storage', (e) => {
    if (e.key !== FALLBACK_KEY || !e.newValue) return;
    try {
      deliver(JSON.parse(e.newValue) as Envelope);
    } catch {
      /* ignore malformed */
    }
  });
}

/** Sends to every other tab of this browser (not to this one). */
export function postDemoMessage(message: DemoMessage) {
  ensureListening();
  const env: Envelope = { nonce: nonce(), message };
  seen.add(env.nonce);
  channel?.postMessage(env);
  if (!channel) {
    try {
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(env));
    } catch {
      /* storage unavailable: nothing else to do */
    }
  }
}

/**
 * Delivers a message to this tab's own subscribers (BroadcastChannel never echoes to the sender). Used when
 * the demo panel injects a session in the clinic tab itself.
 */
export function dispatchLocal(message: DemoMessage) {
  ensureListening();
  window.setTimeout(() => deliver({ nonce: nonce(), message }), 0);
}

/** Subscribes to messages from other tabs. Returns an unsubscribe function. */
export function subscribeDemoMessages(handler: Handler): () => void {
  ensureListening();
  handlers.add(handler);
  return () => handlers.delete(handler);
}
