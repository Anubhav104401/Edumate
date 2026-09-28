/*
 * Smooth scrolling with Lenis.
 *
 * Normally a mouse wheel moves the page in jumps of about 100 pixels. Lenis catches each wheel
 * movement and glides the page there over a few frames instead, which feels calmer and makes
 * scroll-linked effects (the progress line, parallax, reveals) move fluidly. It still uses the
 * browser's real scrolling underneath, so the scrollbar, keyboard, find-in-page and screen readers
 * all keep working. Lenis switches itself off for people who ask their computer for reduced motion,
 * and leaves touch screens with their native feel.
 */
import { ReactLenis, useLenis } from 'lenis/react';
import { useEffect, type ReactNode } from 'react';
import { SMOOTH_SCROLL_LERP } from '../config';

export function SmoothScroll({ children }: { children: ReactNode }) {
  return (
    <ReactLenis
      root
      options={{
        lerp: SMOOTH_SCROLL_LERP,
        autoRaf: true, // Lenis runs its own animation loop
        anchors: true, // links to #sections glide too
        allowNestedScroll: true, // wide tables and menus that scroll on their own still work
        stopInertiaOnNavigate: true, // clicking a link stops any glide in progress
      }}
    >
      {children}
    </ReactLenis>
  );
}

/** While `active` is true (a dialog or drawer is open), the page behind it does not scroll. */
export function useScrollLock(active: boolean): void {
  const lenis = useLenis();
  useEffect(() => {
    if (!active || !lenis) return;
    lenis.stop();
    return () => lenis.start();
  }, [active, lenis]);
}

/** Jumps to the top of the page at once (used when a new page opens). */
export function useScrollToTop(): () => void {
  const lenis = useLenis();
  return () => {
    if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
    else window.scrollTo(0, 0);
  };
}
