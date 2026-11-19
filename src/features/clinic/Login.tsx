import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { LogoAnimation } from '../../components/LogoAnimation';
import { PrototypeFooter } from '../../components/PrototypeFooter';
import { useAppStore } from '../../data/store';
import { CLINICIAN } from '../../data/seed';
import { riseIn, staggerContainer } from '../../design/motion';

/** Fake sign-in: one button, no fields (brief §7.1). */
export function Login() {
  const navigate = useNavigate();
  // Back to where the guard sent us from (keeps ?demo=1), else the dashboard (D96).
  const { state, search } = useLocation() as { state: { from?: string } | null; search: string };
  const target = state?.from ?? `/clinic/dashboard${search}`;
  const signedIn = useAppStore((s) => s.clinicSignedIn);
  const signIn = useAppStore((s) => s.setClinicSignedIn);
  const [leaving, setLeaving] = useState(false);

  if (signedIn && !leaving) return <Navigate to={target} replace />;

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-6">
      <motion.div
        className="flex flex-col items-center text-center"
        variants={staggerContainer(1.2)}
        initial="hidden"
        animate={leaving ? { opacity: 0, scale: 0.97, filter: 'blur(4px)', transition: { duration: 0.35 } } : 'show'}
        onAnimationComplete={() => leaving && navigate(target)}
      >
        <LogoAnimation size={64} layout="stacked" />
        <motion.p variants={riseIn} className="label mt-10">
          {CLINICIAN.clinic}
        </motion.p>
        <motion.h1 variants={riseIn} className="mt-2 text-3xl font-bold tracking-tight text-navy sm:text-4xl">
          Clinician dashboard
        </motion.h1>
        <motion.p variants={riseIn} className="mt-3 max-w-sm text-ink-muted">
          See how every patient's voice is doing between visits. We measure; doctors decide.
        </motion.p>
        <motion.div variants={riseIn} className="mt-9">
          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setLeaving(true);
              signIn(true);
            }}
            className="group flex items-center gap-3 rounded-full bg-navy py-2 pr-6 pl-2 text-[15px] font-semibold text-white shadow-[0_12px_28px_-14px_rgba(9,38,52,0.8)]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 font-display text-xs font-bold">EL</span>
            Sign in as {CLINICIAN.name}
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </motion.button>
        </motion.div>
      </motion.div>
      <PrototypeFooter className="absolute bottom-5" />
    </main>
  );
}
