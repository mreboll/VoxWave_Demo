import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ArrowRight, CalendarDays, Check, Flame, RotateCcw } from 'lucide-react';
import { IdleWave } from '../../components/IdleWave';
import { PrototypeFooter } from '../../components/PrototypeFooter';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { useVisitorProfile } from '../../data/visitor';
import { formatDate, greeting, isSameLocalDay } from '../../data/dates';
import { currentStreak, currentWeek, dayState, doneDays } from '../../data/patientCalendar';
import { ACTIVITY_LABEL } from '../../data/biomarkers';
import { riseIn, spring, staggerContainer } from '../../design/motion';
import { ACTIVITIES, ACTIVITY_ICON } from './ActivityIcons';
import { PhoneFrame } from './PatientShell';
import { now as clockNow } from '../../data/clock';

const HEADER_WAVE = ['var(--color-teal)', 'var(--color-coral-soft)', 'var(--color-coral)'];

/** Greeting, streak, today's session and the week (brief §6.2). */
export function Home() {
  const navigate = useNavigate();
  const profile = useVisitorProfile()!;
  const { name, sessions } = profile;
  const now = useMemo(() => clockNow(), []);
  const done = useMemo(() => doneDays(sessions, now), [sessions, now]);
  const streak = currentStreak(done, now);
  const doneToday = sessions.some((s) => isSameLocalDay(new Date(s.startedAt), now));
  const date = formatDate(now, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <PhoneFrame>
      <motion.div className="flex flex-1 flex-col" variants={staggerContainer(0.05)} initial="hidden" animate="show">
        <header className="px-6 pt-14">
          <motion.p variants={riseIn} className="text-sm text-ink-muted">
            {date}
          </motion.p>
          <motion.h1 variants={riseIn} className="mt-1 font-display text-[32px] leading-[1.1] font-bold tracking-[-0.03em] text-navy">
            {greeting(now)}, {name}
          </motion.h1>
        </header>
        {/* The calm voice wave runs under the greeting (brief §6.2), edge to edge, never across the text. */}
        <motion.div variants={riseIn} aria-hidden className="pointer-events-none -mt-1 opacity-70">
          <IdleWave height={56} amplitude={0.42} colors={HEADER_WAVE} />
        </motion.div>

        <div className="mt-1 flex flex-col gap-4 px-5">
          {/* Streak: the number is the hero of the card */}
          <motion.div variants={riseIn} className="surface flex items-center justify-between gap-4 rounded-3xl py-4 pr-4 pl-5">
            <div className="flex min-w-0 items-baseline gap-3">
              <div className="numeral text-[48px] text-navy">
                <AnimatedNumber value={streak} delay={0.3} />
              </div>
              <div className="text-[15px] leading-snug text-ink-muted">day streak — keep it going</div>
            </div>
            <motion.div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-coral/12"
              animate={{ rotate: [0, -6, 6, 0] }}
              transition={{ delay: 1, duration: 0.6 }}
            >
              <Flame size={28} className="fill-coral/25 text-coral" />
            </motion.div>
          </motion.div>

          {/* Today's session */}
          <motion.div
            variants={riseIn}
            layout
            className={`overflow-hidden rounded-3xl ${doneToday ? 'surface p-5' : 'bg-navy p-5 pt-6 text-white shadow-raised'}`}
          >
            {doneToday ? (
              <div className="flex items-center gap-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ ...spring, delay: 0.3 }}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-stable text-white"
                >
                  <Check size={26} strokeWidth={3} />
                </motion.div>
                <div className="flex-1">
                  <div className="font-display text-xl font-bold tracking-tight text-navy">Done for today</div>
                  <div className="text-[15px] text-ink-muted">See you tomorrow</div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-[0.15em] text-white/65 uppercase">Today's session</span>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/90 tabular-nums">3 min</span>
                </div>
                {/* The three activities as one sequence: icons in rings, joined by a line. */}
                <div className="relative mt-5 grid grid-cols-3 gap-1">
                  {/* From the centre of the first ring to the centre of the last; the rings sit on top of it. */}
                  <motion.span
                    aria-hidden
                    className="absolute top-6 right-[16.67%] left-[16.67%] h-px origin-left bg-white/20"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ ...spring, delay: 0.5 }}
                  />
                  {ACTIVITIES.map((type, i) => {
                    const Icon = ACTIVITY_ICON[type];
                    return (
                      <motion.div
                        key={type}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...spring, delay: 0.4 + i * 0.07 }}
                        className="relative flex flex-col items-center gap-2.5 text-center"
                      >
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-navy ring-1 ring-white/20 ring-inset">
                          <Icon size={22} className="text-coral" />
                        </span>
                        <span className="text-[13px] leading-tight font-medium text-white/90">{ACTIVITY_LABEL[type]}</span>
                      </motion.div>
                    );
                  })}
                </div>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate('/patient/session')}
                  className="btn mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-coral py-4 text-[17px] font-semibold text-on-coral"
                >
                  Start
                  <ArrowRight size={18} />
                </motion.button>
              </>
            )}
          </motion.div>

          {/* Week strip */}
          <motion.div variants={riseIn} className="surface rounded-3xl p-4 px-5">
            <div className="flex items-center justify-between">
              <span className="label">This week</span>
              <Link to="/patient/progress" className="btn -mr-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-semibold text-teal">
                <CalendarDays size={15} />
                Progress
              </Link>
            </div>
            <div className="mt-3 grid grid-cols-7 gap-1">
              {currentWeek(now).map((day, i) => {
                const st = dayState(day, done, now);
                return (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <span className={`text-[11px] font-semibold ${st === 'today' || (st === 'done' && isSameLocalDay(day, now)) ? 'text-navy' : 'text-ink-muted'}`}>
                      {formatDate(day, { weekday: 'narrow' })}
                    </span>
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 0.45 + i * 0.05 }}
                      className={`flex h-9 w-9 items-center justify-center rounded-full ${
                        st === 'done'
                          ? 'bg-teal text-white'
                          : st === 'today'
                            ? 'ring-2 ring-coral ring-inset'
                            : st === 'missed'
                              ? 'bg-paper-shade'
                              : 'ring-1 ring-ink-faint ring-inset'
                      }`}
                    >
                      {st === 'done' && <Check size={15} strokeWidth={3} />}
                      {st === 'today' && <span className="h-1.5 w-1.5 rounded-full bg-coral" />}
                    </motion.span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {doneToday && (
            <motion.button
              variants={riseIn}
              type="button"
              onClick={() => navigate('/patient/session')}
              className="btn mx-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-ink-muted"
            >
              <RotateCcw size={14} />
              Practise again
            </motion.button>
          )}
        </div>

        <div className="flex-1" />
        <PrototypeFooter className="px-6 pt-6 pb-5 text-center" />
      </motion.div>
    </PhoneFrame>
  );
}
