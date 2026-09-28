/*
 * The published weekly timetable: a student's section, or a teacher's own lectures.
 * Data: GET /api/timetable/me
 *
 * First "Today": today's lectures in order, as a row of cards. Then the whole week as a grid.
 */
import { CalendarDays, Clock, MapPin } from 'lucide-react';
import type { CSSProperties } from 'react';
import { api } from '../../api/endpoints';
import { useUser } from '../../auth/AuthContext';
import { TimetableGrid, nowInWeek } from '../../components/TimetableGrid';
import { EmptyState, ErrorBanner, Loading, PageHeader } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n/messages';
import { Stagger, StaggerItem } from '../../motion/Reveal';
import { hueFor } from '../../utils/visuals';

export function MyTimetablePage() {
  const user = useUser();
  const now = nowInWeek();
  const { data, error, loading, reload } = useLoad(() => api.timetable.mine(), []);
  const today = (data ?? []).filter((e) => e.day === now.today).sort((a, b) => a.period - b.period);

  return (
    <>
      <PageHeader title={t.timetable.myTitle} />
      {loading && <Loading />}
      {error && <ErrorBanner message={error} onRetry={reload} />}
      {data && data.length === 0 && <EmptyState icon={CalendarDays} text={t.timetable.empty} />}
      {data && data.length > 0 && (
        <>
          <div className="card">
            <h2 className="card-title">{t.timetable.todayTitle}</h2>
            {today.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                {t.timetable.noneToday}
              </p>
            ) : (
              <Stagger className="today-strip" gap={0.07}>
                {today.map((e) => (
                  <StaggerItem key={e.id}>
                    <div
                      className={`tt-entry${now.period === e.period ? ' tt-now' : ''}`}
                      style={{ '--hue': hueFor(e.courseCode) } as CSSProperties}
                    >
                      <div className="small muted">
                        <Clock size={12} /> {t.timetable.periodLabel(e.period)} · {t.timetable.periodTimes[e.period]}
                      </div>
                      <strong>{e.courseCode}</strong> <span className="small">{e.courseName}</span>
                      <div className="small muted">
                        <MapPin size={12} /> {e.room} · {user.role === 'FACULTY' ? e.section : e.facultyName}
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </Stagger>
            )}
          </div>
          <div className="card">
            <h2 className="card-title">{t.timetable.weekTitle}</h2>
            <TimetableGrid entries={data} showSection={user.role === 'FACULTY'} />
          </div>
        </>
      )}
    </>
  );
}
