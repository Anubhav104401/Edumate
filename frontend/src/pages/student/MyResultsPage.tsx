/*
 * Published semester results, newest first.
 * Data: GET /api/exams/results/me (served from the cache on results morning)
 */
import { api } from '../../api/endpoints';
import { Badge, EmptyState, ErrorBanner, Loading, PageHeader } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n/messages';
import { formatDateTime } from '../../utils/format';

export function MyResultsPage() {
  const { data, error, loading, reload } = useLoad(() => api.exams.myResults(), []);
  const newestFirst = data ? [...data].reverse() : [];

  return (
    <>
      <PageHeader title={t.results.title} subtitle={t.results.subtitle} />
      {loading && <Loading />}
      {error && <ErrorBanner message={error} onRetry={reload} />}
      {data && data.length === 0 && <EmptyState text={t.results.none} />}
      {newestFirst.map((sem) => (
        <div key={sem.semester} className="card">
          <div className="page-header" style={{ marginBottom: 8 }}>
            <div>
              <h2>
                {t.results.semester(sem.semester)} <span className="muted small">{sem.examSessionName}</span>
              </h2>
              <div className="muted small">
                {t.results.credits(sem.creditsEarned, sem.creditsRegistered)} · {formatDateTime(sem.publishedAt)}
              </div>
            </div>
            <div className="btn-row">
              <span>
                {t.results.sgpa} <strong>{sem.sgpa.toFixed(2)}</strong>
              </span>
              <span>
                {t.results.cgpa} <strong>{sem.cgpa.toFixed(2)}</strong>
              </span>
              <Badge tone={sem.outcome === 'PASS' ? 'good' : 'bad'}>{t.results.outcome[sem.outcome]}</Badge>
            </div>
          </div>
          {sem.courses.length === 0 ? (
            <p className="muted small">{t.results.noCourseDetail}</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t.results.columns.code}</th>
                    <th>{t.results.columns.course}</th>
                    <th className="num">{t.results.columns.credits}</th>
                    <th className="num">{t.results.columns.marks}</th>
                    <th>{t.results.columns.grade}</th>
                    <th className="num">{t.results.columns.points}</th>
                  </tr>
                </thead>
                <tbody>
                  {sem.courses.map((c) => (
                    <tr key={c.courseCode}>
                      <td className="mono">{c.courseCode}</td>
                      <td>{c.courseName}</td>
                      <td className="num">{c.credits}</td>
                      <td className="num">{c.totalMarks.toFixed(2)}</td>
                      <td>
                        <Badge tone={c.grade === 'F' ? 'bad' : 'good'}>{c.grade}</Badge>
                      </td>
                      <td className="num">{c.gradePoint}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </>
  );
}
