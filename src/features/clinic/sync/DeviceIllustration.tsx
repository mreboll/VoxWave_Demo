import { useMemo } from 'react';
import { motion } from 'motion/react';
import { useReducedMotion } from '../../../design/useReducedMotion';
import { Monitor } from 'lucide-react';
import { useElementWidth } from '../../../components/useElementWidth';

/** Stage geometry shared by the illustration and the packets flowing along the cable. */
export const STAGE = { w: 560, h: 170 };

type Point = [number, number];
// The cable: from the plug on the device to the plug on the computer, as two cubic Béziers.
const CABLE: Array<[Point, Point, Point, Point]> = [
  [[180, 112], [252, 112], [262, 60], [330, 70]],
  [[330, 70], [398, 80], [404, 112], [438, 104]],
];
export const CABLE_PATH = `M ${CABLE[0][0].join(' ')} ${CABLE.map(([, c1, c2, p]) => `C ${c1.join(' ')}, ${c2.join(' ')}, ${p.join(' ')}`).join(' ')}`;

const PACKETS = 7;
const PACKET_SIZE = 8;
const SAMPLES_PER_CURVE = 14;

function bezier([p0, c1, c2, p1]: [Point, Point, Point, Point], t: number): Point {
  const u = 1 - t;
  const at = (i: 0 | 1) => u * u * u * p0[i] + 3 * u * u * t * c1[i] + 3 * u * t * t * c2[i] + t * t * t * p1[i];
  return [at(0), at(1)];
}

/** Points along the cable, so the packets can follow it with x/y transforms (no offset-path). */
function cablePoints(): Point[] {
  const points: Point[] = [];
  CABLE.forEach((curve, c) => {
    for (let i = c === 0 ? 0 : 1; i <= SAMPLES_PER_CURVE; i++) points.push(bezier(curve, i / SAMPLES_PER_CURVE));
  });
  return points;
}

interface DeviceIllustrationProps {
  /** Device screen + pulse on (connected / syncing). */
  lit: boolean;
  /** Text on the device's small OLED. */
  screen: string;
  /** Packets flowing from the device to the computer. */
  flowing: boolean;
}

/**
 * The VoxWave home device (white case, small OLED, one coral button — App. A) plugged into the clinic computer.
 * Data packets (coral/teal) travel along the cable while syncing (brief §8.3).
 */
export function DeviceIllustration(props: DeviceIllustrationProps) {
  // Drawn at a fixed size (the packets follow a pixel path) and scaled down as a whole on narrow screens.
  const [ref, width] = useElementWidth<HTMLDivElement>(STAGE.w);
  const scale = Math.min(1, width / STAGE.w);
  return (
    <div ref={ref} className="w-full" style={{ height: STAGE.h * scale }}>
      <div style={{ width: STAGE.w, transform: `scale(${scale})`, transformOrigin: '0 0', marginLeft: Math.max(0, (width - STAGE.w) / 2) }}>
        <Stage {...props} />
      </div>
    </div>
  );
}

function Stage({ lit, screen, flowing }: DeviceIllustrationProps) {
  const reduced = useReducedMotion();
  const track = useMemo(() => {
    const points = cablePoints();
    return {
      x: points.map(([x]) => x - PACKET_SIZE / 2),
      y: points.map(([, y]) => y - PACKET_SIZE / 2),
      // Fade in over the first step and out over the last one.
      opacity: points.map((_, i) => (i === 0 || i === points.length - 1 ? 0 : 1)),
    };
  }, []);

  return (
    <div className="relative" style={{ width: STAGE.w, height: STAGE.h }}>
      <svg viewBox={`0 0 ${STAGE.w} ${STAGE.h}`} className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        {/* The desk both things sit on */}
        <line x1={8} x2={STAGE.w - 8} y1={152} y2={152} stroke="var(--color-ink-faint)" strokeWidth={1} strokeLinecap="round" />

        {/* Cable: sheath, then the data line inside it */}
        <path d={CABLE_PATH} fill="none" stroke="var(--color-navy)" strokeOpacity={0.2} strokeWidth={7} strokeLinecap="round" />
        <path
          d={CABLE_PATH}
          fill="none"
          stroke="var(--color-teal)"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeDasharray="3 7"
          opacity={lit ? 0.9 : 0.35}
        />

        {/* Device: white case */}
        <motion.g animate={lit && !reduced ? { y: [0, -2, 0] } : { y: 0 }} transition={{ duration: 2.4, repeat: lit && !reduced ? Infinity : 0 }}>
          {/* Connected: two coral outlines open out from the case and fade (no blur, no glow). */}
          {lit &&
            !reduced &&
            [0, 1].map((i) => (
              <motion.rect
                key={i}
                x={24}
                y={42}
                width={136}
                height={96}
                rx={22}
                fill="none"
                stroke="var(--color-coral)"
                strokeWidth={2}
                initial={{ opacity: 0, scale: 1 }}
                animate={{ opacity: [0.55, 0], scale: [1, 1.16] }}
                transition={{ duration: 1.8, delay: i * 0.9, repeat: Infinity, ease: 'easeOut' }}
              />
            ))}
          {/* Case with a lower lip for depth */}
          <rect x={24} y={47} width={136} height={96} rx={22} fill="var(--color-paper-shade)" stroke="var(--color-navy)" strokeOpacity={0.22} strokeWidth={1.5} />
          <rect x={24} y={42} width={136} height={96} rx={22} fill="var(--color-card)" stroke="var(--color-navy)" strokeOpacity={0.3} strokeWidth={1.5} />
          {/* OLED: bezel + glass */}
          <rect x={39} y={55} width={106} height={44} rx={9} fill="var(--color-navy)" />
          <rect x={43} y={59} width={98} height={36} rx={5.5} fill="var(--color-navy-deep)" stroke="rgba(244,248,250,0.14)" strokeWidth={1} />
          <motion.text
            key={screen}
            x={92}
            y={77}
            dy="0.35em"
            textAnchor="middle"
            fill={lit ? '#f4f8fa' : 'rgba(244,248,250,0.4)'}
            className="font-mono text-[10px] font-semibold tracking-wider"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {screen}
          </motion.text>
          {/* Microphone grille */}
          {[52, 59, 66].map((cx) => (
            <circle key={cx} cx={cx} cy={119} r={1.7} fill="var(--color-navy)" fillOpacity={0.35} />
          ))}
          {/* Coral arcade button: collar, body, cap */}
          <circle cx={92} cy={119} r={15} fill="var(--color-navy)" fillOpacity={0.1} />
          <circle cx={92} cy={120} r={11.5} fill="var(--color-coral-ink)" />
          <circle cx={92} cy={117.5} r={11.5} fill="var(--color-coral)" />
          <path d="M 85 113.5 A 8.5 8.5 0 0 1 99 113.5" fill="none" stroke="#fff" strokeOpacity={0.45} strokeWidth={1.5} strokeLinecap="round" />
          {/* Status LED */}
          <circle cx={126} cy={119} r={3.25} fill={lit ? 'var(--color-coral)' : 'var(--color-navy)'} fillOpacity={lit ? 1 : 0.2} />
          {lit && !reduced && (
            <motion.circle
              cx={126}
              cy={119}
              r={3.25}
              fill="var(--color-coral)"
              initial={{ opacity: 0.6, scale: 1 }}
              animate={{ opacity: [0.6, 0], scale: [1, 2.6] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
          {/* USB-C port and the cable's plug */}
          <rect x={155} y={105} width={9} height={14} rx={3.5} fill="var(--color-navy)" fillOpacity={0.55} />
          <rect x={162} y={104} width={18} height={16} rx={4.5} fill="var(--color-navy)" />
          <rect x={166} y={109} width={8} height={6} rx={1.5} fill="rgba(244,248,250,0.25)" />
        </motion.g>

        {/* Plug on the computer's side */}
        <rect x={436} y={96} width={18} height={16} rx={4.5} fill="var(--color-navy)" />
      </svg>

      {/* Clinic computer */}
      <div
        className={`absolute flex h-[92px] w-[98px] flex-col items-center justify-center rounded-2xl ring-1 ring-inset ${
          lit ? 'bg-navy text-white ring-navy' : 'bg-card text-navy shadow-card ring-ink-faint'
        }`}
        style={{ left: 452, top: 58 }}
      >
        <Monitor size={30} strokeWidth={1.6} />
        <span className="mt-1 text-[10px] font-semibold tracking-wide opacity-75">VoxWave clinic</span>
      </div>

      {/* Data packets: small squares that follow the cable with x/y transforms */}
      {flowing &&
        !reduced &&
        Array.from({ length: PACKETS }, (_, i) => (
          <motion.span
            key={i}
            className={`absolute top-0 left-0 rounded-[2.5px] ${i % 2 ? 'bg-teal-bright' : 'bg-coral'}`}
            style={{ width: PACKET_SIZE, height: PACKET_SIZE }}
            initial={{ x: track.x[0], y: track.y[0], opacity: 0 }}
            animate={{ x: track.x, y: track.y, opacity: track.opacity }}
            transition={{ duration: 1.4, delay: i * 0.2, repeat: Infinity, ease: 'linear' }}
          />
        ))}
    </div>
  );
}
