/*
 * A dashboard tile: an icon, a label, a big number that counts up, and a hint.
 * If it has a link, the whole tile is clickable, lifts on hover, and a soft light
 * follows the mouse across it (the "spotlight": the mouse position is written into
 * the CSS variables --mx / --my, which the .stat::before gradient in app.css uses).
 */
import { ArrowUpRight, type LucideIcon } from 'lucide-react';
import type { PointerEvent, ReactNode } from 'react';
import { Link } from 'react-router';
import { CountUp } from '../motion/CountUp';
import { IconTile } from './ui';

type Tone = 'good' | 'warn' | 'bad' | 'neutral';

interface Props {
  label: string;
  value: string;
  hint?: ReactNode;
  tone?: Tone;
  icon: LucideIcon;
  to?: string;
}

/** Moves the spotlight to where the pointer is inside the tile (also used by the welcome page's tiles). */
export function followPointer(event: PointerEvent<HTMLElement>) {
  const box = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty('--mx', `${event.clientX - box.left}px`);
  event.currentTarget.style.setProperty('--my', `${event.clientY - box.top}px`);
}

export function StatCard({ label, value, hint, tone = 'neutral', icon, to }: Props) {
  const body = (
    <>
      <div className="stat-top">
        <IconTile icon={icon} tone={tone} />
        {to && <ArrowUpRight size={18} className="stat-arrow" aria-hidden="true" />}
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">
        <CountUp value={value} />
      </div>
      {hint && <div className="stat-hint">{hint}</div>}
    </>
  );

  const className = `stat tone-${tone}`;
  return to ? (
    <Link to={to} className={className} onPointerMove={followPointer}>
      {body}
    </Link>
  ) : (
    <div className={className} onPointerMove={followPointer}>
      {body}
    </div>
  );
}
