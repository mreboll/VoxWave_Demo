import { useId } from 'react';
import { motion } from 'motion/react';
import {
  GUIDE_WIDTH,
  SYMBOL_SHAPES,
  SYMBOL_VIEWBOX,
  WORDMARK_SHAPES,
  WORDMARK_VIEWBOX,
  viewBoxString,
} from './logoPaths';
import { INLINE_WORDMARK_RATIO, Wordmark } from './Logo';
import { spring } from '../design/motion';

interface LogoAnimationProps {
  /** Height of the symbol in px. */
  size?: number;
  withWordmark?: boolean;
  /** Seconds before the first stroke starts drawing. */
  delay?: number;
  /** "stacked" = wordmark under the symbol, as in the official logo; "inline" = side by side. */
  layout?: 'inline' | 'stacked';
  onComplete?: () => void;
}

const STROKE_DURATION = 0.7;
const STROKE_GAP = 0.18;
const LAST_STROKE = SYMBOL_SHAPES.length - 1;

/**
 * The three strokes of the official symbol draw themselves one after another, then the wordmark springs in
 * (brief §4.4, §5). Each filled shape is revealed by a wide mask stroke animated along its centre line.
 */
export function LogoAnimation({
  size = 96,
  withWordmark = true,
  delay = 0,
  layout = 'inline',
  onComplete,
}: LogoAnimationProps) {
  const uid = useId().replace(/:/g, '');
  const wordmarkDelay = delay + STROKE_GAP * LAST_STROKE + STROKE_DURATION * 0.8;
  const stacked = layout === 'stacked' && withWordmark;

  // Stacked uses the original file's layout: one viewBox spanning symbol and wordmark.
  const box = stacked
    ? {
        x: Math.min(SYMBOL_VIEWBOX.x, WORDMARK_VIEWBOX.x),
        y: SYMBOL_VIEWBOX.y,
        w: Math.max(SYMBOL_VIEWBOX.x + SYMBOL_VIEWBOX.w, WORDMARK_VIEWBOX.x + WORDMARK_VIEWBOX.w) -
          Math.min(SYMBOL_VIEWBOX.x, WORDMARK_VIEWBOX.x),
        h: WORDMARK_VIEWBOX.y + WORDMARK_VIEWBOX.h - SYMBOL_VIEWBOX.y,
      }
    : SYMBOL_VIEWBOX;
  const scale = size / SYMBOL_VIEWBOX.h;

  const symbol = (
    <motion.svg
      viewBox={viewBoxString(box)}
      width={box.w * scale}
      height={box.h * scale}
      initial={{ scale: 0.92, rotate: -3 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ ...spring, delay }}
      style={{ overflow: 'visible' }}
    >
      <defs>
        {SYMBOL_SHAPES.map((s) => (
          <mask
            key={s.id}
            id={`${uid}-${s.id}`}
            maskUnits="userSpaceOnUse"
            x={box.x - GUIDE_WIDTH}
            y={box.y - GUIDE_WIDTH}
            width={box.w + GUIDE_WIDTH * 2}
            height={box.h + GUIDE_WIDTH * 2}
          >
            <motion.path
              d={s.guide}
              fill="none"
              stroke="#fff"
              strokeWidth={GUIDE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                pathLength: { delay: delay + s.drawOrder * STROKE_GAP, duration: STROKE_DURATION, ease: [0.65, 0, 0.35, 1] },
                opacity: { delay: delay + s.drawOrder * STROKE_GAP, duration: 0.01 },
              }}
              onAnimationComplete={s.drawOrder === LAST_STROKE && !withWordmark ? onComplete : undefined}
            />
          </mask>
        ))}
      </defs>
      {SYMBOL_SHAPES.map((s) => (
        <path key={s.id} d={s.d} fill={s.color} mask={`url(#${uid}-${s.id})`} />
      ))}
      {stacked && (
        <motion.g
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: wordmarkDelay }}
          onAnimationComplete={onComplete}
        >
          {WORDMARK_SHAPES.map((w) => (
            <path key={w.id} d={w.d} fill={w.color} />
          ))}
        </motion.g>
      )}
    </motion.svg>
  );

  return (
    <div className="inline-flex items-center gap-3" role="img" aria-label="VoxWave">
      {symbol}
      {withWordmark && !stacked && (
        <motion.div
          initial={{ opacity: 0, x: -12, filter: 'blur(4px)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          transition={{ ...spring, delay: wordmarkDelay }}
          onAnimationComplete={onComplete}
        >
          <Wordmark height={size * INLINE_WORDMARK_RATIO} />
        </motion.div>
      )}
    </div>
  );
}
