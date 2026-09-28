/*
 * The merit list and seat allocation for one programme (FR-05).
 * Data: GET /api/admissions/merit-list?programId=
 *
 * The seat matrix is a row of tiles, each with a bar showing how many seats are filled.
 * The top three ranks wear a medal.
 */
import { Armchair, Medal, Sparkles } from 'lucide-react';
import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { api } from '../../api/endpoints';
import { StatCard } from '../../components/StatCard';
import { Badge, EmptyState, ErrorBanner, Field, Loading, PageHeader, PercentBar } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n/messages';
import { Stagger, StaggerItem } from '../../motion/Reveal';
import { formatDateTime } from '../../utils/format';

/** Gold, silver and bronze hues for ranks 1, 2 and 3. */
const MEDAL_HUES = [85, 250, 45];

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
          <button
            type="button"
            className="btn"
            onClick={() => {
              setRequested(programId);
              list.reload();
            }}
          >
            <Sparkles size={16} /> {t.merit.generate}
          </button>
        </div>
      )}
      {list.loading && <Loading />}
      {list.error && <ErrorBanner message={list.error} />}
      {list.data && (
        <>
          <Stagger className="grid" gap={0.06}>
            {Object.entries(list.data.seatMatrix).map(([category, seats]) => {
              const filled = list.data!.seatsFilled[category] ?? 0;
              return (
                <StaggerItem key={category}>
                  <StatCard
                    icon={Armchair}
                    tone={filled >= seats ? 'good' : 'neutral'}
                    label={`${t.merit.seats}: ${category}`}
                    value={String(seats)}
                    hint={
                      <>
                        {t.merit.filled(filled, seats)}
                        <PercentBar percent={seats === 0 ? 0 : (filled * 100) / seats} low={false} warn={filled < seats} />
                      </>
                    }
                  />
                </StaggerItem>
              );
            })}
          </Stagger>
          <p className="small muted">{formatDateTime(list.data.generatedAt)}</p>
          {list.data.entries.length === 0 ? (
            <EmptyState icon={Medal} text={t.merit.empty} />
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
                      <td className="num">
                        {e.rank <= 3 ? (
                          <span className="rank-medal" style={{ '--hue': MEDAL_HUES[e.rank - 1] } as CSSProperties}>
                            {e.rank}
                          </span>
                        ) : (
                          e.rank
                        )}
                      </td>
                      <td className="mono">
                        <Link to={`/admissions/${e.applicationId}`}>{e.applicationNo}</Link>
                      </td>
                      <td>
                        <strong>{e.fullName}</strong>
                      </td>
                      <td>
                        <span className="chip">{e.category}</span>
                      </td>
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
