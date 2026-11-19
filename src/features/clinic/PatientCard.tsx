import { Link } from 'react-router';
import { motion } from 'motion/react';
import { Flame, Radio, Smartphone } from 'lucide-react';
import { Sparkline } from '../../components/charts/Sparkline';
import { StatusChip } from '../../components/StatusChip';
import { formatSessionTime } from '../../data/dates';
import type { Patient } from '../../data/types';
import { riseIn } from '../../design/motion';
import { useElementWidth } from '../../components/useElementWidth';

/** Dashboard card (brief §7.2). Shares `layoutId` with the patient detail header so it expands into it. */
export function PatientCard({
  patient: p,
  index,
  highlighted = false,
  justNow = false,
}: {
  patient: Patient;
  index: number;
  highlighted?: boolean;
  /** Show the "Just now" badge (only for 10 minutes after the arrival). */
  justNow?: boolean;
}) {
  const alert = p.status === 'alert';
  // The trend spans the card: drawn at the card's real width, not stretched.
  const [trendRef, trendWidth] = useElementWidth<HTMLDivElement>(220);
  return (
    <motion.div variants={riseIn} layout="position" transition={{ layout: { type: 'spring', stiffness: 300, damping: 30 } }}>
      <Link to={`/clinic/patients/${p.id}`} className="block focus-visible:rounded-2xl">
        <motion.div
          layoutId={`patient-card-${p.id}`}
          whileHover={{ y: -3 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className={`group surface relative flex h-full flex-col rounded-2xl p-4 ${
            alert || highlighted ? 'ring-coral/60' : 'hover:ring-navy/25'
          }`}
        >
          {highlighted && (
            // Soft coral pulse when a session just arrived (brief §7.2), fading to the steady ring: a coral
            // outline that grows and fades twice (transform + opacity only).
            <motion.span
              className="pointer-events-none absolute -inset-px rounded-2xl ring-2 ring-coral"
              initial={{ opacity: 0, scale: 1 }}
              animate={{ opacity: [0.9, 0, 0.8, 0], scale: [1, 1.045, 1, 1.045] }}
              transition={{ duration: 2.4, ease: 'easeOut' }}
            />
          )}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <motion.div layoutId={`patient-name-${p.id}`} className="truncate font-display text-[15px] font-semibold text-navy">
                {p.name}
                {justNow && (
                  <span className="ml-2 rounded-full bg-coral px-1.5 py-0.5 align-middle font-sans text-[10px] font-bold tracking-wide text-on-coral uppercase">
                    Just now
                  </span>
                )}
              </motion.div>
              <div className="mt-1 text-xs text-ink-muted tabular-nums">
                {p.id}
                {p.age !== null && ` · ${p.age}`}
              </div>
            </div>
            <StatusChip status={p.status} />
          </div>
          <div ref={trendRef} className="mt-4 mb-3.5">
            <Sparkline patient={p} width={trendWidth} height={44} delay={0.25 + Math.min(index, 12) * 0.05} />
          </div>
          {/* Channel + last session on the left, streak on the right: the same place on every card. */}
          <div className="mt-auto flex items-center justify-between border-t border-ink-hairline pt-3 text-xs text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              {p.channel === 'device' ? <Radio size={13} className="text-navy" /> : <Smartphone size={13} />}
              {p.channel === 'device' && p.lastSyncAt
                ? `Synced ${formatSessionTime(p.lastSyncAt)}`
                : p.lastSessionAt
                  ? formatSessionTime(p.lastSessionAt)
                  : 'No sessions yet'}
            </span>
            <span className="inline-flex items-center gap-1 tabular-nums" title="Streak">
              <Flame size={13} className={p.streak > 0 ? 'text-coral' : ''} />
              {p.streak}
            </span>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}
