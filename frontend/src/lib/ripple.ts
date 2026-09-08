import { useEffect } from 'react';

const SELECTOR = '.btn, .btn-sm, [data-ripple]';
const REDUCED =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * One delegated pointerdown listener on <document> that drops a expanding
 * circle at the press point inside any button-like element. Cheap (no
 * per-button wiring), self-cleaning (the span removes itself on animationend),
 * and a no-op under prefers-reduced-motion.
 */
export function useGlobalRipple() {
  useEffect(() => {
    if (REDUCED) return;

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const target = (e.target as HTMLElement | null)?.closest(SELECTOR) as HTMLElement | null;
      if (!target || target.hasAttribute('disabled') || target.getAttribute('aria-disabled') === 'true') {
        return;
      }

      const rect = target.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const span = document.createElement('span');
      span.className = 'ripple';
      span.style.width = span.style.height = `${size}px`;
      span.style.left = `${e.clientX - rect.left - size / 2}px`;
      span.style.top = `${e.clientY - rect.top - size / 2}px`;

      // Make sure the host can contain an absolutely-positioned child.
      const pos = getComputedStyle(target).position;
      if (pos === 'static') target.style.position = 'relative';
      if (getComputedStyle(target).overflow === 'visible') target.style.overflow = 'hidden';

      span.addEventListener('animationend', () => span.remove(), { once: true });
      target.appendChild(span);
    };

    document.addEventListener('pointerdown', onDown, { passive: true });
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);
}
