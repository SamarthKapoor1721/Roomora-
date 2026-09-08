import { Icon, type IconName } from './Icon';

/**
 * Decorative housing icons that drift and rotate in the empty page gutters
 * on wide screens. Purely ornamental: pointer-events-none, aria-hidden, and
 * held still for anyone with prefers-reduced-motion (see index.css). Hidden
 * below xl, where there are no real gutters to fill.
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
  { icon: 'home', top: '4%', size: 48, drift: 13, spin: 64, delay: 0, opacity: 0.16 },
  { icon: 'building', top: '22%', size: 34, drift: 17, spin: 82, delay: 2.5, opacity: 0.11 },
  { icon: 'key', top: '40%', size: 26, drift: 11, spin: 46, delay: 1, opacity: 0.13 },
  { icon: 'home', top: '58%', size: 40, drift: 15, spin: 72, delay: 3.5, opacity: 0.1 },
  { icon: 'building', top: '76%', size: 30, drift: 19, spin: 90, delay: 1.8, opacity: 0.12 },
  { icon: 'key', top: '90%', size: 22, drift: 10, spin: 40, delay: 4.5, opacity: 0.1 },
];

const RIGHT: Blob[] = [
  { icon: 'building', top: '6%', size: 42, drift: 16, spin: 76, delay: 1.5, opacity: 0.13 },
  { icon: 'key', top: '24%', size: 24, drift: 12, spin: 52, delay: 0, opacity: 0.11 },
  { icon: 'home', top: '42%', size: 46, drift: 14, spin: 66, delay: 2, opacity: 0.16 },
  { icon: 'building', top: '60%', size: 32, drift: 18, spin: 92, delay: 4, opacity: 0.1 },
  { icon: 'home', top: '78%', size: 36, drift: 15, spin: 70, delay: 0.8, opacity: 0.12 },
  { icon: 'key', top: '92%', size: 22, drift: 11, spin: 44, delay: 3, opacity: 0.1 },
];

function Column({ side, blobs }: { side: 'left' | 'right'; blobs: Blob[] }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed bottom-0 top-[6.75rem] z-0 hidden w-[max(1.5rem,calc((100vw-72rem)/2))] overflow-hidden xl:block ${
        side === 'left' ? 'left-0' : 'right-0'
      }`}
    >
      {blobs.map((b, i) => (
        <span
          key={i}
          className="gutter-float absolute block text-brand-600"
          style={{
            top: b.top,
            [side]: '20%',
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
