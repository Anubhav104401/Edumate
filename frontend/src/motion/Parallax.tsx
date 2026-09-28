/*
 * Pointer parallax: layers that drift with the mouse by different amounts, which the eye reads as depth
 * (near things move more than far things, like looking out of a train window).
 *
 *   const pointer = usePointer();
 *   <div onPointerMove={pointer.onPointerMove}>
 *     <Float pointer={pointer} depth={30}>...</Float>   // moves up to 30px
 *     <Float pointer={pointer} depth={-12}>...</Float>  // moves the other way, less
 *   </div>
 *
 * Springs smooth the movement, so the layers glide after the mouse instead of jerking with it.
 * For people who ask for reduced motion, nothing moves.
 */
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from 'motion/react';
import type { CSSProperties, PointerEvent, ReactNode } from 'react';

export interface Pointer {
  /** -0.5 (left edge) … 0 (middle) … 0.5 (right edge) of the element that reports the pointer. */
  x: MotionValue<number>;
  y: MotionValue<number>;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerLeave: () => void;
}

export function usePointer(): Pointer {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 70, damping: 18 });
  const y = useSpring(rawY, { stiffness: 70, damping: 18 });
  const reduce = useReducedMotion();

  return {
    x,
    y,
    onPointerMove: (event) => {
      if (reduce) return;
      const box = event.currentTarget.getBoundingClientRect();
      rawX.set((event.clientX - box.left) / box.width - 0.5);
      rawY.set((event.clientY - box.top) / box.height - 0.5);
    },
    onPointerLeave: () => {
      rawX.set(0);
      rawY.set(0);
    },
  };
}

export function Float({
  pointer,
  depth,
  className,
  style,
  children,
}: {
  pointer: Pointer;
  depth: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const x = useTransform(pointer.x, (v) => v * depth);
  const y = useTransform(pointer.y, (v) => v * depth);
  return (
    <motion.div className={className} style={{ ...style, x, y }}>
      {children}
    </motion.div>
  );
}
