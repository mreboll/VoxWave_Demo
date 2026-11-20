import { useEffect, useRef, useState } from 'react';
import { animate } from 'motion/react';
import { useReducedMotion } from '../design/useReducedMotion';

/** Counts up from 0 to `value` the first time it appears, then follows changes (brief §4.4). */
export function useCountUp(value: number, { duration = 1.1, delay = 0 } = {}) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(reduced ? value : 0);
  const from = useRef(reduced ? value : 0);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      from.current = value;
      return;
    }
    const controls = animate(from.current, value, {
      duration,
      delay,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    });
    from.current = value;
    return () => controls.stop();
  }, [value, duration, delay, reduced]);

  return display;
}

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  suffix?: string;
  delay?: number;
  className?: string;
}

export function AnimatedNumber({ value, decimals = 0, suffix = '', delay = 0, className = '' }: AnimatedNumberProps) {
  const v = useCountUp(value, { delay });
  return (
    <span className={`tabular-nums ${className}`}>
      {v.toFixed(decimals)}
      {suffix}
    </span>
  );
}
