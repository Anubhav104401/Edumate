/*
 * Small reusable pieces of screen used by many pages.
 */
import { motion } from 'motion/react';
import { CircleAlert, CircleCheck, Info, Inbox, RotateCw, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { useLocation } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { t } from '../i18n/messages';
import { EASE_OUT, SPRING } from '../motion/presets';
import { findNavItem } from '../navigation';
import { hueFor, initials } from '../utils/visuals';

type Tone = 'info' | 'good' | 'warn' | 'bad';

const TONE_ICONS: Record<Tone, LucideIcon> = { info: Info, good: CircleCheck, warn: TriangleAlert, bad: CircleAlert };

/**
 * The title row at the top of every page, with optional buttons on the right.
 * Above the title sits a small "eyebrow": the icon and section of this page's menu item,
 * found automatically from the address, so every page gets one without having to ask.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  icon,
  eyebrow,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  icon?: LucideIcon;
  eyebrow?: string;
}) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const item = user ? findNavItem(user.role, pathname) : undefined;
  const Icon = icon ?? item?.icon;
  const label = eyebrow ?? item?.section;
  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, ease: EASE_OUT, delay },
  });

  return (
    <div className="page-header">
      <div>
        {label && (
          <motion.div className="page-eyebrow" {...rise(0)}>
            {Icon && (
              <span className="page-eyebrow-icon">
                <Icon size={14} />
              </span>
            )}
            {label}
          </motion.div>
        )}
        <motion.h1 {...rise(0.05)}>{title}</motion.h1>
        {subtitle && <motion.p {...rise(0.1)}>{subtitle}</motion.p>}
      </div>
      {actions && (
        <motion.div className="btn-row" {...rise(0.15)}>
          {actions}
        </motion.div>
      )}
    </div>
  );
}

/**
 * Grey shimmering placeholders shaped like the content that is on its way ("skeleton screen").
 * People perceive this as faster than a spinner, because the page already has its shape.
 * Screen readers hear "Loading…". `inline` drops the card frame, for use inside an existing card.
 */
export function Loading({ rows = 4, inline = false }: { rows?: number; inline?: boolean }) {
  return (
    <div className={inline ? 'skeleton-card' : 'card skeleton-card'} aria-busy="true" aria-live="polite">
      <span className="sr-only">{t.common.loading}</span>
      <div className="skeleton-row">
        <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 12 }} />
        <div style={{ flex: 1, display: 'grid', gap: 8 }}>
          <div className="skeleton" style={{ width: '32%', height: 14 }} />
          <div className="skeleton" style={{ width: '54%', height: 10 }} />
        </div>
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton" style={{ height: 38, opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  );
}

/** A red box explaining what went wrong, with an optional "Try again" button. */
export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="alert alert-bad" role="alert">
      <CircleAlert size={18} className="alert-icon" />
      <div className="alert-body">{message}</div>
      {onRetry && (
        <button type="button" className="btn btn-secondary btn-small" onClick={onRetry}>
          <RotateCw size={14} /> {t.common.retry}
        </button>
      )}
    </div>
  );
}

/** A coloured information box with a matching icon. tone: info (blue), good (green), warn (amber), bad (red). */
export function Alert({ tone = 'info', title, children }: { tone?: Tone; title?: string; children?: ReactNode }) {
  const Icon = TONE_ICONS[tone];
  return (
    <div className={`alert alert-${tone}`} role={tone === 'bad' ? 'alert' : undefined}>
      <Icon size={18} className="alert-icon" />
      <div className="alert-body">
        {title && <strong>{title}</strong>}
        {children}
      </div>
    </div>
  );
}

/** A friendly empty state: a floating icon and a line of grey text. */
export function EmptyState({ text = t.common.noData, icon: Icon = Inbox }: { text?: string; icon?: LucideIcon }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon size={28} />
      </div>
      <div>{text}</div>
    </div>
  );
}

/** A small coloured pill label such as "Paid" or "Overdue", with a status dot. */
export function Badge({ tone = 'info', plain, children }: { tone?: Tone; plain?: boolean; children: ReactNode }) {
  const cls = ['badge', tone !== 'info' && `badge-${tone}`, plain && 'badge-plain'].filter(Boolean).join(' ');
  return <span className={cls}>{children}</span>;
}

/** A label + input + hint + error message, wired together for screen readers. */
export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !error && <span className="hint">{hint}</span>}
      {error && (
        <motion.span className="error" id={`${id}-error`} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
          <CircleAlert size={12} /> {error}
        </motion.span>
      )}
    </div>
  );
}

/** A thin bar showing a percentage; red below the minimum, amber just above it. It grows in when drawn. */
export function PercentBar({ percent, low, warn }: { percent: number | null; low: boolean; warn?: boolean }) {
  const width = Math.max(0, Math.min(100, percent ?? 0));
  return (
    <div className={`bar${low ? ' low' : warn ? ' warn' : ''}`} aria-hidden="true">
      <div style={{ width: `${width}%` }} />
    </div>
  );
}

/** A rounded square with an icon inside, tinted with a tone colour. */
export function IconTile({
  icon: Icon,
  tone = 'info',
  size = 'md',
}: {
  icon: LucideIcon;
  tone?: Tone | 'neutral' | 'accent';
  size?: 'sm' | 'md' | 'lg';
}) {
  const px = size === 'sm' ? 16 : size === 'lg' ? 24 : 20;
  return (
    <span className={`icon-tile tone-${tone}${size === 'md' ? '' : ' ' + size}`} aria-hidden="true">
      <Icon size={px} />
    </span>
  );
}

/** A round badge with someone's initials, in a colour worked out from their name. */
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const style = { '--hue': hueFor(name) } as CSSProperties;
  return (
    <span className={`avatar${size === 'md' ? '' : ' avatar-' + size}`} style={style} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

/**
 * Two or three joined buttons where exactly one is chosen (like "Draft | Published").
 * The raised background slides to the chosen button (motion's shared layout animation).
 */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  id,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
  /** Must be unique on the page: it names the sliding background. */
  id: string;
}) {
  return (
    <div className="segmented" role="group">
      {options.map((option) => (
        <button key={option.value} type="button" aria-pressed={option.value === value} onClick={() => onChange(option.value)}>
          {option.value === value && <motion.span layoutId={`seg-${id}`} className="seg-pill" transition={SPRING} />}
          <span className="seg-label">{option.label}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * A step tracker: circles joined by a line, e.g. Computed → 1st approval → 2nd approval → Published.
 * Steps before `current` are done (filled), `current` is ringed, later ones are grey.
 * `stopped` marks the current step red instead (for example a rejected application).
 */
export function Steps({
  labels,
  current,
  stopped = false,
  compact = false,
}: {
  labels: string[];
  current: number;
  stopped?: boolean;
  compact?: boolean;
}) {
  return (
    <ol className={compact ? 'steps compact' : 'steps'}>
      {labels.map((label, i) => {
        const state = i < current ? 'done' : i === current ? (stopped ? 'current stopped' : 'current') : '';
        return (
          <li key={label} className={state} aria-current={i === current ? 'step' : undefined}>
            <motion.span
              className="step-dot"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ ...SPRING, delay: i * 0.06 }}
            >
              {i < current ? <CircleCheck size={14} /> : i + 1}
            </motion.span>
            <span className="step-label">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
