import { Fragment, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { useReducedMotion } from '../../design/useReducedMotion';
import { ArrowLeft, Check, Flame, Trophy } from 'lucide-react';
import { PrototypeFooter } from '../../components/PrototypeFooter';
import { StatCounter } from '../../components/StatCounter';
import { smoothPath, linear } from '../../components/charts/geometry';
import { useDemoSessions } from '../../data/store';
import { addDays, formatDate, formatDay, isSameLocalDay, startOfDay } from '../../data/dates';
import { bestStreak, calendarWeeks, currentStreak, dayState, doneDays } from '../../data/patientCalendar';
import { createRng } from '../../data/prng';
import { riseIn, staggerContainer } from '../../design/motion';
import { PhoneFrame } from './PatientShell';
import { now as clockNow } from '../../data/clock';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Calendar of the last 8 weeks, streaks and a friendly unit-less line (brief §6.6). */
export function Progress() {
  const navigate = useNavigate();
  const sessions = useDemoSessions();
  const now = useMemo(() => clockNow(), []);
  const done = useMemo(() => doneDays(sessions, now), [sessions, now]);
  const streak = currentStreak(done, now);
  const weeks = calendarWeeks(now, 8);

  return (
    <PhoneFrame>
      <motion.div className="flex flex-1 flex-col px-5 pt-12 pb-6" variants={staggerContainer(0.05)} initial="hidden" animate="show">
        <motion.button
          variants={riseIn}
          type="button"
          onClick={() => navigate('/patient/home')}
          className="btn -ml-2 inline-flex items-center gap-1.5 self-start rounded-full px-2 py-1 text-sm font-medium text-ink-muted"
        >
          <ArrowLeft size={16} />
          Home
        </motion.button>
        <motion.h1 variants={riseIn} className="mt-3 px-1 font-display text-[32px] leading-[1.1] font-bold tracking-[-0.03em] text-navy">
          Your progress
        </motion.h1>

        <motion.div variants={riseIn} className="mt-5 grid grid-cols-2 gap-3">
          <div className="surface rounded-3xl p-4">
            <div className="flex items-center justify-between">
              <div className="numeral text-[40px] text-navy">
                <StatCounter value={streak} />
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-coral/12">
                <Flame size={20} className="fill-coral/25 text-coral" />
              </span>
            </div>
            <div className="mt-2 text-sm text-ink-muted">current streak</div>
          </div>
          <div className="surface rounded-3xl p-4">
            <div className="flex items-center justify-between">
              <div className="numeral text-[40px] text-navy">
                <StatCounter value={bestStreak(streak)} delay={0.1} />
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal/10">
                <Trophy size={20} className="text-teal" />
              </span>
            </div>
            <div className="mt-2 text-sm text-ink-muted">best streak</div>
          </div>
        </motion.div>

        <motion.div variants={riseIn} className="surface mt-4 rounded-3xl p-4 px-5">
          <div className="label">Last 8 weeks</div>
          {/* One row per week. The month is named on the row where it starts, so the eye can find a date. */}
          <div className="mt-3 grid grid-cols-[2.25rem_repeat(7,minmax(0,1fr))] items-center gap-y-1">
            <span />
            {WEEKDAYS.map((d, i) => (
              <span key={i} className="text-center text-[11px] font-semibold text-ink-muted">
                {d}
              </span>
            ))}
            {weeks.map((week, row) => {
              const month = monthOfWeek(week);
              const newMonth = row === 0 || month !== monthOfWeek(weeks[row - 1]);
              return (
                <Fragment key={row}>
                  <span className="text-[11px] font-semibold text-ink-muted">{newMonth ? month : ''}</span>
                  {week.map((day, col) => {
                    const st = dayState(day, done, now);
                    // Today done = a done day (teal) that still reads as today (coral ring + check), D83.
                    const doneToday = st === 'done' && isSameLocalDay(day, now);
                    return (
                      <motion.span
                        key={col}
                        title={formatDate(day, { weekday: 'long', day: 'numeric', month: 'long' })}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 22, delay: 0.25 + (row * 7 + col) * 0.012 }}
                        aria-label={doneToday ? 'Today: done' : st === 'today' ? 'Today: not done yet' : undefined}
                        className={`mx-auto flex h-[26px] w-[26px] items-center justify-center rounded-full ${
                          st === 'done'
                            ? doneToday
                              ? 'bg-teal text-white ring-2 ring-coral ring-offset-2 ring-offset-card'
                              : 'bg-teal/80'
                            : st === 'today'
                              ? 'ring-2 ring-coral ring-inset'
                              : st === 'missed'
                                ? 'bg-paper-shade ring-1 ring-ink-faint ring-inset'
                                : 'ring-1 ring-ink-faint ring-inset'
                        }`}
                      >
                        {doneToday && <Check size={14} strokeWidth={3} />}
                      </motion.span>
                    );
                  })}
                </Fragment>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-4 border-t border-ink-hairline pt-3 text-[11px] text-ink-muted">
            <Legend className="bg-teal/80" label="Done" />
            <Legend className="bg-paper-shade ring-1 ring-ink-faint ring-inset" label="Missed" />
            <Legend className="ring-2 ring-coral ring-inset" label="Today" />
          </div>
        </motion.div>

        <motion.div variants={riseIn} className="mt-4 rounded-3xl bg-navy p-4 px-5 text-white shadow-raised">
          <div className="text-[11px] font-semibold tracking-[0.15em] text-white/65 uppercase">Your voice this month</div>
          <FriendlyLine now={now} />
          <p className="mt-1 text-sm text-white/75">Nice and steady. Keep your daily habit going.</p>
        </motion.div>

        <div className="flex-1" />
        <PrototypeFooter className="mt-6 text-center" />
      </motion.div>
    </PhoneFrame>
  );
}

/** Month a week belongs to (by its Sunday), in the fixed three-letter form used across the app (D40: "Sep"). */
const monthOfWeek = (week: Date[]) => formatDay(week[week.length - 1].toISOString()).split(' ')[1];

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}

/** A calm line with no units and no numbers: patients never see scores (brief §4.5). */
function FriendlyLine({ now }: { now: Date }) {
  const reduced = useReducedMotion();
  const W = 320;
  const H = 90;
  const values = useMemo(() => {
    const rng = createRng(startOfDay(addDays(now, -30)).getTime() % 100000);
    let v = 0.55;
    return Array.from({ length: 30 }, () => (v = Math.max(0.35, Math.min(0.75, v + rng.gauss() * 0.03))));
  }, [now]);
  const x = linear(0, values.length - 1, 6, W - 8);
  const y = linear(0, 1, H - 6, 6);
  const pts = values.map((v, i) => [x(i), y(v)] as [number, number]);
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 block h-[90px] w-full" preserveAspectRatio="none" aria-hidden>
      <rect x={0} y={y(0.68)} width={W} height={y(0.42) - y(0.68)} rx={8} fill="rgba(47,155,203,0.14)" />
      <motion.path
        d={smoothPath(pts, 0.2)}
        fill="none"
        stroke="var(--color-coral)"
        strokeWidth={3}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        initial={reduced ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.5, duration: 1.3, ease: [0.65, 0, 0.35, 1] }}
      />
      <motion.circle
        cx={last[0]}
        cy={last[1]}
        r={5}
        fill="var(--color-coral)"
        initial={reduced ? false : { scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1.8, type: 'spring', stiffness: 500, damping: 14 }}
      />
    </svg>
  );
}
