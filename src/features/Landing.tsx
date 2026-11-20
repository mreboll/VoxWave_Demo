import { motion } from 'motion/react';
import { Link } from 'react-router';
import { ArrowRight, LayoutDashboard, Smartphone } from 'lucide-react';
import { LogoAnimation } from '../components/LogoAnimation';
import { IdleWave } from '../components/IdleWave';
import { PrototypeFooter } from '../components/PrototypeFooter';
import { ProjectLinks } from '../components/ProjectLinks';
import { riseIn, springSoft, staggerContainer } from '../design/motion';

const isPhone = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches;

/**
 * The wave fades out around the logo, so its lines run up to the symbol and never across it. The gap is in
 * pixels from the centre, so it holds at any window width. Laptop: the logo is 92 px tall (about 235 px wide)
 * and the wave fades over 170 px. Phone: the 60 px logo (about 155 px wide) leaves little room on either
 * side, so the gap hugs the symbol and the fade is short.
 */
const waveMask = (clear: number, solid: number) =>
  `linear-gradient(90deg, #000 0, #000 calc(50% - ${solid}px), transparent calc(50% - ${clear}px), transparent calc(50% + ${clear}px), #000 calc(50% + ${solid}px), #000 100%)`;
const WAVE_MASK_LAPTOP = waveMask(150, 320);
const WAVE_MASK_PHONE = waveMask(86, 124);

export function Landing() {
  // On a phone the patient app is the primary CTA; on a laptop both are shown side by side.
  const phone = isPhone();
  const logoSize = phone ? 60 : 92;
  const waveMask = phone ? WAVE_MASK_PHONE : WAVE_MASK_LAPTOP;

  return (
    <main className="relative flex min-h-dvh flex-col items-center overflow-hidden px-6 pt-10 pb-14">
      {/* Repositories and paper sit at the top, above the hero (D115). The top padding leaves room for the
          demo panel's reminders, which are fixed at the top centre. */}
      <ProjectLinks className="relative z-10" />

      <motion.div
        className="relative z-10 flex w-full max-w-5xl flex-1 flex-col items-center justify-center py-8 text-center 2xl:max-w-7xl"
        variants={staggerContainer(1.4)}
        initial="hidden"
        animate="show"
      >
        {/* The voice wave is the hero and never runs behind the text. It crosses the whole page at the height
            of the symbol (itself a wave) and stops short of it on both sides, on a laptop and on a phone. */}
        <div className="relative mb-6 flex w-full justify-center sm:mb-12">
          <motion.div
            aria-hidden
            className="pointer-events-none absolute left-1/2 w-screen -translate-x-1/2 -translate-y-1/2"
            style={{ top: logoSize / 2, maskImage: waveMask, WebkitMaskImage: waveMask }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ ...springSoft, delay: 0.9 }}
          >
            <IdleWave height={phone ? 120 : 240} amplitude={phone ? 0.42 : 0.38} />
          </motion.div>
          <LogoAnimation size={logoSize} layout="stacked" />
        </div>

        <motion.h1
          variants={riseIn}
          className="font-display text-[30px] leading-[1.08] font-bold tracking-[-0.035em] text-balance text-navy sm:text-[clamp(34px,3.8vw,44px)] sm:leading-[1.06] 2xl:text-[56px]"
        >
          {/* "check-in" and "Parkinson's —" never split across lines (the dash never starts a line). */}
          A daily voice <span className="whitespace-nowrap">check-in</span> for <span className="whitespace-nowrap">Parkinson's —</span>{' '}
          {/* Its own line from 640 px up: one line of ink, one of coral. */}
          <span className="text-coral-strong sm:block">between visits, someone is listening.</span>
        </motion.h1>

        <motion.p variants={riseIn} className="mt-4 text-[15px] text-ink-muted sm:mt-5 sm:text-lg 2xl:text-xl">
          Every day. 3 minutes. We measure; doctors decide.
        </motion.p>

        <div className="mt-7 flex w-full flex-col items-stretch gap-3 sm:mt-8 sm:w-auto sm:flex-row sm:items-center">
          <CtaLink to="/patient" primary icon={<Smartphone size={17} />}>
            Try the patient app
          </CtaLink>
          <CtaLink to="/clinic" primary={false} icon={<LayoutDashboard size={17} />}>
            Open the clinician dashboard
          </CtaLink>
        </div>
      </motion.div>

      <PrototypeFooter className="absolute bottom-5 z-10" />
    </main>
  );
}

function CtaLink({
  to,
  primary,
  icon,
  children,
}: {
  to: string;
  primary: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    // Each button is its own step of the staggered entrance.
    <motion.div variants={riseIn} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
      <Link
        to={to}
        className={`btn group flex items-center justify-center gap-2.5 rounded-full px-6 py-3 text-[15px] font-semibold sm:px-6 sm:py-3.5 ${
          primary ? 'bg-coral text-on-coral shadow-action' : 'bg-card text-navy shadow-card ring-1 ring-ink-faint ring-inset'
        }`}
      >
        {icon}
        {children}
        <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
      </Link>
    </motion.div>
  );
}
