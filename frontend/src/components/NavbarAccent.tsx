import { Icon, type IconName } from './Icon';

/**
 * Quiet, static brand marks for the empty margins beside the navbar on wide
 * screens — a small dot-grid plus a couple of housing glyphs. Deliberately
 * still (no drift/spin, unlike GutterDecor) so it doesn't compete with the
 * nav row; purely decorative (pointer-events-none, aria-hidden). Hidden
 * below xl, where the header has no real side margin to fill.
 */

const DOTS = Array.from({ length: 9 }, (_, i) => i);

function DotGrid({ side }: { side: 'left' | 'right' }) {
  return (
    <div
      className={`grid grid-cols-3 gap-1.5 ${side === 'left' ? 'mr-auto' : 'ml-auto'}`}
      style={{ opacity: 0.35 }}
    >
      {DOTS.map((i) => (
        <span key={i} className="h-[3px] w-[3px] rounded-full bg-brand-500" />
      ))}
    </div>
  );
}

export default function NavbarAccent({ side, icon }: { side: 'left' | 'right'; icon: IconName }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute top-0 hidden h-14 w-[calc((100vw-72rem)/2)] items-center xl:flex ${
        side === 'left' ? 'left-0 justify-end pr-7' : 'right-0 justify-start pl-7'
      }`}
    >
      <div className={`flex items-center gap-4 ${side === 'left' ? 'flex-row' : 'flex-row-reverse'}`}>
        <Icon name={icon} size={17} strokeWidth={1.5} className="text-brand-300" />
        <DotGrid side={side} />
      </div>
    </div>
  );
}
