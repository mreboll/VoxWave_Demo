import { motion } from 'motion/react';
import { Link } from 'react-router';
import { ArrowRight, LayoutDashboard, Smartphone } from 'lucide-react';
import { LogoAnimation } from '../components/LogoAnimation';
import { IdleWave } from '../components/IdleWave';
import { PrototypeFooter } from '../components/PrototypeFooter';
import { riseIn, springSoft, staggerContainer } from '../design/motion';

const isPhone = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches;

/**
 * Laptop: the wave fades out around the logo, so its lines run up to the symbol and never across it. The gap
 * is in pixels from the centre (the logo is 92 px tall, about 230 px wide), so it holds at any window width.
 */
const WAVE_MASK =
  'linear-gradient(90deg, #000 0, #000 calc(50% - 320px), transparent calc(50% - 150px), transparent calc(50% + 150px), #000 calc(50% + 320px), #000 100%)';

export function Landing() {
  // On a phone the patient app is the primary CTA; on a laptop both are shown side by side.
  const phone = isPhone();
  const logoSize = phone ? 60 : 92;

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-16">
      <motion.div
        className="relative z-10 flex w-full max-w-5xl flex-col items-center text-center 2xl:max-w-7xl"
        variants={staggerContainer(1.4)}
        initial="hidden"
        animate="show"
      >
        {/* The voice wave is the hero and never runs behind the text. On a laptop it crosses the whole page at
            the height of the symbol (itself a wave) and stops short of it on both sides; on a phone there is
            no room beside the logo, so it runs edge to edge just under it. */}
        <div className="relative flex w-full justify-center sm:mb-12">
          {!phone && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute left-1/2 w-screen -translate-x-1/2 -translate-y-1/2"
              style={{ top: logoSize / 2, maskImage: WAVE_MASK, WebkitMaskImage: WAVE_MASK }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ ...springSoft, delay: 0.9 }}
            >
              <IdleWave height={240} amplitude={0.38} />
            </motion.div>
          )}
          <LogoAnimation size={logoSize} layout="stacked" />
        </div>
        {phone && (
          <motion.div
            aria-hidden
            className="pointer-events-none my-3 w-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ ...springSoft, delay: 0.9 }}
          >
            <IdleWave height={72} amplitude={0.44} />
          </motion.div>
        )}

        <motion.h1
          variants={riseIn}
          className="font-display text-[34px] leading-[1.08] font-bold tracking-[-0.035em] text-balance text-navy sm:text-[clamp(38px,4.5vw,52px)] sm:leading-[1.06] 2xl:text-[64px]"
        >
          {/* "check-in" and "Parkinson's —" never split across lines (the dash never starts a line). */}
          A daily voice <span className="whitespace-nowrap">check-in</span> for <span className="whitespace-nowrap">Parkinson's —</span>{' '}
          {/* Its own line from 640 px up: one line of ink, one of coral. */}
          <span className="text-coral-strong sm:block">between visits, someone is listening.</span>
        </motion.h1>

        <motion.p variants={riseIn} className="mt-5 text-base text-ink-muted sm:mt-6 sm:text-xl 2xl:text-2xl">
          Every day. 3 minutes. We measure; doctors decide.
        </motion.p>

        <div className="mt-9 flex w-full flex-col items-stretch gap-3 sm:mt-10 sm:w-auto sm:flex-row sm:items-center">
          <CtaLink to="/patient" primary icon={<Smartphone size={18} />}>
            Try the patient app
          </CtaLink>
          <CtaLink to="/clinic" primary={false} icon={<LayoutDashboard size={18} />}>
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
        className={`btn group flex items-center justify-center gap-2.5 rounded-full px-6 py-3.5 text-[15px] font-semibold sm:px-7 sm:py-4 sm:text-base ${
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
