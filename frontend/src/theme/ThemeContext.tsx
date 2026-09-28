/*
 * Light mode, dark mode, or "same as my computer".
 *
 *   const { resolved, toggle } = useTheme();
 *   <button onClick={(e) => toggle(e)}>...</button>
 *
 * The choice is written onto <html data-theme="light|dark"> (theme.css switches every colour from
 * that) and remembered in localStorage (public/theme-init.js re-applies it on the next visit).
 *
 * The switch itself is animated with the browser's View Transitions API: the browser takes a
 * picture of the old page, we change the theme, and the new page is revealed through a circle
 * that grows out of the button that was clicked.
 */
import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { flushSync } from 'react-dom';
import { THEME_STORAGE_KEY } from '../config';
import { t } from '../i18n/messages';

export type ThemeChoice = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

/** Where the change was triggered from (the click position), so the circle can start there. */
type Origin = { clientX: number; clientY: number } | undefined;

interface ThemeState {
  choice: ThemeChoice;
  resolved: ResolvedTheme;
  setChoice: (choice: ThemeChoice, origin?: Origin) => void;
  toggle: (origin?: Origin) => void;
}

/** The three choices, with their icon and words, as shown in the user menu and the command menu. */
export const THEME_OPTIONS: { choice: ThemeChoice; icon: LucideIcon; label: string }[] = [
  { choice: 'light', icon: Sun, label: t.theme.light },
  { choice: 'dark', icon: Moon, label: t.theme.dark },
  { choice: 'system', icon: Monitor, label: t.theme.system },
];

const DARK_QUERY = '(prefers-color-scheme: dark)';
const ThemeContext = createContext<ThemeState | null>(null);

function readSaved(): ThemeChoice {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  } catch {
    return 'system'; // storage blocked, e.g. in a private window
  }
}

function save(choice: ThemeChoice): void {
  try {
    if (choice === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // not remembered, but the page still switches
  }
}

/** Puts the choice on <html>; with no attribute, theme.css follows the computer's setting. */
function apply(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === 'system') delete root.dataset.theme;
  else root.dataset.theme = choice;
}

/** true while the computer is set to dark mode; React redraws when that setting changes. */
function useSystemDark(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia?.(DARK_QUERY);
      query?.addEventListener('change', onChange);
      return () => query?.removeEventListener('change', onChange);
    },
    () => window.matchMedia?.(DARK_QUERY).matches ?? false,
  );
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>(readSaved);
  const systemDark = useSystemDark();
  const resolved: ResolvedTheme = choice === 'system' ? (systemDark ? 'dark' : 'light') : choice;

  useLayoutEffect(() => apply(choice), [choice]);

  const setChoice = useCallback((next: ThemeChoice, origin?: Origin) => {
    const change = () => {
      flushSync(() => setChoiceState(next)); // redraw NOW, inside the transition
      apply(next);
      save(next);
    };
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!document.startViewTransition || reduceMotion) {
      change();
      return;
    }
    const x = origin?.clientX ?? window.innerWidth - 40;
    const y = origin?.clientY ?? 32;
    // The circle must grow until it reaches the farthest corner of the window.
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const transition = document.startViewTransition(change);
    transition.ready
      .then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 700, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' },
        );
      })
      .catch(() => undefined); // the transition was skipped; the theme has still changed
  }, []);

  const toggle = useCallback(
    (origin?: Origin) => setChoice(resolved === 'dark' ? 'light' : 'dark', origin),
    [resolved, setChoice],
  );

  const value = useMemo(() => ({ choice, resolved, setChoice, toggle }), [choice, resolved, setChoice, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
  const state = useContext(ThemeContext);
  if (!state) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return state;
}
