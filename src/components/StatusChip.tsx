import type { Status } from '../data/types';

export const STATUS_LABEL: Record<Status, string> = {
  alert: 'Alert',
  watch: 'Watch',
  new: 'New',
  device: 'Device',
  stable: 'Stable',
};

/** Sort order on the dashboard (brief §7.2): Alert → Watch → New → Device → Stable. */
export const STATUS_ORDER: Record<Status, number> = { alert: 0, watch: 1, new: 2, device: 3, stable: 4 };

const STYLES: Record<Status, string> = {
  alert: 'bg-coral/12 text-coral-ink ring-coral/30',
  watch: 'bg-watch/14 text-watch-ink ring-watch/35',
  new: 'bg-teal/8 text-teal ring-teal/20',
  device: 'bg-navy/6 text-navy ring-navy/15',
  stable: 'bg-stable/10 text-stable-ink ring-stable/25',
};

const DOT: Record<Status, string> = {
  alert: 'bg-coral',
  watch: 'bg-watch',
  new: 'bg-teal',
  device: 'bg-navy',
  stable: 'bg-stable',
};

export function StatusChip({ status, className = '' }: { status: Status; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${STYLES[status]} ${className}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        {status === 'alert' && <span className="absolute inset-0 animate-ping rounded-full bg-coral opacity-60" />}
        <span className={`relative h-1.5 w-1.5 rounded-full ${DOT[status]}`} />
      </span>
      {STATUS_LABEL[status]}
    </span>
  );
}
