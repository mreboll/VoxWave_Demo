import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, ArrowRight, Check, FolderOpen, Lock, Radio, Volume2, X } from 'lucide-react';
import {
  DeviceImportError,
  filesFromDirectoryHandle,
  filesFromFileList,
  filesFromPublicSample,
  readDeviceExport,
  type DeviceFiles,
  type DeviceImport,
} from '../../../data/deviceImport';
import { useAppStore } from '../../../data/store';
import { buildSeed } from '../../../data/seed';
import { now } from '../../../data/clock';
import { formatInSentence, formatSessionTime, sessionTime } from '../../../data/dates';
import { spring } from '../../../design/motion';
import { useClinicUi } from '../clinicUi';
import { DeviceIllustration } from './DeviceIllustration';

type Stage =
  | { kind: 'connect' }
  | { kind: 'reading' }
  | { kind: 'importing'; data: DeviceImport; shown: number }
  | { kind: 'done'; data: DeviceImport }
  | { kind: 'error'; message: string };

/** Time between two session rows dropping in (the sync is a show, brief §8.3). */
const ROW_MS = 420;

type DirectoryPicker = (opts?: { id?: string; mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
const directoryPicker = () => (window as unknown as { showDirectoryPicker?: DirectoryPicker }).showDirectoryPicker;

/**
 * "Sync VoxWave device" (brief §8): pick the VOXWAVE drive → read device.json + sessions.json (+ audio) →
 * animated import → Robert's card and detail update. Read-only: nothing is ever written to the drive.
 */
export function DeviceSyncModal() {
  const open = useClinicUi((s) => s.syncOpen);
  const source = useClinicUi((s) => s.syncSource);
  const close = useClinicUi((s) => s.closeSync);
  const highlight = useClinicUi((s) => s.highlight);
  const importDevice = useAppStore((s) => s.importDevice);
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>({ kind: 'connect' });
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (getFiles: () => Promise<DeviceFiles>) => {
    setStage({ kind: 'reading' });
    try {
      const files = await getFiles();
      const data = await readDeviceExport(files);
      if (data.warnings.length) console.info('[VoxWave sync]', data.warnings.join('\n'));
      if (data.sessions.length === 0) throw new DeviceImportError('The device has no sessions to sync yet.');
      setStage({ kind: 'importing', data, shown: 0 });
    } catch (err) {
      setStage({
        kind: 'error',
        message: err instanceof DeviceImportError ? err.message : 'The drive could not be read. Check it is plugged in and try again.',
      });
    }
  }, []);

  // Reset on open; the demo control opens straight into the sample import.
  useEffect(() => {
    if (!open) return;
    if (source === 'sample') void load(() => filesFromPublicSample());
    else setStage({ kind: 'connect' });
  }, [open, source, load]);

  // Session rows drop in one by one; then the data is saved (audio → IndexedDB) and the dashboard updates.
  useEffect(() => {
    if (stage.kind !== 'importing') return;
    const { data, shown } = stage;
    if (shown < data.sessions.length) {
      const t = window.setTimeout(() => setStage({ kind: 'importing', data, shown: shown + 1 }), shown === 0 ? 700 : ROW_MS);
      return () => window.clearTimeout(t);
    }
    let alive = true;
    const t = window.setTimeout(async () => {
      try {
        await importDevice(data, source);
        if (!alive) return;
        highlight(data.device.patientId);
        setStage({ kind: 'done', data });
      } catch {
        if (alive) setStage({ kind: 'error', message: 'The recording could not be saved in this browser. Check available storage and try again.' });
      }
    }, 450);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [stage, source, importDevice, highlight]);

  const choose = async () => {
    const picker = directoryPicker();
    if (!picker) {
      inputRef.current?.click(); // Safari / Firefox: <input webkitdirectory>
      return;
    }
    try {
      const dir = await picker.call(window, { id: 'voxwave-device', mode: 'read' });
      await load(() => filesFromDirectoryHandle(dir));
    } catch (err) {
      // Cancelling the picker is not an error: stay on the connect step.
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setStage({ kind: 'error', message: 'The browser could not open the drive. Use the folder selector to choose the VOXWAVE folder.' });
    }
  };

  const busy = stage.kind === 'reading' || stage.kind === 'importing';

  // Keyboard (D91): focus moves into the dialog, Esc closes it (not mid-import), Tab stays inside, and focus
  // returns to whatever opened it.
  const dialogRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(busy);
  busyRef.current = busy;
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const focusables = () =>
      [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([hidden]), [tabindex]:not([tabindex="-1"])') ?? [])];
    const t = window.setTimeout(() => (focusables()[0] ?? dialogRef.current)?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busyRef.current) {
        e.stopPropagation();
        close();
      } else if (e.key === 'Tab') {
        const items = focusables();
        if (!items.length) return e.preventDefault();
        const first = items[0];
        const last = items[items.length - 1];
        const inside = dialogRef.current?.contains(document.activeElement);
        if (e.shiftKey && (document.activeElement === first || !inside)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey, true);
      opener?.focus?.();
    };
  }, [open, close]);
  const data = stage.kind === 'importing' || stage.kind === 'done' ? stage.data : null;
  const shown = stage.kind === 'importing' ? stage.shown : stage.kind === 'done' ? stage.data.sessions.length : 0;
  const patientName = buildSeed().patients.find((p) => p.id === data?.device.patientId)?.name
    ?? data?.device.patientName ?? data?.device.patientId ?? '';
  const lastSession = data?.sessions.at(-1);
  const screen =
    stage.kind === 'connect' ? 'VOXWAVE' : stage.kind === 'reading' ? 'READING…' : stage.kind === 'importing' ? `SYNC ${shown}/${data!.sessions.length}` : stage.kind === 'done' ? 'SYNCED ✓' : 'ERROR';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-deep/45 p-4 backdrop-blur-sm sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !busy && close()}
        >
          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sync-title"
            className="relative flex max-h-[calc(100dvh-32px)] w-full max-w-[680px] flex-col overflow-hidden rounded-3xl bg-card p-6 shadow-overlay sm:p-8"
            initial={{ scale: 0.92, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1, transition: spring }}
            exit={{ scale: 0.96, opacity: 0, transition: { duration: 0.15 } }}
            onClick={(e) => e.stopPropagation()}
          >
            {!busy && (
              <button
                type="button"
                onClick={close}
                className="btn btn-press absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full text-ink-muted"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            )}

            <div className="flex items-center gap-2 text-coral">
              <Radio size={18} />
              <span className="label !text-coral">VoxWave home device</span>
            </div>
            <h2 id="sync-title" className="mt-2 text-[26px] leading-tight font-bold tracking-[-0.03em] text-navy">
              {stage.kind === 'done' ? 'Device synced' : data ? 'Syncing device' : 'Connect your VoxWave device'}
            </h2>

            {/* The bench: device, cable and computer on a paper panel. Smaller once the sessions list needs the room. */}
            <div className={`shrink-0 rounded-2xl bg-paper/55 ring-1 ring-ink-hairline ring-inset ${data ? 'mt-3 px-3 py-1' : 'mt-5 px-4 py-3'}`}>
              <div className={data ? 'mx-auto w-full max-w-[400px]' : ''}>
                <DeviceIllustration lit={stage.kind !== 'connect' && stage.kind !== 'error'} screen={screen} flowing={stage.kind === 'importing'} />
              </div>
            </div>

            {/* Only this part scrolls: the actions below stay visible on short screens (D81). */}
            <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
              <AnimatePresence mode="wait">
                {stage.kind === 'connect' && (
                  <motion.div key="connect" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                    <ol className="mt-6 space-y-3">
                      {['Connect the USB drive containing the device export.', 'Choose the VOXWAVE folder on the drive.'].map((t, i) => (
                        <li key={t} className="flex items-start gap-3 text-[15px] text-navy">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy font-display text-xs font-bold text-white">
                            {i + 1}
                          </span>
                          {t}
                        </li>
                      ))}
                    </ol>
                    <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
                        <Lock size={13} />
                        Read-only: nothing is written to the device.
                      </span>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.97 }}
                        onClick={() => void choose()}
                        className="btn inline-flex items-center gap-2 rounded-full bg-coral px-5 py-3 text-sm font-semibold text-on-coral shadow-action"
                      >
                        <FolderOpen size={17} />
                        Choose device
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {stage.kind === 'reading' && (
                  <motion.p key="reading" className="mt-6 text-center text-sm text-ink-muted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    Reading the VOXWAVE drive…
                  </motion.p>
                )}

                {data && (
                  <motion.div key="import" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="mt-3 flex items-center gap-4 rounded-2xl p-3.5 ring-1 ring-ink-faint ring-inset">
                      <ProgressRing value={shown} total={data.sessions.length} done={stage.kind === 'done'} />
                      <div className="min-w-0">
                        <div className="font-display text-[15px] font-semibold text-navy">
                          {data.device.deviceId} · {patientName} · {data.sessions.length} sessions found
                        </div>
                        <div className="text-sm text-ink-muted">
                          {stage.kind === 'done'
                            ? lastSession && lastSession.captureClockSynced !== false
                              ? `Synced ${data.sessions.length} sessions · last one ${formatInSentence(lastSession.startedAt)}`
                              : `Synced ${data.sessions.length} sessions · device clock unverified`
                            : `Importing session ${Math.min(shown + 1, data.sessions.length)} of ${data.sessions.length}…`}
                        </div>
                        {stage.kind === 'done' && lastSession && lastSession.captureClockSynced !== false && Date.parse(lastSession.startedAt) > now().getTime() && (
                          // Imported dates are never rewritten (D66); say why they look like the future (D77).
                          <div className="mt-1 text-xs text-ink-muted">Dates come from the device, whose clock is ahead of this computer’s.</div>
                        )}
                      </div>
                    </div>

                    <ul className="mt-2.5 space-y-1">
                      <AnimatePresence initial={false}>
                        {data.sessions
                          .slice(0, shown)
                          .map((s) => (
                            <motion.li
                              key={s.id}
                              layout
                              initial={{ opacity: 0, y: -14, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                              className="flex items-center gap-3 rounded-xl bg-paper/55 px-3.5 py-1.5 text-sm"
                            >
                              <Check size={15} strokeWidth={2.5} className="text-stable-ink" />
                              <span className="w-32 font-medium text-navy tabular-nums">
                                {s.captureClockSynced === false ? 'Device clock unverified' : formatSessionTime(sessionTime(s))}
                              </span>
                              <span className="text-ink-muted tabular-nums">{Math.round(s.activities.reduce((t, a) => t + a.durationSec, 0))} s</span>
                              <span className="ml-auto flex items-center gap-2">
                                {s.quality && s.quality.noise !== 'low' && (
                                  <span className="rounded-full bg-watch/14 px-2 py-0.5 text-[11px] font-semibold text-watch-ink">Noise</span>
                                )}
                                {s.activities.some((a) => a.audioKey) && <Volume2 size={14} className="text-teal" />}
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                    s.result.status === 'attention' ? 'bg-coral/12 text-coral-ink' : 'bg-stable/10 text-stable-ink'
                                  }`}
                                >
                                  {s.result.metricsSource === 'demo' ? 'Demo values' : s.result.status === 'attention' ? 'Outside baseline' : 'Within baseline'}
                                </span>
                              </span>
                            </motion.li>
                          ))
                          .reverse()}
                      </AnimatePresence>
                    </ul>
                  </motion.div>
                )}

                {stage.kind === 'error' && (
                  <motion.div key="error" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6">
                    <div className="flex items-start gap-3 rounded-2xl bg-watch/12 p-4 text-sm text-navy ring-1 ring-watch/30 ring-inset" role="alert">
                      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-watch-ink" />
                      {stage.message}
                    </div>
                    <div className="mt-5 flex justify-end">
                      <button type="button" onClick={() => inputRef.current?.click()} className="btn btn-press px-4 py-2.5 text-sm font-semibold text-navy">
                        Choose folder
                      </button>
                      <button
                        type="button"
                        onClick={() => setStage({ kind: 'connect' })}
                        className="btn btn-press rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-white"
                      >
                        Try again
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {stage.kind === 'done' && data && (
              <motion.div className="flex shrink-0 flex-wrap justify-end gap-2 pt-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
                <button type="button" onClick={close} className="btn btn-press rounded-full px-4 py-2.5 text-sm font-semibold text-navy">
                  Done
                </button>
                <button
                  type="button"
                  onClick={() => {
                    close();
                    navigate(`/clinic/patients/${data.device.patientId}`);
                  }}
                  className="btn btn-press inline-flex items-center gap-2 rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-white"
                >
                  Open {patientName.split(' ')[0]}'s sessions
                  <ArrowRight size={15} />
                </button>
              </motion.div>
            )}

            {/* Fallback for browsers without showDirectoryPicker (brief §8.4). */}
            <input
              ref={inputRef}
              type="file"
              multiple
              hidden
              {...{ webkitdirectory: '', directory: '' }}
              onChange={(e) => {
                // Copy first: `files` is live, and clearing `value` (so the same drive can be picked again) empties it.
                const picked = Array.from(e.target.files ?? []);
                e.target.value = '';
                if (picked.length) void load(async () => filesFromFileList(picked));
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ProgressRing({ value, total, done }: { value: number; total: number; done: boolean }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-14 w-14 shrink-0">
      <svg width={56} height={56} className="-rotate-90">
        <circle cx={28} cy={28} r={r} fill="none" stroke="var(--color-ink-faint)" strokeWidth={5} />
        <motion.circle
          cx={28}
          cy={28}
          r={r}
          fill="none"
          stroke={done ? 'var(--color-stable)' : 'var(--color-coral)'}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={c}
          animate={{ strokeDashoffset: c * (1 - (total ? value / total : 0)) }}
          transition={{ type: 'spring', stiffness: 160, damping: 22 }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-sm font-bold text-navy tabular-nums">
        {done ? <Check size={20} className="text-stable" strokeWidth={3} /> : `${value}/${total}`}
      </span>
    </div>
  );
}
