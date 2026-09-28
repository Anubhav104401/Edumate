/*
 * Hall ticket eligibility, course by course, with the decision-table rule that decided each one.
 * Data: GET /api/exams/hall-ticket/me
 */
import { api } from '../../api/endpoints';
import { Alert, Badge, ErrorBanner, Loading, PageHeader } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n/messages';
import { formatDate, formatPercent } from '../../utils/format';

export function HallTicketPage() {
  const { data, error, loading, reload } = useLoad(() => api.exams.hallTicket(), []);

  return (
    <>
      <PageHeader title={t.hallTicket.title} subtitle={data ? t.hallTicket.subtitle(data.examSessionName) : undefined} />
      {loading && <Loading />}
      {error && <ErrorBanner message={error} onRetry={reload} />}
      {data && (
        <>
          <Alert tone={data.issued ? 'good' : 'warn'}>{data.issued ? t.hallTicket.issued : t.hallTicket.notIssued}</Alert>
          <div className="btn-row" style={{ marginBottom: 16 }}>
            <Badge tone={data.feePaid ? 'good' : 'bad'}>{data.feePaid ? t.hallTicket.feePaid : t.hallTicket.feeDue}</Badge>
            <span className="muted">{t.hallTicket.examsStart(formatDate(data.examsStartOn))}</span>
          </div>
          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t.hallTicket.columns.course}</th>
                  <th>{t.hallTicket.columns.attendance}</th>
                  <th>{t.hallTicket.columns.assessment}</th>
                  <th>{t.hallTicket.columns.exemption}</th>
                  <th>{t.hallTicket.columns.decision}</th>
                  <th>{t.hallTicket.columns.rule}</th>
                  <th>{t.hallTicket.columns.reasons}</th>
                </tr>
              </thead>
              <tbody>
                {data.courses.map((c) => (
                  <tr key={c.courseId}>
                    <td>
                      <strong>{c.courseCode}</strong> {c.courseName}
                    </td>
                    <td>
                      <Badge tone={c.attendanceOk ? 'good' : 'bad'}>{formatPercent(c.attendancePercent)}</Badge>
                    </td>
                    <td>{c.assessmentComplete ? t.hallTicket.complete : t.hallTicket.pending}</td>
                    <td>{c.medicalExemption ? t.common.yes : t.common.no}</td>
                    <td>
                      <Badge tone={c.eligible ? 'good' : 'bad'}>{c.eligible ? t.hallTicket.eligible : t.hallTicket.notEligible}</Badge>
                    </td>
                    <td className="mono">{c.rule}</td>
                    <td>{c.reasons.length ? c.reasons.join(', ') : t.common.none}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="small muted">{t.hallTicket.ruleHint}</p>
          </div>
        </>
      )}
    </>
  );
}
