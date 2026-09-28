/*
 * Hand-drawn SVG charts. SVG is a way of drawing with shapes (circles, lines, paths) that stay
 * sharp at any size; motion animates them as they scroll into view.
 *
 *   <Ring percent={75} tone="good">75%</Ring>          a progress ring (a "meter")
 *   <TrendChart points={[{ label, sgpa, cgpa }, ...]} />  SGPA and CGPA per semester
 *
 * The rules they follow: thin lines, solid hairline grid, a legend for two series, labels only at
 * the ends, numbers written in text colours (never in the line colours), a hover/keyboard read-out,
 * and a colour pair that stays distinguishable for colour-blind readers. Every value shown here is
 * also written out in plain text on the same page, so nothing depends on the chart alone.
 */
import { motion } from 'motion/react';
import { useId, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { t } from '../i18n/messages';
import { EASE_OUT } from '../motion/presets';
import { clamp } from '../utils/visuals';

type Tone = 'good' | 'warn' | 'bad' | 'info';

// ---------------------------------------------------------------- the progress ring
export function Ring({
  percent,
  size = 76,
  stroke = 7,
  tone = 'info',
  delay = 0,
  children,
}: {
  percent: number | null;
  size?: number;
  stroke?: number;
  tone?: Tone;
  delay?: number;
  children?: ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = clamp(percent ?? 0, 0, 100) / 100;
  const centre = size / 2;

  return (
    <div className={`ring tone-${tone}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="ring-track" cx={centre} cy={centre} r={radius} fill="none" strokeWidth={stroke} />
        <motion.circle
          className="ring-fill"
          cx={centre}
          cy={centre}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          whileInView={{ strokeDashoffset: circumference * (1 - filled) }}
          viewport={{ once: true }}
          transition={{ duration: 1.3, ease: EASE_OUT, delay }}
        />
      </svg>
      <div className="ring-value">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------- the SGPA / CGPA trend
export interface TrendPoint {
  label: string;
  sgpa: number;
  cgpa: number;
}

const W = 640;
const H = 240;
const PAD = { left: 34, right: 78, top: 16, bottom: 30 };

export function TrendChart({ points }: { points: TrendPoint[] }) {
  const gradientId = useId();
  const [active, setActive] = useState<number | null>(null);

  const values = points.flatMap((p) => [p.sgpa, p.cgpa]);
  const yMin = Math.max(0, Math.floor(Math.min(...values) - 1));
  const yMax = 10; // the 10-point scale
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length === 1 ? plotW / 2 : (i * plotW) / (points.length - 1));
  const y = (v: number) => PAD.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;
  const ticks = Array.from({ length: yMax - yMin + 1 }, (_, i) => yMin + i).filter((v) => (yMax - yMin > 5 ? v % 2 === 0 : true));

  const line = (key: 'sgpa' | 'cgpa') => points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p[key])}`).join(' ');
  const area = `${line('sgpa')} L${x(points.length - 1)},${y(yMin)} L${x(0)},${y(yMin)} Z`;

  const last = points.length - 1;
  const endGap = Math.abs(y(points[last].sgpa) - y(points[last].cgpa));
  const showEndLabels = endGap >= 14; // labels that would overlap are left to the legend and the read-out

  /** The crosshair snaps to the semester nearest the pointer. */
  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - box.left) / box.width) * W;
    let nearest = 0;
    points.forEach((_, i) => {
      if (Math.abs(x(i) - px) < Math.abs(x(nearest) - px)) nearest = i;
    });
    setActive(nearest);
  };

  /** The same read-out from the keyboard: Tab to the chart, then Left / Right arrows. */
  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key === 'ArrowRight') setActive((i) => Math.min(last, (i ?? -1) + 1));
    else if (event.key === 'ArrowLeft') setActive((i) => Math.max(0, (i ?? points.length) - 1));
    else return;
    event.preventDefault();
  };

  const draw = (delay: number) => ({
    initial: { pathLength: 0 },
    whileInView: { pathLength: 1 },
    viewport: { once: true },
    transition: { duration: 1.4, ease: EASE_OUT, delay },
  });

  return (
    <div className="trend-wrap">
      <div className="legend">
        <span>
          <i className="line-key series-1" /> {t.results.sgpa}
        </span>
        <span>
          <i className="line-key series-2" /> {t.results.cgpa}
        </span>
      </div>
      <svg
        className="trend"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${t.results.trendTitle}: ${points.map((p) => `${p.label} ${t.results.sgpa} ${p.sgpa.toFixed(2)}, ${t.results.cgpa} ${p.cgpa.toFixed(2)}`).join('; ')}`}
        tabIndex={0}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive(last)}
        onBlur={() => setActive(null)}
        onKeyDown={onKeyDown}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="white" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id={`${gradientId}-mask`}>
            <rect x="0" y="0" width={W} height={H} fill={`url(#${gradientId})`} />
          </mask>
        </defs>

        {ticks.map((v) => (
          <g key={v}>
            <line className="trend-grid" x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} />
            <text className="trend-axis" x={PAD.left - 10} y={y(v) + 4} textAnchor="end">
              {v}
            </text>
          </g>
        ))}
        {points.map((p, i) => (
          <text key={p.label} className="trend-axis" x={x(i)} y={H - 8} textAnchor="middle">
            {p.label}
          </text>
        ))}

        <motion.path
          className="trend-area"
          d={area}
          mask={`url(#${gradientId}-mask)`}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.6 }}
        />
        <motion.path className="trend-line series-2" d={line('cgpa')} {...draw(0.15)} />
        <motion.path className="trend-line series-1" d={line('sgpa')} {...draw(0)} />

        {active !== null && <line className="trend-cross" x1={x(active)} x2={x(active)} y1={PAD.top} y2={H - PAD.bottom} />}

        {points.map((p, i) => (
          <g key={p.label}>
            <circle className="trend-dot series-2" cx={x(i)} cy={y(p.cgpa)} r={active === i ? 6 : 4} />
            <circle className="trend-dot series-1" cx={x(i)} cy={y(p.sgpa)} r={active === i ? 6 : 4} />
          </g>
        ))}

        {showEndLabels && (
          <>
            <text className="trend-label" x={x(last) + 12} y={y(points[last].sgpa) + 4}>
              {t.results.sgpa} {points[last].sgpa.toFixed(2)}
            </text>
            <text className="trend-label" x={x(last) + 12} y={y(points[last].cgpa) + 4}>
              {t.results.cgpa} {points[last].cgpa.toFixed(2)}
            </text>
          </>
        )}
      </svg>

      {active !== null && (
        <div className="chart-tip" style={{ left: `${(x(active) / W) * 100}%` }} aria-live="polite">
          <div className="chart-tip-title">{points[active].label}</div>
          <div className="chart-tip-row">
            <i className="line-key series-1" /> <strong>{points[active].sgpa.toFixed(2)}</strong> <span>{t.results.sgpa}</span>
          </div>
          <div className="chart-tip-row">
            <i className="line-key series-2" /> <strong>{points[active].cgpa.toFixed(2)}</strong> <span>{t.results.cgpa}</span>
          </div>
        </div>
      )}
    </div>
  );
}
