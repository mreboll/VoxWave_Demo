// Live hand-off between windows (brief §9.3). Same browser: BroadcastChannel `voxwave-demo`, with a
// localStorage `storage`-event fallback. Other devices (D114): a Supabase Realtime broadcast channel of the
// same name, when Supabase is configured. A nonce makes each message arrive once even if it comes both ways.
import type { DemoMessage } from './types';
import { supabase } from './remote';

export const CHANNEL_NAME = 'voxwave-demo';
const FALLBACK_KEY = 'voxwave-demo:message';
const REMOTE_EVENT = 'demo';

type Envelope = { nonce: string; message: DemoMessage };
type Handler = (message: DemoMessage) => void;

const handlers = new Set<Handler>();
const connectHandlers = new Set<() => void>();
const seen = new Set<string>();
let channel: BroadcastChannel | null = null;
let remote: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
let listening = false;

const nonce = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function deliver(env: Envelope | null) {
  if (!env?.message || !env.nonce || seen.has(env.nonce)) return;
  seen.add(env.nonce);
  handlers.forEach((h) => h(env.message));
}

function listenRemote() {
  if (!supabase) return;
  remote = supabase
    .channel(CHANNEL_NAME, { config: { broadcast: { self: false } } })
    .on('broadcast', { event: REMOTE_EVENT }, ({ payload }) => deliver(payload as Envelope))
    .subscribe((status, err) => {
      // Also fires after a reconnect: whatever was missed meanwhile is pulled by the listeners.
      if (status === 'SUBSCRIBED') connectHandlers.forEach((h) => h());
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.warn('[realtime]', status, err ?? '');
    });
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
  listenRemote();
}

/** Sends to every other window: this browser's tabs and, with Supabase, other devices (not to this one). */
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
  remote
    ?.send({ type: 'broadcast', event: REMOTE_EVENT, payload: env })
    .then((r) => r !== 'ok' && console.warn('[realtime] send', message.type, r))
    .catch((e: unknown) => console.warn('[realtime] send', message.type, e));
}

/**
 * Delivers a message to this tab's own subscribers (BroadcastChannel never echoes to the sender). Used when
 * the demo panel injects a session in the clinic tab itself.
 */
export function dispatchLocal(message: DemoMessage) {
  ensureListening();
  window.setTimeout(() => deliver({ nonce: nonce(), message }), 0);
}

/** Subscribes to messages from other windows. Returns an unsubscribe function. */
export function subscribeDemoMessages(handler: Handler): () => void {
  ensureListening();
  handlers.add(handler);
  return () => handlers.delete(handler);
}

/** Called each time the cross-device channel (re)connects. Returns an unsubscribe function. */
export function onRemoteConnected(handler: () => void): () => void {
  ensureListening();
  connectHandlers.add(handler);
  return () => connectHandlers.delete(handler);
}
