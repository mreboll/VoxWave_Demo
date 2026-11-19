import type { Transition, Variants } from 'motion/react';

/** Brief §4.4: springs with a slight overshoot, never linear tweens. */
export const spring: Transition = { type: 'spring', stiffness: 260, damping: 22, mass: 0.9 };
export const springSoft: Transition = { type: 'spring', stiffness: 140, damping: 20 };
export const springSnappy: Transition = { type: 'spring', stiffness: 420, damping: 28 };

/** Stagger per item, inside the 40–70 ms range of the brief. */
export const STAGGER = 0.055;

export const staggerContainer = (delayChildren = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: STAGGER, delayChildren } },
});

export const riseIn: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: spring },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.4 } },
};

export const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: springSoft },
  exit: { opacity: 0, y: -8, transition: { duration: 0.18 } },
};
