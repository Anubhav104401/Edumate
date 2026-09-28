/*
 * The merit list and seat allocation for one programme (FR-05).
 * Data: GET /api/admissions/merit-list?programId=
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../../api/endpoints';
import { Badge, EmptyState, ErrorBanner, Field, Loading, PageHeader } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n/messages';
import { formatDateTime } from '../../utils/format';

export function MeritListPage() {
  const programs = useLoad(() => api.academic.programs(), []);
  const [programId, setProgramId] = useState<number | null>(null);
  const [requested, setRequested] = useState<number | null>(null);

  useEffect(() => {
    if (programs.data?.length && programId === null) {
      const pg = programs.data.find((p) => p.code === 'MTCSE') ?? programs.data[0];
      setProgramId(pg.id);
    }
  }, [programs.data, programId]);

  const list = useLoad(() => api.admissions.meritList(requested!), [requested], requested !== null);

  return (
    <>
      <PageHeader title={t.merit.title} subtitle={t.merit.subtitle} />
      {programs.data && (
        <div className="card toolbar">
          <Field id="programme" label={t.common.programme}>
            <select id="programme" value={programId ?? ''} onChange={(e) => setProgramId(Number(e.target.value))}>
              {programs.data.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.totalSeats})
                </option>
              ))}
            </select>
          </Field>
          <button type="button" className="btn" onClick={() => { setRequested(programId); list.reload(); }}>
            {t.merit.generate}
          </button>
        </div>
      )}
      {list.loading && <Loading />}
      {list.error && <ErrorBanner message={list.error} />}
      {list.data && (
        <>
          <div className="grid">
            {Object.entries(list.data.seatMatrix).map(([category, seats]) => (
              <div key={category} className="stat tone-neutral">
                <div className="stat-label">
                  {t.merit.seats}: {category}
                </div>
                <div className="stat-value">{seats}</div>
                <div className="stat-hint">{t.merit.filled(list.data!.seatsFilled[category] ?? 0, seats)}</div>
              </div>
            ))}
          </div>
          <p className="small muted">{formatDateTime(list.data.generatedAt)}</p>
          {list.data.entries.length === 0 ? (
            <EmptyState text={t.merit.empty} />
          ) : (
            <div className="card table-wrap">
              <table>
                <thead>
                  <tr>
                    <th className="num">{t.merit.columns.rank}</th>
                    <th>{t.merit.columns.application}</th>
                    <th>{t.merit.columns.name}</th>
                    <th>{t.merit.columns.category}</th>
                    <th className="num">{t.merit.columns.entrance}</th>
                    <th className="num">{t.merit.columns.qualifying}</th>
                    <th className="num">{t.merit.columns.score}</th>
                    <th>{t.merit.columns.seat}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.entries.map((e) => (
                    <tr key={e.applicationId}>
                      <td className="num">{e.rank}</td>
                      <td className="mono">
                        <Link to={`/admissions/${e.applicationId}`}>{e.applicationNo}</Link>
                      </td>
                      <td>{e.fullName}</td>
                      <td>{e.category}</td>
                      <td className="num">{e.entranceScore.toFixed(2)}</td>
                      <td className="num">{e.qualifyingPercent.toFixed(2)}</td>
                      <td className="num">
                        <strong>{e.meritScore.toFixed(2)}</strong>
                      </td>
                      <td>
                        {e.waitlistNumber ? (
                          <Badge tone="warn">{t.merit.waitlist(e.waitlistNumber)}</Badge>
                        ) : (
                          <Badge tone="good">{e.allocation}</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
