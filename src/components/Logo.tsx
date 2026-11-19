import { SYMBOL_SHAPES, SYMBOL_VIEWBOX, WORDMARK_SHAPES, WORDMARK_VIEWBOX, viewBoxString } from './logoPaths';

const SYMBOL_ASPECT = SYMBOL_VIEWBOX.w / SYMBOL_VIEWBOX.h;
const WORDMARK_ASPECT = WORDMARK_VIEWBOX.w / WORDMARK_VIEWBOX.h;
/** In the inline lockup the wordmark is this fraction of the symbol's height. */
export const INLINE_WORDMARK_RATIO = 0.5;

interface LogoProps {
  /** Height of the symbol in px (width follows its aspect ratio); the wordmark scales with it. */
  size?: number;
  withWordmark?: boolean;
  className?: string;
}

export function LogoSymbol({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox={viewBoxString(SYMBOL_VIEWBOX)}
      width={size * SYMBOL_ASPECT}
      height={size}
      className={className}
      aria-hidden
    >
      {SYMBOL_SHAPES.map((s) => (
        <path key={s.id} d={s.d} fill={s.color} />
      ))}
    </svg>
  );
}

/** "VoxWave" letters from the official logo; `height` in px. */
export function Wordmark({ height = 16 }: { height?: number }) {
  return (
    <svg viewBox={viewBoxString(WORDMARK_VIEWBOX)} width={height * WORDMARK_ASPECT} height={height} aria-hidden>
      {WORDMARK_SHAPES.map((s) => (
        <path key={s.id} d={s.d} fill={s.color} />
      ))}
    </svg>
  );
}

export function Logo({ size = 32, withWordmark = true, className = '' }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} aria-label="VoxWave" role="img">
      <LogoSymbol size={size} />
      {withWordmark && <Wordmark height={size * INLINE_WORDMARK_RATIO} />}
    </span>
  );
}
