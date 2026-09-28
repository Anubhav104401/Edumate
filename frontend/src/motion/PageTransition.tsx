/*
 * Draws the current page (like React Router's <Outlet />) but animates the change between pages:
 * the old page leaves quickly, the window jumps to the top, and the new page rises into place.
 *
 * AnimatePresence keeps a page on screen for its exit animation after the address has changed.
 * During those milliseconds React Router already points at the NEW page, so each page's element is
 * "frozen" when it first appears; the leaving page keeps showing its own content, not the new one.
 */
import { AnimatePresence, motion } from 'motion/react';
import { Suspense, useState, type ReactNode } from 'react';
import { useLocation, useOutlet } from 'react-router';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Loading } from '../components/ui';
import { pageVariants } from './presets';
import { useScrollToTop } from './SmoothScroll';

export function AnimatedOutlet() {
  const location = useLocation();
  const outlet = useOutlet();
  const scrollToTop = useScrollToTop();

  return (
    <AnimatePresence mode="wait" onExitComplete={scrollToTop}>
      <motion.div key={location.pathname} variants={pageVariants} initial="initial" animate="enter" exit="exit">
        <ErrorBoundary resetKey={location.pathname}>
          {/* While a page's code is still downloading (see lazyPage in App.tsx), show a skeleton. */}
          <Suspense fallback={<Loading />}>
            <Frozen>{outlet}</Frozen>
          </Suspense>
        </ErrorBoundary>
      </motion.div>
    </AnimatePresence>
  );
}

/** Remembers the first thing it was given and keeps drawing that, whatever it is given later. */
function Frozen({ children }: { children: ReactNode }) {
  const [frozen] = useState(children);
  return <>{frozen}</>;
}
