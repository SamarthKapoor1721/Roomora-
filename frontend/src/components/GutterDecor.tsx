import { Icon, type IconName } from './Icon';

/**
 * Decorative housing icons scattered through the empty page gutters on wide
 * screens. Purely ornamental: pointer-events-none, aria-hidden, and held
 * still for anyone with prefers-reduced-motion (see index.css). Hidden below
 * xl, where there are no real gutters to fill.
 *
 * Each column is exactly as wide as the gutter (half of whatever is left
 * after the 72rem content column). Icons are placed at varying horizontal
 * positions (`left` is a % of the gutter width) and given a static tilt so
 * they read as a scattered field rather than a single centred line. The
 * column is NOT clipped, so drift + rotation never crop them.
 */

type Blob = {
  icon: IconName;
  top: string;
  left: string; // % across the gutter (0 = outer edge, 100 = content edge)
  tilt: number; // static rotation in degrees
  size: number;
  drift: number; // seconds for one up/down float
  spin: number; // seconds for one full rotation
  delay: number;
  opacity: number;
};

const LEFT: Blob[] = [
  { icon: 'home', top: '1%', left: '58%', tilt: -12, size: 42, drift: 13, spin: 64, delay: 0, opacity: 0.4 },
  { icon: 'mapPin', top: '9%', left: '22%', tilt: 9, size: 24, drift: 9, spin: 38, delay: 1.4, opacity: 0.3 },
  { icon: 'building', top: '18%', left: '70%', tilt: 6, size: 34, drift: 17, spin: 82, delay: 2.5, opacity: 0.32 },
  { icon: 'key', top: '27%', left: '34%', tilt: -20, size: 26, drift: 11, spin: 46, delay: 1, opacity: 0.34 },
  { icon: 'bed', top: '36%', left: '62%', tilt: 4, size: 32, drift: 14, spin: 56, delay: 3.2, opacity: 0.3 },
  { icon: 'plant', top: '45%', left: '18%', tilt: -6, size: 26, drift: 13, spin: 58, delay: 4.5, opacity: 0.3 },
  { icon: 'home', top: '54%', left: '52%', tilt: 14, size: 36, drift: 15, spin: 72, delay: 3.5, opacity: 0.28 },
  { icon: 'sofa', top: '63%', left: '28%', tilt: -8, size: 30, drift: 16, spin: 66, delay: 0.6, opacity: 0.3 },
  { icon: 'building', top: '72%', left: '66%', tilt: 10, size: 30, drift: 19, spin: 90, delay: 1.8, opacity: 0.32 },
  { icon: 'door', top: '81%', left: '24%', tilt: -14, size: 26, drift: 12, spin: 50, delay: 2.8, opacity: 0.3 },
  { icon: 'lamp', top: '90%', left: '56%', tilt: 5, size: 24, drift: 11, spin: 44, delay: 2.2, opacity: 0.28 },
  { icon: 'key', top: '97%', left: '30%', tilt: -18, size: 22, drift: 10, spin: 40, delay: 0.9, opacity: 0.28 },
];

const RIGHT: Blob[] = [
  { icon: 'building', top: '2%', left: '30%', tilt: -8, size: 38, drift: 16, spin: 76, delay: 1.5, opacity: 0.36 },
  { icon: 'plant', top: '10%', left: '68%', tilt: 12, size: 26, drift: 12, spin: 54, delay: 0, opacity: 0.3 },
  { icon: 'home', top: '19%', left: '38%', tilt: 15, size: 40, drift: 14, spin: 66, delay: 2, opacity: 0.4 },
  { icon: 'mapPin', top: '28%', left: '74%', tilt: -10, size: 22, drift: 9, spin: 36, delay: 0.4, opacity: 0.3 },
  { icon: 'lamp', top: '37%', left: '30%', tilt: 7, size: 26, drift: 10, spin: 42, delay: 3.4, opacity: 0.3 },
  { icon: 'door', top: '46%', left: '64%', tilt: -16, size: 28, drift: 13, spin: 52, delay: 1.1, opacity: 0.3 },
  { icon: 'building', top: '55%', left: '34%', tilt: 9, size: 32, drift: 18, spin: 92, delay: 4, opacity: 0.3 },
  { icon: 'bed', top: '64%', left: '70%', tilt: -5, size: 32, drift: 15, spin: 60, delay: 0.8, opacity: 0.3 },
  { icon: 'home', top: '73%', left: '26%', tilt: 13, size: 34, drift: 15, spin: 70, delay: 2.6, opacity: 0.32 },
  { icon: 'fence', top: '82%', left: '60%', tilt: -7, size: 30, drift: 17, spin: 78, delay: 1.9, opacity: 0.3 },
  { icon: 'sofa', top: '90%', left: '32%', tilt: 6, size: 28, drift: 16, spin: 64, delay: 3.1, opacity: 0.3 },
  { icon: 'key', top: '97%', left: '66%', tilt: -12, size: 24, drift: 11, spin: 44, delay: 0.5, opacity: 0.28 },
];

function Column({ side, blobs }: { side: 'left' | 'right'; blobs: Blob[] }) {
  return (
    <div
      aria-hidden="true"
      className={`gutter-decor pointer-events-none fixed bottom-0 top-[6.75rem] z-0 hidden w-[calc((100vw-72rem)/2)] xl:block ${
        side === 'left' ? 'left-0' : 'right-0'
      }`}
    >
      {blobs.map((b, i) => (
        <span
          key={i}
          className="absolute block -translate-x-1/2"
          style={{ top: b.top, left: b.left, rotate: `${b.tilt}deg` }}
        >
          <span
            className="gutter-float block text-brand-700"
            style={{
              opacity: b.opacity,
              animationDuration: `${b.drift}s`,
              animationDelay: `${b.delay}s`,
            }}
          >
            <span
              className="gutter-spin block"
              style={{ animationDuration: `${b.spin}s`, animationDelay: `${b.delay}s` }}
            >
              <Icon name={b.icon} size={b.size} strokeWidth={1.25} />
            </span>
          </span>
        </span>
      ))}
    </div>
  );
}

export default function GutterDecor() {
  return (
    <>
      <Column side="left" blobs={LEFT} />
      <Column side="right" blobs={RIGHT} />
    </>
  );
}
