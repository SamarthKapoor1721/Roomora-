import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Icon, type IconName } from './Icon';

/**
 * Plays a short "icon zooms up from the middle" flourish whenever the user
 * switches to a different feature (a different first path segment under the
 * role, e.g. /owner -> /owner/properties). Detail routes like
 * /owner/applications/:id don't retrigger it. No-op under
 * prefers-reduced-motion (the CSS hides the layers).
 */

type NavLookup = Record<string, { icon: IconName; label: string }>;

const REDUCED =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Key a location to its "feature": first two segments, e.g. "owner/leases". */
function featureKey(pathname: string): string {
  return pathname.replace(/^\/+/, '').split('/').slice(0, 2).join('/');
}

export function RouteTransition({ nav }: { nav: NavLookup }) {
  const { pathname } = useLocation();
  const prev = useRef(featureKey(pathname));
  const [burst, setBurst] = useState<{ icon: IconName; label: string; id: number } | null>(null);
  const timer = useRef<number>();

  useEffect(() => {
    const key = featureKey(pathname);
    if (key === prev.current) return;
    prev.current = key;
    if (REDUCED) return;

    const hit = nav[key] ?? nav[key.split('/')[0]];
    if (!hit) return;

    setBurst({ icon: hit.icon, label: hit.label, id: Date.now() });
    // CSS on [data-routing] blurs + fades the page body while this is set.
    document.documentElement.setAttribute('data-routing', '');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setBurst(null);
      document.documentElement.removeAttribute('data-routing');
    }, 640);
    return () => {
      window.clearTimeout(timer.current);
      document.documentElement.removeAttribute('data-routing');
    };
  }, [pathname, nav]);

  if (!burst) return null;

  return (
    <div
      key={burst.id}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center"
    >
      <span className="route-halo absolute left-1/2 top-1/2 h-32 w-32 rounded-full bg-brand-500/25" />
      <span className="route-icon absolute left-1/2 top-1/2 flex flex-col items-center gap-1.5 text-brand-600">
        <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-white shadow-pop ring-1 ring-brand-500/20">
          <Icon name={burst.icon} size={30} strokeWidth={1.75} />
        </span>
        <span className="rounded-full bg-white/90 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-ink-600 shadow-sm">
          {burst.label}
        </span>
      </span>
    </div>
  );
}
