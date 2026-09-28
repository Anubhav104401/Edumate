/*
 * The command menu: press Ctrl+K (Cmd+K on a Mac), type a few letters, press Enter.
 * It lists every page the signed-in role may open (the same MENU as the sidebar) plus a few
 * actions (switch theme, log out). The cmdk library does the fuzzy search and the arrow-key
 * selection; Radix UI's Dialog makes it a proper, accessible pop-up; motion animates it.
 */
import { AnimatePresence, motion } from 'motion/react';
import { Command } from 'cmdk';
import { ArrowDown, ArrowRight, ArrowUp, CornerDownLeft, LogOut, Search } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useNavigate } from 'react-router';
import { useAuth, useUser } from '../auth/AuthContext';
import { t } from '../i18n/messages';
import { SPRING } from '../motion/presets';
import { useScrollLock } from '../motion/SmoothScroll';
import { MENU } from '../navigation';
import { THEME_OPTIONS, useTheme } from '../theme/ThemeContext';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: Props) {
  const user = useUser();
  const { logout } = useAuth();
  const { setChoice } = useTheme();
  const navigate = useNavigate();
  useScrollLock(open);

  /** Closes the menu first, then does the chosen thing. */
  const run = (action: () => void) => {
    onOpenChange(false);
    action();
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div className="dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </Dialog.Overlay>
            <div className="dialog-positioner cmdk-positioner">
              <Dialog.Content asChild forceMount aria-describedby={undefined}>
                <motion.div
                  className="cmdk"
                  initial={{ opacity: 0, scale: 0.96, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: -6, transition: { duration: 0.12 } }}
                  transition={SPRING}
                >
                  <Dialog.Title className="sr-only">{t.palette.title}</Dialog.Title>
                  <Command label={t.palette.title} loop>
                    <div className="cmdk-search">
                      <Search size={18} />
                      <Command.Input placeholder={t.palette.placeholder} />
                      <kbd>Esc</kbd>
                    </div>
                    <Command.List>
                      <Command.Empty>{t.palette.empty}</Command.Empty>
                      <Command.Group heading={t.palette.pages}>
                        {MENU[user.role].map((item) => (
                          <Command.Item
                            key={item.to}
                            value={`${item.label} ${item.section}`}
                            onSelect={() => run(() => navigate(item.to))}
                          >
                            <span className="icon-tile">
                              <item.icon size={16} />
                            </span>
                            <span>{item.label}</span>
                            <span className="faint small">{item.section}</span>
                            <ArrowRight className="cmdk-go" size={16} />
                          </Command.Item>
                        ))}
                      </Command.Group>
                      <Command.Group heading={t.palette.actions}>
                        {THEME_OPTIONS.map(({ choice, icon: Icon, label }) => (
                          <Command.Item
                            key={choice}
                            value={`${t.theme.label} ${label}`}
                            onSelect={() => run(() => setChoice(choice))}
                          >
                            <span className="icon-tile tone-accent">
                              <Icon size={16} />
                            </span>
                            <span>
                              {t.theme.label}: {label}
                            </span>
                          </Command.Item>
                        ))}
                        <Command.Item
                          value={t.topbar.logout}
                          onSelect={() =>
                            run(() => {
                              logout(t.topbar.loggedOut);
                              navigate('/login');
                            })
                          }
                        >
                          <span className="icon-tile tone-bad">
                            <LogOut size={16} />
                          </span>
                          <span>{t.topbar.logout}</span>
                        </Command.Item>
                      </Command.Group>
                    </Command.List>
                    <div className="cmdk-footer" aria-hidden="true">
                      <span>
                        <ArrowUp size={12} />
                        <ArrowDown size={12} /> {t.palette.move}
                      </span>
                      <span>
                        <CornerDownLeft size={12} /> {t.palette.select}
                      </span>
                      <span>
                        <kbd>Esc</kbd> {t.palette.close}
                      </span>
                    </div>
                  </Command>
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
