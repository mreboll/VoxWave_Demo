import { useEffect } from 'react';
import { Link } from 'react-router';
import { create } from 'zustand';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, X } from 'lucide-react';

export interface ToastItem {
  id: number;
  title: string;
  body?: string;
  action?: { label: string; to: string };
  tone?: 'coral' | 'teal';
}

interface ToastState {
  toasts: ToastItem[];
  push: (t: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => set((s) => ({ toasts: [...s.toasts.slice(-2), { ...t, id: nextId++ }] })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

const LIFETIME_MS = 7000;

/** Bottom-right stack of toasts (clinic): clear of the header's "Sync VoxWave device" button (D75). */
export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div className="no-print pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[min(380px,calc(100vw-32px))] flex-col gap-2" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function Toast({ toast }: { toast: ToastItem }) {
  const dismiss = useToasts((s) => s.dismiss);
  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(toast.id), LIFETIME_MS);
    return () => window.clearTimeout(timer);
  }, [toast.id, dismiss]);
  const dot = toast.tone === 'teal' ? 'bg-teal-bright' : 'bg-coral';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      className="pointer-events-auto relative overflow-hidden rounded-2xl bg-navy p-4 pr-10 text-white shadow-[0_20px_40px_-18px_rgba(4,20,28,0.8)]"
      role="status"
    >
      <div className="flex items-start gap-3">
        <span className="relative mt-1.5 flex h-2.5 w-2.5 shrink-0">
          <span className={`absolute inset-0 animate-ping rounded-full opacity-70 ${dot}`} />
          <span className={`relative h-2.5 w-2.5 rounded-full ${dot}`} />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-semibold">{toast.title}</div>
          {toast.body && <div className="mt-0.5 text-[13px] text-white/70">{toast.body}</div>}
          {toast.action && (
            <Link
              to={toast.action.to}
              onClick={() => dismiss(toast.id)}
              className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-coral-soft hover:text-coral"
            >
              {toast.action.label}
              <ArrowRight size={13} />
            </Link>
          )}
        </div>
      </div>
      <button type="button" onClick={() => dismiss(toast.id)} className="absolute top-3 right-3 text-white/50 hover:text-white" aria-label="Dismiss">
        <X size={15} />
      </button>
      {/* Time left */}
      <motion.div
        className="absolute bottom-0 left-0 h-0.5 bg-white/25"
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: LIFETIME_MS / 1000, ease: 'linear' }}
      />
    </motion.div>
  );
}
