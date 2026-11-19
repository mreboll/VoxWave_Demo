import { AnimatePresence, motion } from 'motion/react';
import { CalendarCheck, CalendarPlus } from 'lucide-react';
import { useAppStore } from '../../data/store';
import { formatSessionTime } from '../../data/dates';

/** "Schedule a visit" with a fake confirmation (brief §7.3). Stored per patient in this browser. */
export function ScheduleVisitButton({ patientId, tone = 'light' }: { patientId: string; tone?: 'light' | 'coral' }) {
  const scheduledAt = useAppStore((s) => s.scheduledVisits[patientId]);
  const schedule = useAppStore((s) => s.scheduleVisit);
  const base =
    tone === 'coral'
      ? 'bg-white text-coral-ink'
      : 'bg-card text-navy ring-1 ring-ink-faint ring-inset';

  return (
    <motion.button
      type="button"
      layout
      whileTap={scheduledAt ? undefined : { scale: 0.96 }}
      disabled={Boolean(scheduledAt)}
      onClick={() => schedule(patientId)}
      aria-label={scheduledAt ? 'Visit requested' : 'Schedule a visit'}
      className={`btn inline-flex items-center gap-2 overflow-hidden rounded-full px-4 py-2 text-sm font-semibold disabled:cursor-default ${
        scheduledAt ? 'bg-stable-ink text-white ring-0' : base
      }`}
      title={scheduledAt ? `Requested ${formatSessionTime(scheduledAt)}` : undefined}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {scheduledAt ? (
          <motion.span
            key="done"
            className="inline-flex items-center gap-2"
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
          >
            <motion.span initial={{ rotate: -30, scale: 0.4 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 12, delay: 0.05 }}>
              <CalendarCheck size={16} />
            </motion.span>
            Visit requested
          </motion.span>
        ) : (
          <motion.span key="todo" className="inline-flex items-center gap-2" exit={{ y: -14, opacity: 0 }}>
            <CalendarPlus size={16} />
            Schedule a visit
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
