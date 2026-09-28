/*
 * Hall ticket eligibility, course by course, with the decision-table rule that decided each one.
 * Data: GET /api/exams/hall-ticket/me
 *
 * Drawn like a real admit card: the candidate's details on the left, a tear-off stub on the right
 * with an "ELIGIBLE" / "NOT YET" stamp that thumps down, and the course-by-course decision below.
 * The Print button prints just the ticket (app.css hides the menus when printing).
 */
import { CircleCheck, CircleX, Printer, Ticket } from 'lucide-react';
import { api } from '../../api/endpoints';
import { Badge, ErrorBanner, IconTile, Loading, PageHeader } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n/messages';
import { Stagger, StaggerItem } from '../../motion/Reveal';
import { formatDate, formatPercent } from '../../utils/format';

export function HallTicketPage() {
  const { data, error, loading, reload } = useLoad(() => api.exams.hallTicket(), []);

  return (
    <>
      <PageHeader
        title={t.hallTicket.title}
        subtitle={data ? t.hallTicket.subtitle(data.examSessionName) : undefined}
        actions={
          data && (
            <button type="button" className="btn btn-secondary no-print" onClick={() => window.print()}>
              <Printer size={16} /> {t.common.print}
            </button>
          )
        }
      />
      {loading && <Loading />}
      {error && <ErrorBanner message={error} onRetry={reload} />}
      {data && (
        <>
          <div className={`ticket ${data.issued ? 'tone-good' : 'tone-warn'}`}>
            <div className="ticket-main">
              <div className="ticket-head">
                <IconTile icon={Ticket} size="lg" tone={data.issued ? 'good' : 'warn'} />
                <div>
                  <h2>{data.examSessionName}</h2>
                  <span className="muted small">{data.issued ? t.hallTicket.issued : t.hallTicket.notIssued}</span>
                </div>
              </div>
              <div className="ticket-facts">
                <div>
                  <span>{t.hallTicket.candidate}</span>
                  <strong>{data.fullName}</strong>
                </div>
                <div>
                  <span>{t.hallTicket.usn}</span>
                  <strong className="mono">{data.usn}</strong>
                </div>
                <div>
                  <span>{t.hallTicket.session}</span>
                  <strong className="mono">{data.examSessionCode}</strong>
                </div>
                <div>
                  <span>{t.hallTicket.startsOn}</span>
                  <strong>{formatDate(data.examsStartOn)}</strong>
                </div>
              </div>
              <Badge tone={data.feePaid ? 'good' : 'bad'}>{data.feePaid ? t.hallTicket.feePaid : t.hallTicket.feeDue}</Badge>
            </div>
            <div className="ticket-stub">
              <span className="stamp">{data.issued ? t.hallTicket.stampYes : t.hallTicket.stampNo}</span>
              <span className="muted small">{t.hallTicket.examsStart(formatDate(data.examsStartOn))}</span>
            </div>
          </div>

          <div className="card">
            <h2 className="card-title">{t.hallTicket.coursesTitle}</h2>
            <Stagger className="eligibility-list" gap={0.05} delay={0.2}>
              {data.courses.map((c) => (
                <StaggerItem key={c.courseId} className="eligibility-row">
                  {c.eligible ? (
                    <CircleCheck size={22} style={{ color: 'var(--color-good)' }} aria-hidden="true" />
                  ) : (
                    <CircleX size={22} style={{ color: 'var(--color-bad)' }} aria-hidden="true" />
                  )}
                  <div>
                    <h3>
                      <span className="mono muted">{c.courseCode}</span> {c.courseName}
                    </h3>
                    <div className="meta-row">
                      <span>
                        {t.hallTicket.columns.attendance}:{' '}
                        <Badge tone={c.attendanceOk ? 'good' : 'bad'}>{formatPercent(c.attendancePercent)}</Badge>
                      </span>
                      <span>
                        {t.hallTicket.columns.assessment}: {c.assessmentComplete ? t.hallTicket.complete : t.hallTicket.pending}
                      </span>
                      <span>
                        {t.hallTicket.columns.exemption}: {c.medicalExemption ? t.common.yes : t.common.no}
                      </span>
                      <span className="chip mono">
                        {t.hallTicket.columns.rule} {c.rule}
                      </span>
                    </div>
                    {c.reasons.length > 0 && (
                      <div className="small muted" style={{ marginTop: 4 }}>
                        {t.hallTicket.columns.reasons}: {c.reasons.join(', ')}
                      </div>
                    )}
                  </div>
                  <Badge tone={c.eligible ? 'good' : 'bad'}>
                    {c.eligible ? t.hallTicket.eligible : t.hallTicket.notEligible}
                  </Badge>
                </StaggerItem>
              ))}
            </Stagger>
            <p className="small muted" style={{ marginBottom: 0 }}>
              {t.hallTicket.ruleHint}
            </p>
          </div>
        </>
      )}
    </>
  );
}
