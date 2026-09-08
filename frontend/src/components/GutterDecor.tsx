import { Icon, type IconName } from './Icon';

/**
 * Decorative housing icons that drift and rotate in the empty page gutters
 * on wide screens. Purely ornamental: pointer-events-none, aria-hidden, and
 * held still for anyone with prefers-reduced-motion (see index.css). Hidden
 * below xl, where there are no real gutters to fill.
 *
 * Each column is exactly as wide as the gutter (half of whatever is left
 * after the 72rem content column). Icons are centred in that column and
 * kept small enough to sit clear of both edges; the column is NOT clipped,
 * so rotation never crops them.
 */

type Blob = {
  icon: IconName;
  top: string;
  size: number;
  drift: number; // seconds for one up/down float
  spin: number; // seconds for one full rotation
  delay: number;
  opacity: number;
};

const LEFT: Blob[] = [
  { icon: 'home', top: '1%', size: 42, drift: 13, spin: 64, delay: 0, opacity: 0.4 },
  { icon: 'mapPin', top: '11%', size: 26, drift: 9, spin: 38, delay: 1.4, opacity: 0.3 },
  { icon: 'building', top: '20%', size: 36, drift: 17, spin: 82, delay: 2.5, opacity: 0.32 },
  { icon: 'key', top: '30%', size: 28, drift: 11, spin: 46, delay: 1, opacity: 0.34 },
  { icon: 'bed', top: '39%', size: 32, drift: 14, spin: 56, delay: 3.2, opacity: 0.3 },
  { icon: 'home', top: '49%', size: 38, drift: 15, spin: 72, delay: 3.5, opacity: 0.28 },
  { icon: 'sofa', top: '59%', size: 34, drift: 16, spin: 66, delay: 0.6, opacity: 0.3 },
  { icon: 'building', top: '69%', size: 30, drift: 19, spin: 90, delay: 1.8, opacity: 0.32 },
  { icon: 'door', top: '79%', size: 28, drift: 12, spin: 50, delay: 2.8, opacity: 0.3 },
  { icon: 'plant', top: '89%', size: 30, drift: 13, spin: 58, delay: 4.5, opacity: 0.3 },
  { icon: 'key', top: '98%', size: 24, drift: 10, spin: 40, delay: 2.2, opacity: 0.28 },
];

const RIGHT: Blob[] = [
  { icon: 'building', top: '2%', size: 40, drift: 16, spin: 76, delay: 1.5, opacity: 0.36 },
  { icon: 'plant', top: '12%', size: 28, drift: 12, spin: 54, delay: 0, opacity: 0.3 },
  { icon: 'home', top: '22%', size: 44, drift: 14, spin: 66, delay: 2, opacity: 0.4 },
  { icon: 'lamp', top: '32%', size: 26, drift: 10, spin: 42, delay: 3.4, opacity: 0.3 },
  { icon: 'door', top: '41%', size: 30, drift: 13, spin: 52, delay: 1.1, opacity: 0.3 },
  { icon: 'building', top: '51%', size: 32, drift: 18, spin: 92, delay: 4, opacity: 0.3 },
  { icon: 'bed', top: '61%', size: 34, drift: 15, spin: 60, delay: 0.8, opacity: 0.3 },
  { icon: 'home', top: '71%', size: 36, drift: 15, spin: 70, delay: 2.6, opacity: 0.32 },
  { icon: 'fence', top: '81%', size: 30, drift: 17, spin: 78, delay: 1.9, opacity: 0.3 },
  { icon: 'key', top: '90%', size: 26, drift: 11, spin: 44, delay: 3, opacity: 0.28 },
  { icon: 'mapPin', top: '98%', size: 24, drift: 9, spin: 36, delay: 0.4, opacity: 0.3 },
];

function Column({ side, blobs }: { side: 'left' | 'right'; blobs: Blob[] }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed bottom-0 top-[6.75rem] z-0 hidden w-[calc((100vw-72rem)/2)] xl:block ${
        side === 'left' ? 'left-0' : 'right-0'
      }`}
    >
      {blobs.map((b, i) => (
        <span
          key={i}
          className="gutter-float absolute left-1/2 block -translate-x-1/2 text-brand-700"
          style={{
            top: b.top,
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
