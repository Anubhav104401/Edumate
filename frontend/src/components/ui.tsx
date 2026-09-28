/*
 * Small reusable pieces of screen used by many pages.
 */
import type { ReactNode } from 'react';
import { t } from '../i18n/messages';

/** The title row at the top of every page, with optional buttons on the right. */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="btn-row">{actions}</div>}
    </div>
  );
}

/** A spinning circle with "Loading…" next to it. */
export function Loading() {
  return (
    <div className="empty" aria-busy="true">
      <span className="spinner" /> <span>{t.common.loading}</span>
    </div>
  );
}

/** A red box explaining what went wrong, with an optional "Try again" button. */
export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="alert alert-bad" role="alert">
      <span>{message}</span>{' '}
      {onRetry && (
        <button type="button" className="btn btn-secondary btn-small" onClick={onRetry}>
          {t.common.retry}
        </button>
      )}
    </div>
  );
}

/** A coloured information box. tone: info (blue), good (green), warn (amber), bad (red). */
export function Alert({ tone = 'info', title, children }: { tone?: 'info' | 'good' | 'warn' | 'bad'; title?: string; children?: ReactNode }) {
  return (
    <div className={`alert alert-${tone}`} role={tone === 'bad' ? 'alert' : undefined}>
      {title && <strong>{title}</strong>}
      {children}
    </div>
  );
}

/** Grey text in the middle of an empty table or list. */
export function EmptyState({ text = t.common.noData }: { text?: string }) {
  return <div className="empty">{text}</div>;
}

/** A small coloured pill label such as "Paid" or "Overdue". */
export function Badge({ tone = 'info', children }: { tone?: 'info' | 'good' | 'warn' | 'bad'; children: ReactNode }) {
  const cls = tone === 'info' ? 'badge' : `badge badge-${tone}`;
  return <span className={cls}>{children}</span>;
}

/** A label + input + hint + error message, wired together for screen readers. */
export function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !error && <span className="hint">{hint}</span>}
      {error && (
        <span className="error" id={`${id}-error`}>
          {error}
        </span>
      )}
    </div>
  );
}

/** A thin bar showing a percentage; red below the minimum, amber just above it. */
export function PercentBar({ percent, low, warn }: { percent: number | null; low: boolean; warn?: boolean }) {
  const width = Math.max(0, Math.min(100, percent ?? 0));
  return (
    <div className={`bar${low ? ' low' : warn ? ' warn' : ''}`} aria-hidden="true">
      <div style={{ width: `${width}%` }} />
    </div>
  );
}
