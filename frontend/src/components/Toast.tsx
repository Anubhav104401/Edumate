/*
 * Toasts: the small messages that slide up in the bottom-right corner and vanish after a few seconds
 * ("Attendance saved.", "Something went wrong."). Any page can show one with:
 *
 *   const toast = useToast();
 *   toast.success(t.takeAttendance.savedToast);
 *
 * The drawing, stacking, swiping-away and pausing-on-hover are done by the Sonner library.
 * This file keeps EduMate's own small API in front of it, so no page needs to know about Sonner.
 */
import { CircleCheck, CircleX, Info, TriangleAlert } from 'lucide-react';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Toaster, toast as sonner } from 'sonner';
import { TOAST_DURATION_MS } from '../config';
import { t } from '../i18n/messages';
import { useTheme } from '../theme/ThemeContext';

interface ToastApi {
  success: (text: string) => void;
  error: (text: string) => void;
  info: (text: string) => void;
  warning: (text: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const options = { duration: TOAST_DURATION_MS };

export function ToastProvider({ children }: { children: ReactNode }) {
  const { resolved } = useTheme();

  const api = useMemo<ToastApi>(
    () => ({
      success: (text) => void sonner.success(text, options),
      error: (text) => void sonner.error(text, options),
      info: (text) => void sonner.info(text, options),
      warning: (text) => void sonner.warning(text, options),
    }),
    [],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Sonner announces each new message to screen readers (an aria-live region), as WCAG 2.1 asks. */}
      <Toaster
        theme={resolved}
        position="bottom-right"
        closeButton
        visibleToasts={4}
        gap={10}
        offset={24}
        containerAriaLabel={t.common.notifications}
        toastOptions={{ className: 'toast', closeButtonAriaLabel: t.common.close }}
        icons={{
          success: <CircleCheck size={18} />,
          error: <CircleX size={18} />,
          warning: <TriangleAlert size={18} />,
          info: <Info size={18} />,
        }}
      />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return api;
}
