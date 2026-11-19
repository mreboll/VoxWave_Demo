import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { AnimatePresence, motion, useDragControls, useMotionValue } from 'motion/react';
import { CalendarClock, GripHorizontal, Megaphone, RotateCcw, Smartphone, Usb, X } from 'lucide-react';
import { useAppStore } from '../data/store';
import { FINAL_ZONE, isRehearsal, now } from '../data/clock';
import { formatDate, formatTime } from '../data/dates';
import { useClinicUi } from '../features/clinic/clinicUi';
import { reloadAfterReset, simulatePatientSession } from './actions';

// Where the presenter left the panel (this browser only; it's a convenience, D84).
const POSITION_KEY = 'voxwave-demo-panel-position';
function readPosition(): { x: number; y: number } {
  try {
    const p = JSON.parse(localStorage.getItem(POSITION_KEY) ?? 'null') as { x: number; y: number } | null;
    return p && Number.isFinite(p.x) && Number.isFinite(p.y) ? p : { x: 0, y: 0 };
  } catch {
    return { x: 0, y: 0 };
  }
}

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));

/**
 * Hidden stage controls (brief §11). Shift + D or ?demo=1 opens it; invisible otherwise and never in the way.
 * Every fallback of the demo script (§13) is one click here.
 */
export function DemoPanel() {
  const { search, pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(() => new URLSearchParams(search).get('demo') === '1');
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const nextResult = useAppStore((s) => s.nextResult);
  const setNextResult = useAppStore((s) => s.setNextResult);
  const motionSetting = useAppStore((s) => s.motion);
  const setMotion = useAppStore((s) => s.setMotion);
  const rehearsal = useAppStore((s) => s.rehearsal);
  const setRehearsal = useAppStore((s) => s.setRehearsal);
  const signedIn = useAppStore((s) => s.clinicSignedIn);
  const signIn = useAppStore((s) => s.setClinicSignedIn);
  const resetDemo = useAppStore((s) => s.resetDemo);
  const openSync = useClinicUi((s) => s.openSync);
  const replayAlert = useClinicUi((s) => s.replayAlert);

  // Draggable by its header, kept inside the window, so it can be parked away from what's on the projector.
  const dragControls = useDragControls();
  const bounds = useRef<HTMLDivElement>(null);
  const start = readPosition();
  const x = useMotionValue(start.x);
  const y = useMotionValue(start.y);
  const savePosition = () => {
    try {
      localStorage.setItem(POSITION_KEY, JSON.stringify({ x: x.get(), y: y.get() }));
    } catch {
      /* storage unavailable: the panel just won't remember where it was */
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'd' && !isTyping(e.target)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const done = (msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 2200);
  };

  /** Device sync and the alert live on the dashboard: go there first (signed in) if needed. */
  const toDashboard = () => {
    if (!signedIn) signIn(true);
    if (pathname !== '/clinic/dashboard') navigate('/clinic/dashboard');
  };

  const actions = {
    simulate: () => {
      const s = simulatePatientSession();
      done(`Session sent · ${s.result.status}`);
    },
    device: () => {
      toDashboard();
      // Let the dashboard mount before the modal opens straight into the sample import.
      window.setTimeout(() => openSync('sample'), pathname === '/clinic/dashboard' ? 0 : 350);
      setOpen(false);
    },
    alert: () => {
      toDashboard();
      window.setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        replayAlert();
      }, pathname === '/clinic/dashboard' ? 0 : 350);
    },
    reset: async () => {
      setBusy('reset');
      await resetDemo(); // also turns the rehearsal clock off; other windows reload on 'demo:reset'
      reloadAfterReset();
    },
  };

  // The rehearsal reminder shows the (shifted) time: refresh it twice a minute.
  const [, tick] = useState(0);
  useEffect(() => {
    if (!rehearsal) return;
    const id = window.setInterval(() => tick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, [rehearsal]);
  const clock = now();

  return (
    <>
      {/* Discreet reminders of non-default demo settings (click to open the panel). Top centre: the free space
          between the date and the clinician in the clinic header, clear of the sidebar footer (D86). */}
      {!open && (rehearsal || nextResult === 'attention') && (
        // Wraps (and shortens below 640 px) so both reminders fit narrow phones, down to 320 px (D89).
        // `w-max`: a box fixed at left:50% would otherwise shrink to half the screen and wrap too early.
        <div className="no-print fixed top-1.5 left-1/2 z-[70] flex w-max max-w-[calc(100vw-16px)] -translate-x-1/2 flex-wrap justify-center gap-1.5">
          {rehearsal && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-navy-deep/85 px-3 py-1 text-[11px] font-semibold whitespace-nowrap text-white/85 shadow-lg backdrop-blur"
            >
              <CalendarClock size={13} className="text-coral-soft" />
              Rehearsal · {formatDate(clock, { day: 'numeric', month: 'short' })}
              <span className="hidden sm:inline">
                {formatTime(clock.toISOString())} Vilnius
              </span>
            </button>
          )}
          {nextResult === 'attention' && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-coral px-3 py-1 text-[11px] font-semibold whitespace-nowrap text-white shadow-lg"
            >
              <span className="hidden sm:inline">Next result:</span> Attention
            </button>
          )}
        </div>
      )}

      <div ref={bounds} className="no-print pointer-events-none fixed inset-3 z-[69]" aria-hidden />
      <AnimatePresence>
        {open && (
          <motion.aside
            drag
            dragListener={false}
            dragControls={dragControls}
            dragMomentum={false}
            dragConstraints={bounds}
            onDragEnd={savePosition}
            style={{ x, y }}
            // No `y` in the entrance/exit: it would overwrite the dragged (saved) position (D84).
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className="no-print fixed bottom-4 left-4 z-[70] w-[264px] max-w-[calc(100vw-32px)] rounded-2xl bg-navy-deep p-3.5 text-white shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)] ring-1 ring-white/10"
            aria-label="Demo controls"
          >
            <div
              className="-m-1 flex cursor-grab touch-none items-center justify-between rounded-lg p-1 select-none active:cursor-grabbing"
              onPointerDown={(e) => {
                e.preventDefault(); // no text selection on the page while dragging
                dragControls.start(e);
              }}
              title="Drag to move"
            >
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.15em] text-white/60 uppercase">
                <GripHorizontal size={14} className="text-white/35" />
                Demo controls
              </span>
              <button type="button" onClick={() => setOpen(false)} className="text-white/50 hover:text-white" aria-label="Close demo controls">
                <X size={16} />
              </button>
            </div>

            <Section label="Next result · one session">
              <Segmented
                label="Next result"
                value={nextResult}
                options={[
                  ['stable', 'Stable'],
                  ['attention', 'Attention'],
                ]}
                onChange={setNextResult}
              />
            </Section>

            <div className="mt-2.5 grid gap-1">
              <Action icon={<Smartphone size={15} />} label="Simulate session from patient" onClick={actions.simulate} />
              <Action icon={<Usb size={15} />} label="Load device data" onClick={actions.device} />
              <Action icon={<Megaphone size={15} />} label="Trigger P-0187 alert animation" onClick={actions.alert} />
            </div>

            <Section label="Rehearse the final">
              <Toggle
                checked={rehearsal}
                onChange={(on) => setRehearsal(on)}
                label="Today is 20 Nov 2026"
                hint={rehearsal ? `${formatDate(clock, { weekday: 'short', day: 'numeric', month: 'short' })} · ${formatTime(clock.toISOString())} (${FINAL_ZONE.split('/')[1]})` : 'Vilnius time · reloads the page'}
              />
            </Section>

            <Section label="Testing">
              <Toggle
                checked={motionSetting === 'reduce'}
                onChange={(on) => setMotion(on ? 'reduce' : 'system')}
                label="Reduced motion"
              />
            </Section>

            <button
              type="button"
              onClick={() => void actions.reset()}
              disabled={busy === 'reset'}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-coral/90 py-2 text-sm font-semibold text-white hover:bg-coral disabled:opacity-60"
            >
              <RotateCcw size={15} />
              {busy === 'reset' ? 'Resetting…' : 'Reset demo'}
            </button>

            <div className="mt-2.5 flex h-4 items-center justify-between text-[10px] text-white/40">
              <AnimatePresence mode="wait">
                {flash ? (
                  <motion.span key={flash} className="text-coral-soft" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {flash}
                  </motion.span>
                ) : (
                  <motion.span key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    Shift + D to hide{isRehearsal() ? ' · rehearsal clock on' : ''}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <div className="mb-1 text-[10px] font-semibold tracking-[0.15em] text-white/45 uppercase">{label}</div>
      {children}
    </div>
  );
}

function Action({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-xl bg-white/6 px-3 py-2 text-left text-[13px] font-medium text-white/90 hover:bg-white/12"
    >
      <span className="text-coral-soft">{icon}</span>
      {label}
    </motion.button>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<[T, string]>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/6 p-1" role="radiogroup" aria-label={label}>
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          aria-label={label}
          onClick={() => onChange(v)}
          className={`relative rounded-lg py-1.5 text-[13px] font-semibold ${value === v ? 'text-white' : 'text-white/55 hover:text-white/80'}`}
        >
          {value === v && (
            <motion.span
              layoutId="demo-segment"
              className={`absolute inset-0 rounded-lg ${v === 'attention' ? 'bg-coral' : 'bg-teal'}`}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
          <span className="relative">{label}</span>
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={hint ? `${label} (${hint})` : label}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-xl bg-white/6 px-3 py-2 text-left hover:bg-white/10"
    >
      <span>
        <span className="block text-[13px] font-medium text-white/90">{label}</span>
        {hint && <span className="block text-[11px] text-white/45">{hint}</span>}
      </span>
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-coral' : 'bg-white/20'}`}>
        <motion.span
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white"
          animate={{ left: checked ? 18 : 2 }}
          transition={{ type: 'spring', stiffness: 600, damping: 35 }}
        />
      </span>
    </button>
  );
}
