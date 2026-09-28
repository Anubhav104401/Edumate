/*
 * The examination superintendent's results workflow:
 *   Compute  ->  Approve (person 1)  ->  Approve (person 2, must be different)  ->  Publish
 * Every button calls the backend, which enforces the rules; this page only shows the right buttons.
 * Each result set is a card with a step tracker, so it is obvious how far along it is.
 */
import { BadgeCheck, Calculator, FileChartColumn, LoaderCircle, Send, Workflow } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../api/endpoints';
import { errorMessage } from '../../api/http';
import type { ResultSetView, ResultStatus } from '../../api/types';
import { useConfirm } from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';
import { Badge, EmptyState, ErrorBanner, Field, IconTile, Loading, PageHeader, Steps } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n/messages';
import { Stagger, StaggerItem } from '../../motion/Reveal';
import { formatDateTime } from '../../utils/format';
import { ConsolidatedReportView } from './ConsolidatedReportView';

const STATUS_TONE = {
  DRAFT: 'warn',
  COMPUTED: 'warn',
  AWAITING_SECOND_APPROVAL: 'warn',
  APPROVED: 'info',
  PUBLISHED: 'good',
} as const;

/** Which step of Computed → 1st → 2nd → Published each status is waiting on (4 = all done). */
const CURRENT_STEP: Record<ResultStatus, number> = {
  DRAFT: 0,
  COMPUTED: 1,
  AWAITING_SECOND_APPROVAL: 2,
  APPROVED: 3,
  PUBLISHED: 4,
};

const STEP_LABELS = [
  t.resultsManage.steps.computed,
  t.resultsManage.steps.first,
  t.resultsManage.steps.second,
  t.resultsManage.steps.published,
];

export function ResultsManagePage() {
  const toast = useToast();
  const confirm = useConfirm();
  const programs = useLoad(() => api.academic.programs(), []);
  const sessions = useLoad(() => api.academic.examSessions(), []);
  const sets = useLoad(() => api.exams.resultSets(), []);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [programId, setProgramId] = useState<number | null>(null);
  const [semester, setSemester] = useState(5);
  const [busy, setBusy] = useState(false);
  const [reportId, setReportId] = useState<number | null>(null);

  useEffect(() => {
    if (sessions.data?.length && sessionId === null) setSessionId(sessions.data[0].id);
  }, [sessions.data, sessionId]);
  useEffect(() => {
    if (programs.data?.length && programId === null) setProgramId(programs.data[0].id);
  }, [programs.data, programId]);

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      sets.reload();
    } catch (err) {
      toast.error(errorMessage(err)); // e.g. "You gave the first approval. A second, different ..."
    } finally {
      setBusy(false);
    }
  }

  async function compute() {
    if (!sessionId || !programId) return;
    setBusy(true);
    try {
      const summary = await api.exams.compute(sessionId, programId, semester);
      toast.success(t.resultsManage.computedToast(summary.students, summary.passed, summary.averageSgpa));
      sets.reload();
    } catch (err) {
      toast.error(errorMessage(err)); // e.g. "1 mark entries are still empty ..."
    } finally {
      setBusy(false);
    }
  }

  async function publish(set: ResultSetView) {
    if (await confirm(t.resultsManage.confirmPublish, t.resultsManage.publish)) {
      await run(() => api.exams.publish(set.id), t.resultsManage.publishedToast);
    }
  }

  return (
    <>
      <PageHeader title={t.resultsManage.title} subtitle={t.resultsManage.subtitle} />

      <div className="card">
        <h2 className="card-title">
          <Calculator size={18} /> {t.resultsManage.computeTitle}
        </h2>
        {(programs.error || sessions.error) && <ErrorBanner message={(programs.error || sessions.error)!} />}
        {programs.data && sessions.data && (
          <div className="toolbar" style={{ marginBottom: 0 }}>
            <Field id="session" label={t.resultsManage.examSession}>
              <select id="session" value={sessionId ?? ''} onChange={(e) => setSessionId(Number(e.target.value))}>
                {sessions.data.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="programme" label={t.common.programme}>
              <select id="programme" value={programId ?? ''} onChange={(e) => setProgramId(Number(e.target.value))}>
                {programs.data.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="semester" label={t.resultsManage.semester}>
              <input
                id="semester"
                type="number"
                min={1}
                max={10}
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value))}
              />
            </Field>
            <button type="button" className="btn" disabled={busy} onClick={compute}>
              {busy ? <LoaderCircle size={16} className="spin" /> : <Calculator size={16} />}
              {busy ? t.resultsManage.computing : t.resultsManage.compute}
            </button>
          </div>
        )}
      </div>

      <div className="section-title">
        <h2>{t.resultsManage.setsTitle}</h2>
      </div>
      {sets.loading && <Loading />}
      {sets.error && <ErrorBanner message={sets.error} onRetry={sets.reload} />}
      {sets.data && sets.data.length === 0 && <EmptyState icon={Workflow} />}
      {sets.data && sets.data.length > 0 && (
        <Stagger className="set-list" gap={0.06}>
          {sets.data.map((set) => (
            <StaggerItem key={set.id}>
              <div className="card set-card">
                <div className="card-header">
                  <div className="btn-row" style={{ flexWrap: 'nowrap' }}>
                    <IconTile icon={Workflow} tone={STATUS_TONE[set.status]} />
                    <div>
                      <h3 style={{ margin: 0 }}>
                        {set.programName} · {t.common.semester} {set.semester}
                      </h3>
                      <span className="chip mono">{set.examSessionCode}</span>
                    </div>
                  </div>
                  <Badge tone={STATUS_TONE[set.status]}>{t.resultsManage.statuses[set.status]}</Badge>
                </div>
                <Steps labels={STEP_LABELS} current={CURRENT_STEP[set.status]} />
                <div className="set-foot">
                  <div className="small muted">
                    {t.resultsManage.approvals(set.firstApprover, set.secondApprover)}
                    {set.publishedAt && (
                      <>
                        {' · '}
                        {set.publishedBy} · {formatDateTime(set.publishedAt)}
                      </>
                    )}
                  </div>
                  <div className="btn-row">
                    {(set.status === 'COMPUTED' || set.status === 'AWAITING_SECOND_APPROVAL') && (
                      <button
                        type="button"
                        className="btn btn-small"
                        disabled={busy}
                        onClick={() => run(() => api.exams.approve(set.id), t.resultsManage.approvedToast)}
                      >
                        <BadgeCheck size={14} /> {t.resultsManage.approve}
                      </button>
                    )}
                    {set.status === 'APPROVED' && (
                      <button type="button" className="btn btn-small btn-good" disabled={busy} onClick={() => publish(set)}>
                        <Send size={14} /> {t.resultsManage.publish}
                      </button>
                    )}
                    {set.status !== 'DRAFT' && (
                      <button type="button" className="btn btn-secondary btn-small" onClick={() => setReportId(set.id)}>
                        <FileChartColumn size={14} /> {t.resultsManage.viewReport}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {reportId !== null && <ConsolidatedReportView resultSetId={reportId} />}
    </>
  );
}
