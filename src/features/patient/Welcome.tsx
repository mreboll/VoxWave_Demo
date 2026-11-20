import { useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Check } from 'lucide-react';
import { LogoAnimation } from '../../components/LogoAnimation';
import { PrototypeFooter } from '../../components/PrototypeFooter';
import { useVisitorProfile, useVisitorStore } from '../../data/visitor';
import { riseIn, staggerContainer } from '../../design/motion';
import { PhoneFrame } from './PatientShell';

/** Welcome and consent for this browser's trial profile. */
export function Welcome() {
  const navigate = useNavigate();
  const existing = useVisitorProfile();
  const start = useVisitorStore((s) => s.start);
  const [name, setName] = useState(existing?.name ?? '');
  const [agreed, setAgreed] = useState(false);

  return (
    <PhoneFrame>
      <motion.form
        className="flex flex-1 flex-col px-6 pt-14 pb-6"
        variants={staggerContainer(1.3)}
        initial="hidden"
        animate="show"
        onSubmit={(e) => {
          e.preventDefault();
          if (!agreed) return;
          start(name);
          navigate('/patient/home');
        }}
      >
        <div className="flex justify-center">
          <LogoAnimation size={52} layout="stacked" />
        </div>

        <motion.h1 variants={riseIn} className="mt-10 font-display text-[30px] leading-tight font-bold tracking-tight text-navy">
          Hi, I'm VoxWave.
        </motion.h1>
        <motion.p variants={riseIn} className="mt-3 text-[16px] leading-relaxed text-ink-muted">
          Try a 3-minute voice session. Your trial profile and progress are saved in this browser.
        </motion.p>

        <motion.label variants={riseIn} className="mt-8 block">
          <span className="label">Your first name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex"
            autoComplete="given-name"
            maxLength={24}
            className="mt-2 w-full rounded-2xl bg-card px-4 py-3.5 text-[17px] text-navy ring-1 ring-ink-faint ring-inset outline-none placeholder:text-ink-muted/60 focus:ring-2 focus:ring-navy/40"
          />
        </motion.label>

        <motion.button
          variants={riseIn}
          type="button"
          onClick={() => setAgreed((a) => !a)}
          role="checkbox"
          aria-checked={agreed}
          aria-label="I agree to record short voice sessions."
          className={`mt-4 flex items-start gap-3 rounded-2xl p-4 text-left ring-1 ring-inset transition-colors ${
            agreed ? 'bg-teal/8 ring-teal/40' : 'bg-card ring-ink-faint'
          }`}
        >
          <span
            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ring-2 ring-inset transition-colors ${
              agreed ? 'bg-teal ring-teal' : 'ring-ink-soft/40'
            }`}
          >
            <AnimatePresence>
              {agreed && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 600, damping: 20 }}>
                  <Check size={16} strokeWidth={3} className="text-white" />
                </motion.span>
              )}
            </AnimatePresence>
          </span>
          <span className="self-center text-sm text-navy">
            I agree to record short voice sessions.
          </span>
        </motion.button>

        <div className="flex-1" />

        <motion.button
          variants={riseIn}
          type="submit"
          disabled={!agreed}
          whileTap={agreed ? { scale: 0.97 } : undefined}
          className="mt-8 flex items-center justify-center gap-2 rounded-full bg-coral py-4 text-[17px] font-semibold text-on-coral shadow-action transition-opacity disabled:opacity-40 disabled:shadow-none"
        >
          Start
          <ArrowRight size={18} />
        </motion.button>
        <PrototypeFooter className="mt-4 text-center" />
      </motion.form>
    </PhoneFrame>
  );
}
