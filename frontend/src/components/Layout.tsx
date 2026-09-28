/*
 * The frame around every page after login: the side menu on the left, the top bar, and the
 * current page in the middle (drawn by <AnimatedOutlet />, which also animates page changes).
 * It also owns the things that belong to the whole frame: the command menu (Ctrl+K),
 * the phone drawer, the reading-progress line and the back-to-top button.
 */
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { PALETTE_KEY, SIDEBAR_STORAGE_KEY } from '../config';
import { useStoredFlag } from '../hooks/useStoredFlag';
import { t } from '../i18n/messages';
import { AnimatedOutlet } from '../motion/PageTransition';
import { useScrollLock } from '../motion/SmoothScroll';
import { CommandPalette } from './CommandPalette';
import { BackToTop, ScrollProgress } from './ScrollExtras';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useStoredFlag(SIDEBAR_STORAGE_KEY);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  useScrollLock(drawerOpen);

  // Close the phone drawer whenever another page opens.
  useEffect(() => setDrawerOpen(false), [pathname]);

  // Ctrl+K (Cmd+K on a Mac) opens or closes the command menu from anywhere.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === PALETTE_KEY) {
        event.preventDefault(); // otherwise the browser would focus its own address bar
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleLogout = () => {
    logout(t.topbar.loggedOut);
    navigate('/login');
  };

  return (
    <div className="app-shell" data-collapsed={collapsed}>
      <a className="skip-link" href="#main">
        {t.common.skipToContent}
      </a>
      <ScrollProgress />
      <Sidebar
        collapsed={collapsed}
        open={drawerOpen}
        onNavigate={() => setDrawerOpen(false)}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            className="drawer-backdrop"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDrawerOpen(false)}
          />
        )}
      </AnimatePresence>
      <div className="main">
        <Topbar onOpenMenu={() => setDrawerOpen(true)} onOpenPalette={() => setPaletteOpen(true)} onLogout={handleLogout} />
        <main className="content" id="main" tabIndex={-1}>
          <AnimatedOutlet />
        </main>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <BackToTop />
    </div>
  );
}
