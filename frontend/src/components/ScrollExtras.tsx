/*
 * Three small helpers that react to scrolling:
 *   <ScrollProgress/>  a thin gradient line at the very top that fills as you read down the page
 *   <BackToTop/>       a round button that appears after scrolling down and glides back up
 *   useScrolled()      true once the page has scrolled a little (the top bar turns to glass)
 */
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from 'motion/react';
import { ArrowUp } from 'lucide-react';
import { useLenis } from 'lenis/react';
import { useState } from 'react';
import { t } from '../i18n/messages';
import { SPRING } from '../motion/presets';

export function ScrollProgress() {
  const { scrollYProgress } = useScroll(); // 0 at the top of the page, 1 at the bottom
  // A spring follows the real value, so the line moves smoothly instead of jumping.
  const scaleX = useSpring(scrollYProgress, { stiffness: 220, damping: 40, restDelta: 0.001 });
  return <motion.div className="scroll-progress" style={{ scaleX }} aria-hidden="true" />;
}

export function useScrolled(threshold = 8): boolean {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > threshold));
  return scrolled;
}

export function BackToTop() {
  const lenis = useLenis();
  const show = useScrolled(700);

  const goUp = () => {
    if (lenis) lenis.scrollTo(0, { duration: 1.2 });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          type="button"
          className="icon-btn back-to-top no-print"
          aria-label={t.common.backToTop}
          initial={{ opacity: 0, scale: 0.6, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: 16 }}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.9 }}
          transition={SPRING}
          onClick={goUp}
        >
          <ArrowUp size={18} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
