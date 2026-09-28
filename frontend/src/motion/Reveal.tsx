/*
 * Building blocks that make things appear with motion.
 *
 *   <Reveal>...</Reveal>              fades and rises into place when scrolled into view
 *   <Stagger> <StaggerItem/>... </Stagger>   children appear one after another
 *
 * Everything here respects "reduce motion": App.tsx wraps the app in <MotionConfig reducedMotion="user">,
 * which turns movement off (things simply appear) for people who ask their computer for less motion.
 */
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { EASE_OUT, fadeUp, staggerChildren } from './presets';

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** How far below its final place it starts, in pixels. */
  y?: number;
}

export function Reveal({ children, className, delay = 0, y = 28 }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 0.8, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}

interface StaggerProps {
  children: ReactNode;
  className?: string;
  gap?: number;
  delay?: number;
  /** true: start when scrolled into view. false (default): start as soon as it is drawn. */
  inView?: boolean;
}

export function Stagger({ children, className, gap = 0.07, delay = 0, inView = false }: StaggerProps) {
  const trigger = inView ? { whileInView: 'show', viewport: { once: true, margin: '0px 0px -10% 0px' } } : { animate: 'show' };
  return (
    <motion.div className={className} variants={staggerChildren(gap, delay)} initial="hidden" {...trigger}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={fadeUp}>
      {children}
    </motion.div>
  );
}
