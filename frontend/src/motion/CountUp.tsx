/*
 * Shows a value such as "75.00%" or "Rs 62500.00" by counting the number up from 0,
 * keeping the words around it. Text without a single number ("Not yet") is shown as it is.
 * Screen readers are given the final value straight away; only the moving copy is hidden from them.
 */
import { animate, useInView, useReducedMotion } from 'motion/react';
import { useLayoutEffect, useRef } from 'react';
import { splitNumber } from '../utils/visuals';
import { EASE_OUT } from './presets';

export function CountUp({ value, duration = 1.2 }: { value: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const parts = splitNumber(value);

  // useLayoutEffect runs before the screen is painted, so the final number never flashes first.
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || !parts || reduce) return;
    const write = (n: number) => {
      node.textContent = parts.prefix + n.toFixed(parts.decimals) + parts.suffix;
    };
    if (!inView) {
      write(0);
      return;
    }
    const controls = animate(0, parts.value, { duration, ease: EASE_OUT, onUpdate: write });
    return () => controls.stop();
    // `parts` is not listed: it is worked out from `value` on every draw, so `value` stands for it.
  }, [value, inView, reduce, duration]);

  return (
    <>
      <span className="sr-only">{value}</span>
      <span ref={ref} aria-hidden="true">
        {value}
      </span>
    </>
  );
}
