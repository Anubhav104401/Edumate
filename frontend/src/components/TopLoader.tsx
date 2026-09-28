/*
 * The thin glowing line along the top edge while EduMate waits for the backend (like YouTube's).
 *
 * api/http.ts counts the requests on their way; useSyncExternalStore lets React read that count
 * and redraw when it changes. The line creeps towards 85% while waiting (we cannot know the real
 * progress), then shoots to 100% and fades when the last answer arrives. It waits LOADER_DELAY_MS
 * before appearing, so quick answers do not make it flicker.
 */
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { activeRequests, subscribeActivity } from '../api/http';
import { LOADER_DELAY_MS } from '../config';

export function TopLoader() {
  const busy = useSyncExternalStore(subscribeActivity, activeRequests) > 0;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!busy) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), LOADER_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [busy]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="top-loader"
          aria-hidden="true"
          initial={{ scaleX: 0, opacity: 1 }}
          animate={{ scaleX: 0.85, transition: { duration: 6, ease: [0.1, 0.8, 0.2, 1] } }}
          exit={{ scaleX: 1, opacity: 0, transition: { scaleX: { duration: 0.2 }, opacity: { duration: 0.3, delay: 0.15 } } }}
        />
      )}
    </AnimatePresence>
  );
}
