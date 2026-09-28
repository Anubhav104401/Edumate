/*
 * Draws a week as a grid: one row per day, one column per period.
 * Used by "My timetable" (students, teachers) and by the administrator's planning page.
 */
import type { ReactNode } from 'react';
import type { TimetableEntry } from '../api/types';
import { DAYS, PERIODS } from '../config';
import { t } from '../i18n/messages';

interface Props {
  entries: TimetableEntry[];
  clashIds?: Set<number>;
  showSection?: boolean;
  actions?: (entry: TimetableEntry) => ReactNode;
}

export function TimetableGrid({ entries, clashIds, showSection, actions }: Props) {
  const at = (day: number, period: number) => entries.filter((e) => e.day === day && e.period === period);

  return (
    <div className="tt-grid" role="table" aria-label={t.timetable.myTitle}>
      <div className="tt-head" />
      {PERIODS.map((p) => (
        <div key={`h${p}`} className="tt-head" role="columnheader">
          {t.timetable.periodLabel(p)} <span className="muted">{t.timetable.periodTimes[p]}</span>
        </div>
      ))}
      {DAYS.map((day) => (
        <DayRow key={day} day={day} at={at} clashIds={clashIds} showSection={showSection} actions={actions} />
      ))}
    </div>
  );
}

function DayRow({ day, at, clashIds, showSection, actions }: {
  day: number;
  at: (day: number, period: number) => TimetableEntry[];
  clashIds?: Set<number>;
  showSection?: boolean;
  actions?: (entry: TimetableEntry) => ReactNode;
}) {
  return (
    <>
      <div className="tt-head" role="rowheader">
        {t.timetable.days[day]}
      </div>
      {PERIODS.map((period) => {
        const here = at(day, period);
        const clash = here.some((e) => clashIds?.has(e.id));
        return (
          <div key={period} className={`tt-cell${here.length ? ' filled' : ''}${clash ? ' clash' : ''}`} role="cell">
            {here.map((e) => (
              <div key={e.id} title={e.courseName}>
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
