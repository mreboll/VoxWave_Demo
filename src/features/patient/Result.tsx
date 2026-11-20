import { useMemo } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ArrowRight, Flame, HeartHandshake } from 'lucide-react';
import { Confetti } from '../../components/Confetti';
import { IdleWave } from '../../components/IdleWave';
import { PrototypeFooter } from '../../components/PrototypeFooter';
import { useCountUp } from '../../components/AnimatedNumber';
import { useAppStore, useDemoSessions } from '../../data/store';
import { currentStreak, doneDays } from '../../data/patientCalendar';
import { isSameLocalDay } from '../../data/dates';
import { riseIn, spring, staggerContainer } from '../../design/motion';
import { useReducedMotion } from '../../design/useReducedMotion';
import { PhoneFrame } from './PatientShell';
import { now as clockNow } from '../../data/clock';

const RESTING_WAVE = ['var(--color-teal)', 'var(--color-navy)', 'var(--color-coral)'];

/**
 * Result (brief §6.5). Patient-facing: no numbers, no disease words. "attention" only happens when the demo
 * control sets it, and asks calmly to contact the neurologist.
 */
export function Result() {
  const navigate = useNavigate();
  const { state } = useLocation() as { state: { sessionId?: string } | null };
  const name = useAppStore((s) => s.demoName) ?? 'Alex';
  const sessions = useDemoSessions();
  const session = sessions.find((s) => s.id === state?.sessionId) ?? sessions.at(-1);
  const now = useMemo(() => clockNow(), []);
  const streak = currentStreak(doneDays(sessions, now), now);

  // Opened directly (no session in the navigation state): only show a result from today, never an old one.
  if (!session || (!state?.sessionId && !isSameLocalDay(new Date(session.startedAt), now))) {
    return <Navigate to="/patient/home" replace />;
  }
  const attention = session.result.status === 'attention';

  return (
    <PhoneFrame>
      <motion.div className="flex flex-1 flex-col px-6 pt-16 pb-6" variants={staggerContainer(0.15)} initial="hidden" animate="show">
        {attention ? <Attention name={name} /> : <Stable streak={streak} />}
        {/* The voice wave at rest: the session is over. Calmer still after an "attention" result. */}
        <motion.div variants={riseIn} aria-hidden className={`pointer-events-none -mx-6 flex min-h-[56px] flex-1 items-center ${attention ? 'opacity-35' : 'opacity-60'}`}>
          <IdleWave height={56} amplitude={attention ? 0.22 : 0.34} colors={RESTING_WAVE} className="w-full" />
        </motion.div>
        <motion.button
          variants={riseIn}
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/patient/home', { replace: true })}
          className={`btn flex items-center justify-center gap-2 rounded-full py-4 text-[17px] font-semibold ${
            attention ? 'bg-navy text-white' : 'bg-coral text-on-coral shadow-action'
          }`}
        >
          Back to home
          <ArrowRight size={18} />
        </motion.button>
        <PrototypeFooter className="mt-4 text-center" />
      </motion.div>
    </PhoneFrame>
  );
}

function Stable({ streak }: { streak: number }) {
  const reduced = useReducedMotion();
  // The streak ticks from yesterday's value to today's (46 → 47).
  const shown = useCountUp(streak, { delay: 0.9, duration: 0.6 });
  const from = Math.max(0, streak - 1);
  return (
    <>
      <div className="relative flex justify-center pt-4">
        <Confetti delay={0.35} />
        {/* Two rings open out from the check and fade, once: celebratory, not loud. */}
        {!reduced &&
          [0, 1].map((i) => (
            <motion.span
              key={i}
              aria-hidden
              className="absolute top-4 h-28 w-28 rounded-full ring-2 ring-stable/60"
              initial={{ scale: 1, opacity: 0 }}
              animate={{ scale: [1, 1.9 + i * 0.5], opacity: [0.7, 0] }}
              transition={{ delay: 0.45 + i * 0.22, duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
            />
          ))}
        <motion.div
          className="relative flex h-28 w-28 items-center justify-center rounded-full bg-stable shadow-raised"
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 14, delay: 0.15 }}
        >
          <svg width={56} height={56} viewBox="0 0 24 24" fill="none">
            <motion.path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="#fff"
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.4, duration: 0.4 }}
            />
          </svg>
        </motion.div>
      </div>
      <motion.h1 variants={riseIn} className="mt-9 text-center font-display text-[34px] leading-[1.1] font-bold tracking-[-0.03em] text-navy">
        Session complete
      </motion.h1>
      <motion.p variants={riseIn} className="mt-2 text-center text-[17px] text-ink-muted">
        Your voice sounded steady today.
      </motion.p>
      <motion.div variants={riseIn} className="surface mt-7 flex items-center justify-center gap-3.5 rounded-3xl px-5 py-4">
        <motion.span
          className="flex h-12 w-12 items-center justify-center rounded-full bg-coral/12"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ delay: 1.4, duration: 0.5 }}
        >
          <Flame size={24} className="fill-coral/25 text-coral" />
        </motion.span>
        <span className="numeral text-[44px] text-navy">{Math.round(Math.max(from, shown))}</span>
        <span className="text-[15px] text-ink-muted">day streak</span>
      </motion.div>
      <motion.p variants={riseIn} className="mt-6 text-center font-display text-lg font-semibold text-teal">
        See you tomorrow
      </motion.p>
    </>
  );
}

function Attention({ name }: { name: string }) {
  return (
    <>
      <motion.div className="flex justify-center pt-4" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...spring, delay: 0.1 }}>
        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-coral/12 ring-1 ring-coral/25 ring-inset">
          <HeartHandshake size={48} className="text-coral" strokeWidth={1.6} />
        </div>
      </motion.div>
      <motion.h1 variants={riseIn} className="mt-9 font-display text-[30px] leading-[1.1] font-bold tracking-[-0.03em] text-navy">
        Thanks, {name}.
      </motion.h1>
      <motion.p variants={riseIn} className="mt-3 text-[17px] leading-relaxed text-ink-muted">
        Your voice sounded a little different this week.
      </motion.p>
      <motion.div variants={riseIn} className="mt-6 rounded-3xl bg-coral p-5 text-on-coral shadow-raised">
        <p className="font-display text-[21px] leading-snug font-bold tracking-tight">Please contact your neurologist</p>
        <p className="mt-1.5 text-[15px] leading-relaxed text-on-coral/85">They’ll take a look. There’s nothing else you need to do today.</p>
      </motion.div>
    </>
  );
}
