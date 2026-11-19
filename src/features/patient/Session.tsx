import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, MicOff, Phone, RotateCcw, Sparkles, X } from 'lucide-react';
import { LiveWave } from '../../components/LiveWave';
import { useMicrophone, type MicStatus } from '../../audio/useMicrophone';
import { pickMimeType } from '../../audio/mime';
import { startRecording, type RecordingHandle } from '../../audio/recorder';
import { analyserSource, createSyntheticSource, type SyntheticMode } from '../../audio/synthetic';
import { audioKey, saveAudio } from '../../audio/storage';
import { buildPatientSession, newSessionId, type ActivityCapture } from '../../data/patientSession';
import { useAppStore } from '../../data/store';
import { ACTIVITY_LABEL } from '../../data/biomarkers';
import type { ActivityType } from '../../data/types';
import { spring } from '../../design/motion';
import { useReducedMotion } from '../../design/useReducedMotion';
import { ACTIVITIES, ACTIVITY_ICON } from './ActivityIcons';
import { PhoneFrame } from './PatientShell';
import { PrototypeFooter } from '../../components/PrototypeFooter';
import { Analysing } from './Analysing';
import { now } from '../../data/clock';

// Brief §6.3 and App. B; the line to read was changed by the client (D101).
export const READ_LINE = 'Read along at this pace and follow the highlighted words.';
const READ_WORDS = READ_LINE.split(' ');
const CHAT_TOPIC = 'Tell us about your morning.';

/** Recording length per activity (s). The chat ends with "Finish" or automatically at its max. */
const TIMING: Record<ActivityType, { target: number; max: number; minBeforeFinish?: number }> = {
  sustained_vowel: { target: 5, max: 5 },
  reading: { target: 6.5, max: 6.5 },
  conversation: { target: 20, max: 30, minBeforeFinish: 3 },
};
const KARAOKE_START = 0.5;
const KARAOKE_STEP = 0.55; // 10 words: the last one lights at ~6 s, inside the 6.5 s recording (D103)

type Phase = 'intro' | 'requesting' | 'micProblem' | 'countdown' | 'recording' | 'stepDone' | 'analysing';

export function Session() {
  const navigate = useNavigate();
  const mic = useMicrophone();
  const nextResult = useAppStore((s) => s.nextResult);
  const addSession = useAppStore((s) => s.addPatientSession);

  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>('intro');
  const [demoMode, setDemoMode] = useState(false);
  const [problem, setProblem] = useState<MicStatus>('idle');
  const [count, setCount] = useState(3);
  const [elapsed, setElapsed] = useState(0);

  const sessionId = useRef(newSessionId());
  const startedAt = useRef(now());
  const captures = useRef<ActivityCapture[]>([]);
  const saves = useRef<Promise<unknown>[]>([]);
  const recording = useRef<RecordingHandle | null>(null);
  const recordStart = useRef(0);
  const stopping = useRef(false);
  const mime = useMemo(() => pickMimeType(), []);

  const type = ACTIVITIES[step];
  const timing = TIMING[type];

  // The wave takes whatever height is left between the instructions and the button (up to a maximum per
  // activity), so it is as big as the screen allows and "Finish" never falls off-screen: a small phone, a
  // tall one and the laptop frame each get their own size. Short screens also get tighter spacing.
  const rootRef = useRef<HTMLDivElement>(null);
  const [frameHeight, setFrameHeight] = useState(812);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setFrameHeight(Math.round(e.contentRect.height)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Callback ref: each step mounts its own wave box (after the previous step has slid out).
  const [waveHeight, setWaveHeight] = useState(WAVE_MAX[type]);
  const waveObserver = useRef<ResizeObserver | null>(null);
  const waveBoxRef = useCallback((el: HTMLDivElement | null) => {
    waveObserver.current?.disconnect();
    waveObserver.current = null;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const h = Math.round(e.contentRect.height);
      if (h > 0) setWaveHeight(h);
    });
    ro.observe(el);
    waveObserver.current = ro;
  }, []);
  const compact = frameHeight < 700;
  const ringSize = clampPx(frameHeight * 0.155, 72, 128);

  // What the waveform shows: the real analyser once the mic is on, a synthetic voice in demo mode.
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const stepRef = useRef(step);
  stepRef.current = step;
  const synthetic = useMemo(
    () =>
      createSyntheticSource((): SyntheticMode =>
        phaseRef.current !== 'recording' ? 'idle' : stepRef.current === 0 ? 'sustain' : 'speech',
      ),
    [],
  );
  const handles = mic.get();
  const source = demoMode ? synthetic : handles && mic.status === 'ready' ? analyserSource(handles.analyser) : null;

  // Two line-art rings behind the wave swell with the loudness, so the screen visibly answers the voice.
  // Driven straight from the wave's own frame loop (no React state): only opacity and transform change.
  const reduced = useReducedMotion();
  const discRef = useRef<HTMLDivElement>(null);
  const level = useRef(0);
  const onLevel = useCallback(
    (rmsLevel: number) => {
      const el = discRef.current;
      if (!el) return;
      const recordingNow = phaseRef.current === 'recording';
      const target = recordingNow ? Math.min(1, rmsLevel * DISC_GAIN) : 0;
      level.current = reduced ? (recordingNow ? 0.45 : 0) : level.current + (target - level.current) * 0.18;
      el.style.opacity = String(DISC_REST.opacity + level.current * 0.85);
      el.style.transform = `scale(${DISC_REST.scale + level.current * 0.42})`;
    },
    [reduced],
  );

  // Mic lost mid-session (unplugged, permission revoked): finish in demo mode instead of getting stuck.
  useEffect(() => {
    if (mic.status === 'lost' && !demoMode) setDemoMode(true);
  }, [mic.status, demoMode]);

  const finishRecording = useCallback(async () => {
    const rec = recording.current;
    if (!rec || stopping.current) return;
    stopping.current = true;
    recording.current = null;
    const result = await rec.stop();
    const capture: ActivityCapture = {
      type,
      durationSec: result.durationSec,
      rmsAvg: result.rmsAvg,
      rmsPeak: result.rmsPeak,
      // Only demo mode counts as simulated. A real mic without a file (no MediaRecorder) just has no audio.
      simulated: demoMode,
    };
    if (result.blob) {
      const key = audioKey(sessionId.current, type);
      capture.audioKey = key;
      capture.mimeType = result.mimeType;
      // Saved in the background; the session is only published once every save has settled.
      saves.current.push(
        saveAudio(key, result.blob).catch(() => {
          delete capture.audioKey; // IndexedDB unavailable (e.g. some private modes): no audio for this one
        }),
      );
    }
    captures.current = [...captures.current.filter((c) => c.type !== type), capture];
    stopping.current = false;
    setPhase('stepDone');
  }, [type, demoMode]);

  // Recording clock: drives the timers, the karaoke and the auto-stop.
  useEffect(() => {
    if (phase !== 'recording') return;
    let raf = 0;
    const tick = () => {
      const s = (performance.now() - recordStart.current) / 1000;
      setElapsed(s);
      if (s >= timing.max) void finishRecording();
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // rAF pauses in hidden tabs; this backup still ends the activity on time if the patient switches away.
    const backup = window.setTimeout(() => void finishRecording(), timing.max * 1000 + 250);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(backup);
    };
  }, [phase, timing.max, finishRecording]);

  // 3-2-1, then record.
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (count === 0) {
      recording.current = startRecording(demoMode ? null : mic.get(), demoMode ? null : mime);
      recordStart.current = performance.now();
      setElapsed(0);
      setPhase('recording');
      return;
    }
    const t = window.setTimeout(() => setCount((c) => c - 1), 600);
    return () => window.clearTimeout(t);
  }, [phase, count, demoMode, mic, mime]);

  // After the check animation: next activity, or the analysing moment.
  useEffect(() => {
    if (phase !== 'stepDone') return;
    const t = window.setTimeout(() => {
      if (step < ACTIVITIES.length - 1) {
        setStep((s) => s + 1);
        setPhase('intro');
      } else {
        setPhase('analysing');
      }
    }, 900);
    return () => window.clearTimeout(t);
  }, [phase, step]);

  const beginCountdown = () => {
    setCount(3);
    setPhase('countdown');
  };

  const onReady = async () => {
    if (demoMode || mic.status === 'ready') return beginCountdown();
    setPhase('requesting');
    const status = await mic.request(); // called from the tap: required by iOS
    if (status === 'ready') beginCountdown();
    else {
      setProblem(status);
      setPhase('micProblem');
    }
  };

  // The patient already said "I'm ready": go straight to the countdown, no second tap (D80).
  const continueInDemo = () => {
    setDemoMode(true);
    beginCountdown();
  };

  const leave = () => {
    recording.current?.cancel();
    recording.current = null;
    mic.release();
    navigate('/patient/home');
  };

  const publish = useCallback(async () => {
    await Promise.allSettled(saves.current);
    const ordered = ACTIVITIES.map((t) => captures.current.find((c) => c.type === t)).filter(Boolean) as ActivityCapture[];
    const session = buildPatientSession(sessionId.current, startedAt.current, ordered, nextResult);
    addSession(session); // stored + announced to the clinic tab (hand-off, milestone 5)
    mic.release();
    navigate('/patient/result', { replace: true, state: { sessionId: session.id } });
  }, [addSession, mic, navigate, nextResult]);

  const progress = (i: number) =>
    i < step || (i === step && (phase === 'stepDone' || phase === 'analysing'))
      ? 1
      : i === step && phase === 'recording'
        ? Math.min(1, elapsed / timing.target)
        : 0;

  return (
    <PhoneFrame dark>
      <div ref={rootRef} className="relative flex flex-1 flex-col">
        {/* Top bar */}
        <div className={`flex items-center gap-3 px-5 ${compact ? 'pt-9' : 'pt-12'}`}>
          <button
            type="button"
            onClick={leave}
            className="btn btn-press -ml-2.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/70"
            aria-label="Leave session"
          >
            <X size={22} />
          </button>
          <div className="flex flex-1 gap-1.5">
            {ACTIVITIES.map((t, i) => (
              <div key={t} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/12">
                {/* Slides in from the left (transform only); while recording it tracks the clock frame by frame. */}
                <motion.div
                  className="h-full w-full rounded-full bg-coral"
                  initial={false}
                  animate={{ x: `${(progress(i) - 1) * 100}%` }}
                  transition={phase === 'recording' && i === step ? { duration: 0.1, ease: 'linear' } : spring}
                />
              </div>
            ))}
          </div>
          <span className="w-9 text-right text-xs font-semibold text-white/60 tabular-nums">{step + 1}/3</span>
        </div>
        {demoMode && (
          <div className="mt-3 flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-white/75">
              <Sparkles size={12} />
              Demo mode · no microphone
            </span>
          </div>
        )}

        {/* Step content */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            className="flex flex-1 flex-col px-6"
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -60, opacity: 0 }}
            transition={spring}
          >
            <StepHeader type={type} phase={phase} compact={compact} />

            <div className="relative mt-4 flex min-h-0 flex-1 flex-col items-center justify-center">
              {/* The timer sits above the wave, never across it; before recording the ring holds the activity icon. */}
              {type === 'sustained_vowel' && (
                <RingTimer
                  recording={phase === 'recording'}
                  progress={elapsed / timing.target}
                  seconds={Math.max(0, Math.ceil(timing.target - elapsed))}
                  size={ringSize}
                />
              )}
              {/* Brief §6.3: the line shown big, the live waveform below it. */}
              {type === 'reading' && <Karaoke elapsed={phase === 'recording' ? elapsed : -1} compact={compact} />}
              <div ref={waveBoxRef} className="relative min-h-[64px] w-full flex-1 basis-0" style={{ maxHeight: WAVE_MAX[type] }}>
                <div
                  ref={discRef}
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-1/2 rounded-full border-2 border-coral will-change-transform"
                  style={{
                    width: waveHeight,
                    height: waveHeight,
                    marginTop: -waveHeight / 2,
                    marginLeft: -waveHeight / 2,
                    opacity: DISC_REST.opacity,
                    transform: `scale(${DISC_REST.scale})`,
                  }}
                >
                  <span className="absolute inset-[13%] rounded-full border border-teal-bright/70" />
                </div>
                <LiveWave source={phase === 'stepDone' ? null : source} height={waveHeight} className="relative w-full" onLevel={onLevel} />
              </div>
              {type === 'conversation' && (
                // Always laid out, so the wave does not jump when the call starts; only shown while recording.
                <motion.div
                  aria-hidden={phase !== 'recording'}
                  className={`numeral shrink-0 text-white ${compact ? 'mt-2 text-[40px]' : 'mt-4 text-[56px]'}`}
                  initial={false}
                  animate={{ opacity: phase === 'recording' ? 1 : 0, scale: phase === 'recording' ? 1 : 0.92 }}
                  transition={spring}
                >
                  {formatClock(phase === 'recording' ? elapsed : 0)}
                </motion.div>
              )}
            </div>

            <div className={compact ? 'pb-2' : 'pb-4'}>
              <BottomAction
                phase={phase}
                type={type}
                elapsed={elapsed}
                onReady={onReady}
                onFinish={() => void finishRecording()}
              />
              <PrototypeFooter dark className={`text-center ${compact ? 'mt-2' : 'mt-3'}`} />
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Overlays */}
        <AnimatePresence>
          {phase === 'countdown' && <Countdown key="countdown" n={count} />}
          {phase === 'stepDone' && <StepDone key="done" last={step === ACTIVITIES.length - 1} />}
          {phase === 'micProblem' && (
            <MicProblem key="problem" status={problem} onDemo={continueInDemo} onRetry={() => void onReady()} />
          )}
        </AnimatePresence>
        <AnimatePresence>{phase === 'analysing' && <Analysing key="analysing" onDone={() => void publish()} />}</AnimatePresence>
      </div>
    </PhoneFrame>
  );
}

/** Rings behind the wave: invisible in silence, they grow and brighten with the voice. */
const DISC_REST = { opacity: 0, scale: 0.7 };
/** RMS of normal speech is roughly 0.05–0.2: this maps it onto most of the disc's range. */
const DISC_GAIN = 7;

const clampPx = (v: number, lo: number, hi: number) => Math.round(Math.max(lo, Math.min(hi, v)));

/** Tallest the wave gets in each activity (px); on short screens it shrinks to the space that is left. */
const WAVE_MAX: Record<ActivityType, number> = { sustained_vowel: 230, reading: 150, conversation: 180 };

const formatClock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function StepHeader({ type, phase, compact }: { type: ActivityType; phase: Phase; compact: boolean }) {
  const Icon = ACTIVITY_ICON[type];
  const intro = phase !== 'recording' && phase !== 'stepDone';
  const h1 = `mt-3 font-display leading-tight font-bold tracking-tight ${compact ? 'text-[23px]' : 'text-[28px]'}`;
  const sub = `mt-2 text-white/65 ${compact ? 'text-[14px]' : 'text-[16px]'}`;
  return (
    <div className={compact ? 'mt-4' : 'mt-8'}>
      <div className="flex items-center gap-2 text-coral">
        <Icon size={18} />
        <span className="text-[12px] font-semibold tracking-[0.15em] uppercase">{ACTIVITY_LABEL[type]}</span>
      </div>
      {type === 'sustained_vowel' && (
        <>
          <h1 className={h1}>{intro ? 'Take a breath, then say “aaah”' : 'Keep going… “aaah”'}</h1>
          <p className={sub}>As steady as is comfortable, for about 5 seconds.</p>
        </>
      )}
      {type === 'reading' && (
        <>
          <h1 className={h1}>Read this line out loud</h1>
          <p className={sub}>Follow the words as they light up.</p>
        </>
      )}
      {type === 'conversation' && (
        <div className={`mt-4 rounded-3xl bg-white/7 ring-1 ring-white/10 ring-inset ${compact ? 'p-3.5' : 'p-4'}`}>
          <div className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.12em] text-white/55 uppercase">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-coral">
              <Phone size={12} className="text-on-coral" />
            </span>
            Practice call · Topic of the day
          </div>
          <div className={`mt-3 font-display leading-snug font-bold tracking-tight ${compact ? 'text-[21px]' : 'text-[24px]'}`}>
            {CHAT_TOPIC}
          </div>
          <div className="mt-1.5 text-[15px] text-white/65">Take your time — about 20 seconds.</div>
        </div>
      )}
    </div>
  );
}

function Karaoke({ elapsed, compact }: { elapsed: number; compact: boolean }) {
  const active = elapsed < 0 ? -1 : Math.min(READ_WORDS.length - 1, Math.floor((elapsed - KARAOKE_START) / KARAOKE_STEP));
  const wordSpring = { type: 'spring', stiffness: 400, damping: 24 } as const;
  return (
    <p className={`mb-4 shrink-0 text-center font-display leading-[1.25] font-bold tracking-tight ${compact ? 'text-[26px]' : 'text-[30px]'}`}>
      <span className="sr-only">{READ_LINE}</span>
      {/* Each word is three stacked copies (still to read, already read, being read): only their opacity and
          the word's scale animate. Unread words are white at 50 % (4.7:1 on navy). */}
      {READ_WORDS.map((w, i) => (
        <Fragment key={i}>
          <motion.span
            aria-hidden
            className="relative inline-block"
            initial={false}
            animate={{ scale: i === active ? 1.08 : 1 }}
            transition={wordSpring}
          >
            <span className="text-white/50">{w}</span>
            <motion.span className="absolute top-0 left-0 text-white" initial={false} animate={{ opacity: i < active ? 1 : 0 }} transition={wordSpring}>
              {w}
            </motion.span>
            <motion.span className="absolute top-0 left-0 text-coral" initial={false} animate={{ opacity: i === active ? 1 : 0 }} transition={wordSpring}>
              {w}
            </motion.span>
          </motion.span>
          {/* The space sits between the words, not inside them: inside an inline-block it would collapse. */}
          {i < READ_WORDS.length - 1 && ' '}
        </Fragment>
      ))}
    </p>
  );
}

/**
 * Circular timer of the "aah": the seconds left, big, inside a ring that fills up. Before recording the ring
 * is empty and holds the activity icon, so nothing moves when the recording starts.
 */
function RingTimer({ recording, progress, seconds, size }: { recording: boolean; progress: number; seconds: number; size: number }) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const Icon = ACTIVITY_ICON.sustained_vowel;
  return (
    <div className="relative mb-3 shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(244,248,250,0.12)" strokeWidth={stroke} />
        {recording && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-coral)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - Math.min(1, progress))}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <AnimatePresence mode="popLayout" initial={false}>
          {recording ? (
            <motion.span
              key="seconds"
              className="numeral text-white"
              style={{ fontSize: Math.round(size * 0.4) }}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={spring}
            >
              {seconds}
              <span className="ml-0.5 text-[0.42em] font-semibold tracking-normal text-white/65">s</span>
            </motion.span>
          ) : (
            <motion.span key="icon" className="text-white/60" exit={{ scale: 0.6, opacity: 0 }} transition={spring}>
              <Icon size={Math.round(size * 0.3)} />
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function BottomAction({
  phase,
  type,
  elapsed,
  onReady,
  onFinish,
}: {
  phase: Phase;
  type: ActivityType;
  elapsed: number;
  onReady: () => void;
  onFinish: () => void;
}) {
  if (phase === 'recording') {
    const canFinish = type === 'conversation' && elapsed >= (TIMING.conversation.minBeforeFinish ?? 0);
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-white/75">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-coral opacity-75" />
            <span className="relative h-2.5 w-2.5 rounded-full bg-coral" />
          </span>
          {type === 'conversation' ? 'Listening… finish whenever you like' : 'Listening…'}
        </div>
        {type === 'conversation' && (
          <motion.button
            type="button"
            onClick={onFinish}
            disabled={!canFinish}
            whileTap={{ scale: 0.97 }}
            className="btn w-full rounded-full bg-white py-4 text-[17px] font-semibold text-navy transition-opacity disabled:opacity-30"
          >
            Finish
          </motion.button>
        )}
      </div>
    );
  }
  if (phase === 'intro' || phase === 'requesting') {
    return (
      <motion.button
        type="button"
        onClick={onReady}
        disabled={phase === 'requesting'}
        whileTap={{ scale: 0.97 }}
        className="btn flex w-full items-center justify-center gap-2 rounded-full bg-coral py-4 text-[17px] font-semibold text-on-coral disabled:opacity-70"
      >
        {phase === 'requesting' ? 'Waiting for the microphone…' : type === 'conversation' ? 'Start the call' : "I'm ready"}
        {phase !== 'requesting' && <ArrowRight size={18} />}
      </motion.button>
    );
  }
  return <div className="h-[60px]" />;
}

function Countdown({ n }: { n: number }) {
  return (
    <motion.div
      className="absolute inset-0 z-20 flex items-center justify-center bg-navy/70 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
    >
      <AnimatePresence mode="popLayout">
        <motion.span
          key={n}
          className="font-display text-[120px] font-extrabold text-white"
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.6, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 18 }}
        >
          {n > 0 ? n : ''}
        </motion.span>
      </AnimatePresence>
    </motion.div>
  );
}

function StepDone({ last }: { last: boolean }) {
  return (
    <motion.div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-navy/80 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="flex h-24 w-24 items-center justify-center rounded-full bg-coral"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 14 }}
      >
        <svg width={48} height={48} viewBox="0 0 24 24" fill="none">
          <motion.path
            d="M5 12.5l4.5 4.5L19 7.5"
            stroke="var(--color-on-coral)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.18, duration: 0.35, ease: 'easeOut' }}
          />
        </svg>
      </motion.div>
      <motion.p
        className="mt-5 font-display text-xl font-bold"
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...spring, delay: 0.25 }}
      >
        {last ? 'All three done' : 'Nice.'}
      </motion.p>
    </motion.div>
  );
}

const PROBLEM_COPY: Partial<Record<MicStatus, { title: string; body: string }>> = {
  denied: {
    title: 'No microphone access',
    body: 'That’s okay. You can try the session in demo mode, or allow the microphone in your browser settings and try again.',
  },
  unavailable: {
    title: 'No microphone found',
    body: 'This device or browser doesn’t offer a microphone here. You can still try the session in demo mode.',
  },
};

function MicProblem({ status, onDemo, onRetry }: { status: MicStatus; onDemo: () => void; onRetry: () => void }) {
  const copy = PROBLEM_COPY[status] ?? {
    title: 'The microphone didn’t start',
    body: 'Something got in the way. You can try again, or continue in demo mode.',
  };
  return (
    <motion.div
      className="absolute inset-0 z-30 flex items-end bg-navy-deep/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full rounded-t-[32px] bg-card p-6 pb-8 text-ink"
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        exit={{ y: 80 }}
        transition={spring}
        role="alertdialog"
        aria-labelledby="mic-problem-title"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-paper-shade">
          <MicOff size={22} className="text-navy" />
        </div>
        <h2 id="mic-problem-title" className="mt-4 font-display text-[22px] font-bold text-navy">
          {copy.title}
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{copy.body}</p>
        <button
          type="button"
          onClick={onDemo}
          className="btn btn-press mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-coral py-4 text-[17px] font-semibold text-on-coral"
        >
          <Sparkles size={18} />
          Continue in demo mode
        </button>
        {status !== 'unavailable' && (
          <button
            type="button"
            onClick={onRetry}
            className="btn btn-press mt-2 flex w-full items-center justify-center gap-2 rounded-full py-3 text-[15px] font-semibold text-navy"
          >
            <RotateCcw size={16} />
            Try again
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}
