/*
 * Draws a week as a grid: one row per day, one column per period.
 * Used by "My timetable" (students, teachers) and by the administrator's planning page.
 *
 * Each course gets its own colour (worked out from its code, so it is the same everywhere),
 * today's row is highlighted, and the lecture running right now glows.
 */
import type { CSSProperties, ReactNode } from 'react';
import type { TimetableEntry } from '../api/types';
import { DAYS, PERIOD_LENGTH_MINUTES, PERIOD_STARTS, PERIODS } from '../config';
import { t } from '../i18n/messages';
import { hueFor, periodAt } from '../utils/visuals';

interface Props {
  entries: TimetableEntry[];
  clashIds?: Set<number>;
  showSection?: boolean;
  actions?: (entry: TimetableEntry) => ReactNode;
}

/** Today's day number (Monday = 1 … Sunday = 7) and the period running now, if any. */
export function nowInWeek(): { today: number; period: number | null } {
  const now = new Date();
  const today = now.getDay() === 0 ? 7 : now.getDay();
  return { today, period: periodAt(now.getHours() * 60 + now.getMinutes(), PERIOD_STARTS, PERIOD_LENGTH_MINUTES) };
}

export function TimetableGrid({ entries, clashIds, showSection, actions }: Props) {
  const now = nowInWeek();
  const at = (day: number, period: number) => entries.filter((e) => e.day === day && e.period === period);

  return (
    <div className="tt-scroll">
      <div className="tt-grid" role="table" aria-label={t.timetable.myTitle}>
        <div className="tt-head" />
        {PERIODS.map((p) => (
          <div key={`h${p}`} className="tt-head" role="columnheader">
            {t.timetable.periodLabel(p)} <span className="muted">{t.timetable.periodTimes[p]}</span>
          </div>
        ))}
        {DAYS.map((day) => (
          <DayRow key={day} day={day} at={at} clashIds={clashIds} showSection={showSection} actions={actions} now={now} />
        ))}
      </div>
    </div>
  );
}

function DayRow({
  day,
  at,
  clashIds,
  showSection,
  actions,
  now,
}: {
  day: number;
  at: (day: number, period: number) => TimetableEntry[];
  clashIds?: Set<number>;
  showSection?: boolean;
  actions?: (entry: TimetableEntry) => ReactNode;
  now: { today: number; period: number | null };
}) {
  const isToday = day === now.today;
  return (
    <>
      <div className={`tt-head tt-day${isToday ? ' today' : ''}`} role="rowheader">
        {t.timetable.days[day]}
      </div>
      {PERIODS.map((period) => {
        const here = at(day, period);
        const clash = here.some((e) => clashIds?.has(e.id));
        const classes = ['tt-cell', here.length > 0 && 'filled', clash && 'clash', isToday && 'today'].filter(Boolean).join(' ');
        return (
          <div key={period} className={classes} role="cell">
            {here.map((e) => (
              <div
                key={e.id}
                className={`tt-entry${isToday && now.period === period ? ' tt-now' : ''}`}
                style={{ '--hue': hueFor(e.courseCode) } as CSSProperties}
                title={e.courseName}
              >
                <strong>{e.courseCode}</strong>
                {showSection && <span className="muted"> · {e.section}</span>}
                <div className="small muted">{e.facultyName}</div>
                <div className="small muted">{e.room}</div>
                {actions?.(e)}
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}
