/*
 * Toasts: the small messages that pop up in the bottom-right corner and vanish after a few seconds
 * ("Attendance saved.", "Something went wrong."). Any page can show one with:
 *
 *   const toast = useToast();
 *   toast.success(t.takeAttendance.savedToast);
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { TOAST_DURATION_MS } from '../config';
import { t } from '../i18n/messages';

type Kind = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: number;
  kind: Kind;
  text: string;
}

interface ToastApi {
  success: (text: string) => void;
  error: (text: string) => void;
  info: (text: string) => void;
  warning: (text: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((item) => item.id !== id));
  }, []);

  const show = useCallback(
    (kind: Kind, text: string) => {
      const id = nextId.current++;
      setItems((list) => [...list, { id, kind, text }]);
      window.setTimeout(() => dismiss(id), TOAST_DURATION_MS);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (text) => show('success', text),
      error: (text) => show('error', text),
      info: (text) => show('info', text),
      warning: (text) => show('warning', text),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* role="status" makes screen readers announce new messages (accessibility, WCAG 2.1). */}
      <div className="toast-stack" role="status" aria-live="polite">
        {items.map((item) => (
          <div key={item.id} className={`toast toast-${item.kind}`}>
            <span>{item.text}</span>
            <button type="button" aria-label={t.common.close} onClick={() => dismiss(item.id)}>
              ×
            </button>
          </div>
        ))}
      </div>
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
