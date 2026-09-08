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
  { icon: 'home', top: '3%', size: 30, drift: 13, spin: 64, delay: 0, opacity: 0.16 },
  { icon: 'building', top: '19%', size: 24, drift: 17, spin: 82, delay: 2.5, opacity: 0.11 },
  { icon: 'key', top: '35%', size: 20, drift: 11, spin: 46, delay: 1, opacity: 0.13 },
  { icon: 'home', top: '51%', size: 26, drift: 15, spin: 72, delay: 3.5, opacity: 0.1 },
  { icon: 'building', top: '67%', size: 22, drift: 19, spin: 90, delay: 1.8, opacity: 0.12 },
  { icon: 'key', top: '83%', size: 18, drift: 10, spin: 40, delay: 4.5, opacity: 0.1 },
  { icon: 'home', top: '95%', size: 22, drift: 14, spin: 58, delay: 2.2, opacity: 0.11 },
];

const RIGHT: Blob[] = [
  { icon: 'building', top: '5%', size: 28, drift: 16, spin: 76, delay: 1.5, opacity: 0.13 },
  { icon: 'key', top: '21%', size: 18, drift: 12, spin: 52, delay: 0, opacity: 0.11 },
  { icon: 'home', top: '37%', size: 30, drift: 14, spin: 66, delay: 2, opacity: 0.16 },
  { icon: 'building', top: '53%', size: 22, drift: 18, spin: 92, delay: 4, opacity: 0.1 },
  { icon: 'home', top: '69%', size: 24, drift: 15, spin: 70, delay: 0.8, opacity: 0.12 },
  { icon: 'key', top: '85%', size: 18, drift: 11, spin: 44, delay: 3, opacity: 0.1 },
  { icon: 'building', top: '96%', size: 20, drift: 13, spin: 60, delay: 1.2, opacity: 0.11 },
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
          className="gutter-float absolute left-1/2 block -translate-x-1/2 text-brand-600"
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
