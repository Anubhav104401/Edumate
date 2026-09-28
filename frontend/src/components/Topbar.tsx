/*
 * The bar across the top of every signed-in page:
 *   [menu button on phones] Role > Current page ........ [Search Ctrl K] [sun/moon] [avatar menu]
 * It is transparent at the top of the page and turns into frosted glass once the page scrolls.
 */
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown, ChevronRight, LogOut, Menu, Moon, Search, Sun } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import type { MouseEvent } from 'react';
import { useLocation } from 'react-router';
import { useUser } from '../auth/AuthContext';
import { t } from '../i18n/messages';
import { findNavItem } from '../navigation';
import { THEME_OPTIONS, useTheme, type ThemeChoice } from '../theme/ThemeContext';
import { firstName } from '../utils/visuals';
import { useScrolled } from './ScrollExtras';
import { Avatar } from './ui';

interface Props {
  onOpenMenu: () => void;
  onOpenPalette: () => void;
  onLogout: () => void;
}

/** Macs show ⌘ for the Command key; everyone else uses Ctrl. */
const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

export function Topbar({ onOpenMenu, onOpenPalette, onLogout }: Props) {
  const user = useUser();
  const { pathname } = useLocation();
  const scrolled = useScrolled();
  const current = findNavItem(user.role, pathname);

  return (
    <header className="topbar" data-scrolled={scrolled}>
      <button type="button" className="icon-btn menu-toggle" aria-label={t.common.openMenu} onClick={onOpenMenu}>
        <Menu size={18} />
      </button>
      <nav className="breadcrumb" aria-label={t.common.breadcrumb}>
        <span className="crumb-root">{t.roles[user.role]}</span>
        <ChevronRight size={14} className="crumb-root" aria-hidden="true" />
        <strong>{current?.label ?? t.app.name}</strong>
      </nav>
      <div className="topbar-spacer" />
      <button
        type="button"
        className="search-trigger"
        onClick={onOpenPalette}
        aria-label={t.palette.open}
        aria-keyshortcuts="Control+K Meta+K"
      >
        <Search size={16} />
        <span className="search-text">{t.palette.open}</span>
        <kbd>{IS_MAC ? '⌘' : 'Ctrl'} K</kbd>
      </button>
      <ThemeToggle />
      <UserMenu onLogout={onLogout} />
    </header>
  );
}

/** The sun/moon button. The icon spins away and the new one spins in; the page changes theme in a circle. */
export function ThemeToggle() {
  const { resolved, toggle } = useTheme();

  const onClick = (event: MouseEvent<HTMLButtonElement>) => {
    // Start the circle from the middle of the button (this also works for a keyboard press).
    const box = event.currentTarget.getBoundingClientRect();
    toggle({ clientX: box.left + box.width / 2, clientY: box.top + box.height / 2 });
  };

  return (
    <button type="button" className="icon-btn" aria-label={t.theme.toggle} onClick={onClick}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={resolved}
          style={{ display: 'grid' }}
          initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 90, scale: 0.4, opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          {resolved === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

/** The avatar button that opens a small menu: who is signed in, the theme choice, and "Log out". */
function UserMenu({ onLogout }: { onLogout: () => void }) {
  const user = useUser();
  const { choice, setChoice } = useTheme();

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="user-trigger" aria-label={t.topbar.account}>
          <Avatar name={user.fullName} size="sm" />
          <span className="user-trigger-name">{firstName(user.fullName)}</span>
          <ChevronDown size={14} className="muted" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="menu-content" align="end" sideOffset={8}>
          <div className="menu-label">
            <strong>{user.fullName}</strong>
            {t.roles[user.role]} · {t.topbar.campus(user.campusCode)}
          </div>
          <DropdownMenu.Separator className="menu-sep" />
          <DropdownMenu.Label className="menu-label">{t.theme.label}</DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={choice} onValueChange={(value) => setChoice(value as ThemeChoice)}>
            {THEME_OPTIONS.map(({ choice: option, icon: Icon, label }) => (
              <DropdownMenu.RadioItem key={option} value={option} className="menu-item">
                <Icon size={16} /> {label}
                <DropdownMenu.ItemIndicator className="menu-check">
                  <Check size={14} />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
          <DropdownMenu.Separator className="menu-sep" />
          <DropdownMenu.Item className="menu-item danger" onSelect={onLogout}>
            <LogOut size={16} /> {t.topbar.logout}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
