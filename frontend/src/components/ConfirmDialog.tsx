/*
 * "Are you sure?" dialogs. A page asks with
 *
 *   const confirm = useConfirm();
 *   if (await confirm(t.resultsManage.confirmPublish)) { ...publish... }
 *   if (await confirm(t.apply.confirmWithdraw, t.apply.withdraw, 'danger')) { ... }   // red button
 *
 * and the code waits until the user clicks Confirm (true) or Cancel / presses Escape (false).
 *
 * Radix UI's AlertDialog does the hard accessibility work: it traps the keyboard inside the dialog,
 * closes on Escape, hides the page behind it from screen readers and gives focus back afterwards.
 * motion adds the entrance and exit animation.
 */
import { AnimatePresence, motion } from 'motion/react';
import { CircleQuestionMark, TriangleAlert } from 'lucide-react';
import { AlertDialog } from 'radix-ui';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { t } from '../i18n/messages';
import { SPRING } from '../motion/presets';
import { useScrollLock } from '../motion/SmoothScroll';

type Tone = 'normal' | 'danger';
type ConfirmFn = (message: string, confirmLabel?: string, tone?: Tone) => Promise<boolean>;

interface Pending {
  message: string;
  confirmLabel: string;
  tone: Tone;
  resolve: (answer: boolean) => void;
}

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);
  useScrollLock(pending !== null);

  const confirm = useCallback<ConfirmFn>(
    (message, confirmLabel = t.common.confirm, tone = 'normal') =>
      new Promise<boolean>((resolve) => setPending({ message, confirmLabel, tone, resolve })),
    [],
  );

  const answer = (value: boolean) => {
    pending?.resolve(value);
    setPending(null);
  };

  const danger = pending?.tone === 'danger';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog.Root open={pending !== null} onOpenChange={(open) => !open && answer(false)}>
        <AnimatePresence>
          {pending && (
            <AlertDialog.Portal forceMount>
              <AlertDialog.Overlay asChild forceMount>
                <motion.div className="dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
              </AlertDialog.Overlay>
              <div className="dialog-positioner">
                <AlertDialog.Content
                  asChild
                  forceMount
                  // A safe action gets the focus; for a dangerous one, Radix focuses Cancel instead.
                  onOpenAutoFocus={(event) => {
                    if (!danger) {
                      event.preventDefault();
                      confirmButton.current?.focus();
                    }
                  }}
                >
                  <motion.div
                    className="dialog"
                    initial={{ opacity: 0, scale: 0.94, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.15 } }}
                    transition={SPRING}
                  >
                    <div className={`icon-tile lg dialog-icon ${danger ? 'tone-bad' : 'tone-info'}`}>
                      {danger ? <TriangleAlert size={24} /> : <CircleQuestionMark size={24} />}
                    </div>
                    <AlertDialog.Title className="dialog-title">{t.common.confirmTitle}</AlertDialog.Title>
                    <AlertDialog.Description className="dialog-text">{pending.message}</AlertDialog.Description>
                    <div className="dialog-actions">
                      {/* Cancel and the Escape key both close the dialog, which answers false (onOpenChange above). */}
                      <AlertDialog.Cancel className="btn btn-secondary">{t.common.cancel}</AlertDialog.Cancel>
                      <AlertDialog.Action
                        ref={confirmButton}
                        className={danger ? 'btn btn-danger' : 'btn'}
                        onClick={() => answer(true)}
                      >
                        {pending.confirmLabel}
                      </AlertDialog.Action>
                    </div>
                  </motion.div>
                </AlertDialog.Content>
              </div>
            </AlertDialog.Portal>
          )}
        </AnimatePresence>
      </AlertDialog.Root>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error('useConfirm must be used inside <ConfirmProvider>');
  }
  return confirm;
}
