// Shared data in Supabase (D114): the same demo on every device, no accounts. Configured by
// VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY; without them `supabase` is null and the app keeps everything in
// this browser, as before (offline stage fallback). Tables and bucket: supabase/schema.sql.
import { createClient } from '@supabase/supabase-js';
import { baseMime, KV, rowsToShared, sessionToRow, storagePath, type KvRow, type SessionRow, type SharedState } from './sharedState';
import type { Session } from './types';

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabase =
  URL_ && PUBLISHABLE_KEY ? createClient(URL_, PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
export const remoteEnabled = supabase !== null;

const SESSIONS = 'demo_sessions';
const KV_TABLE = 'demo_kv';
const BUCKET = 'demo-audio';
/** Longest we let an audio upload hold back publishing a session (a slow phone connection on stage). */
const UPLOAD_TIMEOUT_MS = 20_000;
const LIST_PAGE = 1000;
/** Safety bound on the wipe loop (LIST_PAGE files per round). */
const MAX_WIPE_ROUNDS = 20;

function client() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

/** Throws a readable error for a failed Supabase call, with what we were doing. */
function check<T extends { error: { message: string } | null }>(res: T, what: string): T {
  if (res.error) throw new Error(`Supabase ${what} failed: ${res.error.message}`);
  return res;
}

function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error(`${what} timed out after ${ms / 1000}s`)), ms);
    p.then(
      (v) => (window.clearTimeout(t), resolve(v)),
      (e) => (window.clearTimeout(t), reject(e)),
    );
  });
}

// ---- State ------------------------------------------------------------------------------------------------

export async function fetchShared(): Promise<SharedState> {
  const db = client();
  const [kv, sessions] = await Promise.all([
    db.from(KV_TABLE).select('key, value'),
    db.from(SESSIONS).select('id, patient_id, started_at, data').order('started_at'),
  ]);
  check(kv, 'reading settings');
  check(sessions, 'reading sessions');
  return rowsToShared((kv.data ?? []) as KvRow[], (sessions.data ?? []) as SessionRow[]);
}

export async function upsertSessions(sessions: Session[]): Promise<void> {
  if (!sessions.length) return;
  check(await client().from(SESSIONS).upsert(sessions.map(sessionToRow)), 'saving sessions');
}

/** Sets one shared value; `null` deletes it (e.g. no demo patient). */
export async function setKv(key: string, value: unknown): Promise<void> {
  const table = client().from(KV_TABLE);
  if (value === null) check(await table.delete().eq('key', key), `clearing ${key}`);
  else check(await table.upsert({ key, value, updated_at: new Date().toISOString() }), `saving ${key}`);
}

export async function setManyKv(entries: Array<[string, unknown]>): Promise<void> {
  if (!entries.length) return;
  const at = new Date().toISOString();
  check(await client().from(KV_TABLE).upsert(entries.map(([key, value]) => ({ key, value, updated_at: at }))), 'saving settings');
}

export { KV };

// ---- Audio ------------------------------------------------------------------------------------------------

export async function uploadAudio(audioKey: string, blob: Blob): Promise<void> {
  const upload = client()
    .storage.from(BUCKET)
    .upload(storagePath(audioKey), blob, { upsert: true, contentType: baseMime(blob.type) });
  check(await withTimeout(upload, UPLOAD_TIMEOUT_MS, `Uploading ${audioKey}`), `uploading ${audioKey}`);
}

/** The recording from the bucket, or undefined when it isn't there (never uploaded, or reset). */
export async function downloadAudio(audioKey: string): Promise<Blob | undefined> {
  const { data, error } = await client().storage.from(BUCKET).download(storagePath(audioKey));
  if (error) return undefined;
  return data ?? undefined;
}

async function wipeAudio(): Promise<void> {
  const bucket = client().storage.from(BUCKET);
  for (let round = 0; round < MAX_WIPE_ROUNDS; round++) {
    const { data } = check(await bucket.list('', { limit: LIST_PAGE }), 'listing recordings');
    const names = (data ?? []).map((f) => f.name).filter(Boolean);
    if (!names.length) return;
    check(await bucket.remove(names), 'deleting recordings');
  }
}

/**
 * "Reset demo" for every device: deletes everything the demo created (sessions, settings, recordings). The
 * seeded patients are not stored, so they are untouched.
 */
export async function wipeShared(): Promise<void> {
  const db = client();
  check(await db.from(SESSIONS).delete().neq('id', ''), 'deleting sessions');
  check(await db.from(KV_TABLE).delete().neq('key', ''), 'deleting settings');
  await wipeAudio();
}
