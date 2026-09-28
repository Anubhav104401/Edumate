/*
 * "Are you sure?" dialogs. A page asks with
 *
 *   const confirm = useConfirm();
 *   if (await confirm(t.resultsManage.confirmPublish)) { ...publish... }
 *
 * and the code waits until the user clicks Confirm (true) or Cancel (false).
 */
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { t } from '../i18n/messages';

type ConfirmFn = (message: string, confirmLabel?: string) => Promise<boolean>;

interface Pending {
  message: string;
  confirmLabel: string;
  resolve: (answer: boolean) => void;
}

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (message, confirmLabel = t.common.confirm) =>
      new Promise<boolean>((resolve) => setPending({ message, confirmLabel, resolve })),
    [],
  );

  const answer = (value: boolean) => {
    pending?.resolve(value);
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div className="dialog-backdrop" onClick={() => answer(false)}>
          <div className="dialog" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <p>{pending.message}</p>
            <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => answer(false)}>
                {t.common.cancel}
              </button>
              <button type="button" className="btn" autoFocus onClick={() => answer(true)}>
                {pending.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
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
