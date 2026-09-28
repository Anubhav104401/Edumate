/*
 * Published semester results, newest first.
 * Data: GET /api/exams/results/me (served from the cache on results morning)
 *
 * On top: a line chart of SGPA and CGPA per semester, next to the current CGPA.
 * Below: one card per semester with its grade points and a table of courses. The table repeats
 * every number of the chart in plain text, so nothing depends on seeing the chart.
 */
import { GraduationCap } from 'lucide-react';
import type { CSSProperties } from 'react';
import { api } from '../../api/endpoints';
import type { SemesterResult } from '../../api/types';
import { TrendChart } from '../../components/charts';
import { Badge, EmptyState, ErrorBanner, IconTile, Loading, PageHeader, PercentBar } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n/messages';
import { CountUp } from '../../motion/CountUp';
import { formatDateTime } from '../../utils/format';
import { gradeHue } from '../../utils/visuals';

export function MyResultsPage() {
  const { data, error, loading, reload } = useLoad(() => api.exams.myResults(), []);
  const newestFirst = data ? [...data].reverse() : [];
  const latest = newestFirst[0];

  return (
    <>
      <PageHeader title={t.results.title} subtitle={t.results.subtitle} />
      {loading && <Loading />}
      {error && <ErrorBanner message={error} onRetry={reload} />}
      {data && data.length === 0 && <EmptyState icon={GraduationCap} text={t.results.none} />}

      {data && latest && (
        <div className="results-top">
          <div className="card">
            <h2 className="card-title">{t.results.trendTitle}</h2>
            <p className="muted small" style={{ marginTop: -6 }}>
              {t.results.trendHint}
            </p>
            <TrendChart
              points={data.map((sem) => ({ label: t.results.semShort(sem.semester), sgpa: sem.sgpa, cgpa: sem.cgpa }))}
            />
          </div>
          <LatestCard sem={latest} />
        </div>
      )}

      {newestFirst.map((sem) => (
        <SemesterCard key={sem.semester} sem={sem} />
      ))}
    </>
  );
}

/** The current CGPA as the page's one big number, with the latest semester beside it. */
function LatestCard({ sem }: { sem: SemesterResult }) {
  const creditShare = sem.creditsRegistered === 0 ? 0 : (sem.creditsEarned * 100) / sem.creditsRegistered;
  return (
    <div className="card gpa-hero">
      <IconTile icon={GraduationCap} size="lg" tone="accent" />
      <span className="muted small">{t.results.latest}</span>
      <strong className="gpa-hero-value">
        <CountUp value={sem.cgpa.toFixed(2)} />
      </strong>
      <div className="gpa-tiles">
        <div className="gpa-tile">
          <span>{t.results.sgpa}</span>
          <strong>{sem.sgpa.toFixed(2)}</strong>
        </div>
        <div className="gpa-tile">
          <span>{t.results.semester(sem.semester)}</span>
          <strong>
            <Badge tone={sem.outcome === 'PASS' ? 'good' : 'bad'}>{t.results.outcome[sem.outcome]}</Badge>
          </strong>
        </div>
      </div>
      <div className="small muted">
        {t.results.creditsTitle}: {t.common.of(sem.creditsEarned, sem.creditsRegistered)}
        <PercentBar percent={creditShare} low={creditShare < 100} warn={false} />
      </div>
    </div>
  );
}

function SemesterCard({ sem }: { sem: SemesterResult }) {
  return (
    <div className="card flush">
      <div className="card-header">
        <div>
          <h2>
            {t.results.semester(sem.semester)} <span className="muted small">{sem.examSessionName}</span>
          </h2>
          <div className="muted small">
            {t.results.credits(sem.creditsEarned, sem.creditsRegistered)} · {formatDateTime(sem.publishedAt)}
          </div>
        </div>
        <div className="gpa-tiles">
          <div className="gpa-tile">
            <span>{t.results.sgpa}</span>
            <strong>{sem.sgpa.toFixed(2)}</strong>
          </div>
          <div className="gpa-tile">
            <span>{t.results.cgpa}</span>
            <strong>{sem.cgpa.toFixed(2)}</strong>
          </div>
          <Badge tone={sem.outcome === 'PASS' ? 'good' : 'bad'}>{t.results.outcome[sem.outcome]}</Badge>
        </div>
      </div>
      {sem.courses.length === 0 ? (
        <p className="muted small" style={{ padding: '0 24px 16px' }}>
          {t.results.noCourseDetail}
        </p>
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
                    <span className="grade" style={{ '--hue': gradeHue(c.grade) } as CSSProperties}>
                      {c.grade}
                    </span>
                  </td>
                  <td className="num">{c.gradePoint}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
