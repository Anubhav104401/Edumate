/*
 * The shared "vocabulary of movement" used with the motion library.
 * Every animation in the app picks from these few recipes, so the whole
 * product moves with one consistent personality: quick, soft, a little springy.
 *
 * A "variant" is a named pose, e.g. hidden = { opacity: 0 } and show = { opacity: 1 }.
 * An element given variants={fadeUp} animates from its "hidden" pose to its "show" pose.
 */
import type { Transition, Variants } from 'motion/react';

/** A curve that starts fast and settles gently (the same curve as --ease-out in theme.css). */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** A lively spring for small things that move: pills, toggles, icons. */
export const SPRING: Transition = { type: 'spring', stiffness: 420, damping: 34, mass: 0.8 };

/** Rise a little and fade in. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
};

/** A parent that shows its children one after another, `gap` seconds apart. */
export function staggerChildren(gap = 0.06, delay = 0): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: gap, delayChildren: delay } },
  };
}

/**
 * How a whole page arrives and leaves. It leaves fast (so clicks feel instant)
 * and arrives with a short rise, fade and un-blur.
 */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 14, filter: 'blur(6px)' },
  enter: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.45, ease: EASE_OUT },
    // 'none' afterwards: a leftover filter would break position: fixed inside the page.
    transitionEnd: { filter: 'none' },
  },
  exit: { opacity: 0, y: -6, filter: 'blur(3px)', transition: { duration: 0.14, ease: 'easeIn' } },
};
