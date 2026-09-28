/*
 * The published weekly timetable: a student's section, or a teacher's own lectures.
 * Data: GET /api/timetable/me
 */
import { api } from '../../api/endpoints';
import { useUser } from '../../auth/AuthContext';
import { TimetableGrid } from '../../components/TimetableGrid';
import { EmptyState, ErrorBanner, Loading, PageHeader } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n/messages';

export function MyTimetablePage() {
  const user = useUser();
  const { data, error, loading, reload } = useLoad(() => api.timetable.mine(), []);

  return (
    <>
      <PageHeader title={t.timetable.myTitle} />
      {loading && <Loading />}
      {error && <ErrorBanner message={error} onRetry={reload} />}
      {data && data.length === 0 && <EmptyState text={t.timetable.empty} />}
      {data && data.length > 0 && (
        <div className="card">
          <TimetableGrid entries={data} showSection={user.role === 'FACULTY'} />
        </div>
      )}
    </>
  );
}
