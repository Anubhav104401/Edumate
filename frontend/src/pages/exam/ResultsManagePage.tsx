/*
 * The examination superintendent's results workflow:
 *   Compute  ->  Approve (person 1)  ->  Approve (person 2, must be different)  ->  Publish
 * Every button calls the backend, which enforces the rules; this page only shows the right buttons.
 */
import { useEffect, useState } from 'react';
import { api } from '../../api/endpoints';
import { errorMessage } from '../../api/http';
import type { ResultSetView } from '../../api/types';
import { useConfirm } from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';
import { Badge, EmptyState, ErrorBanner, Field, Loading, PageHeader } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n/messages';
import { formatDateTime } from '../../utils/format';
import { ConsolidatedReportView } from './ConsolidatedReportView';

const STATUS_TONE = {
  DRAFT: 'warn',
  COMPUTED: 'warn',
  AWAITING_SECOND_APPROVAL: 'warn',
  APPROVED: 'info',
  PUBLISHED: 'good',
} as const;

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
        <h2>{t.resultsManage.computeTitle}</h2>
        {(programs.error || sessions.error) && <ErrorBanner message={(programs.error || sessions.error)!} />}
        {programs.data && sessions.data && (
          <div className="toolbar">
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
              <input id="semester" type="number" min={1} max={10} value={semester} onChange={(e) => setSemester(Number(e.target.value))} />
            </Field>
            <button type="button" className="btn" disabled={busy} onClick={compute}>
              {busy ? t.resultsManage.computing : t.resultsManage.compute}
            </button>
          </div>
        )}
      </div>

      <div className="card table-wrap">
        <h2>{t.resultsManage.setsTitle}</h2>
        {sets.loading && <Loading />}
        {sets.error && <ErrorBanner message={sets.error} onRetry={sets.reload} />}
        {sets.data && sets.data.length === 0 && <EmptyState />}
        {sets.data && sets.data.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>{t.common.programme}</th>
                <th>{t.common.semester}</th>
                <th>{t.resultsManage.examSession}</th>
                <th>{t.common.status}</th>
                <th>{t.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {sets.data.map((set) => (
                <tr key={set.id}>
                  <td>{set.programName}</td>
                  <td>{set.semester}</td>
                  <td className="mono">{set.examSessionCode}</td>
                  <td>
                    <Badge tone={STATUS_TONE[set.status]}>{t.resultsManage.statuses[set.status]}</Badge>
                    <div className="small muted">{t.resultsManage.approvals(set.firstApprover, set.secondApprover)}</div>
                    {set.publishedAt && (
                      <div className="small muted">
                        {set.publishedBy} · {formatDateTime(set.publishedAt)}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="btn-row">
                      {(set.status === 'COMPUTED' || set.status === 'AWAITING_SECOND_APPROVAL') && (
                        <button type="button" className="btn btn-small" disabled={busy}
                          onClick={() => run(() => api.exams.approve(set.id), t.resultsManage.approvedToast)}>
                          {t.resultsManage.approve}
                        </button>
                      )}
                      {set.status === 'APPROVED' && (
                        <button type="button" className="btn btn-small" disabled={busy} onClick={() => publish(set)}>
                          {t.resultsManage.publish}
                        </button>
                      )}
                      {set.status !== 'DRAFT' && (
                        <button type="button" className="btn btn-secondary btn-small" onClick={() => setReportId(set.id)}>
                          {t.resultsManage.viewReport}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {reportId !== null && <ConsolidatedReportView resultSetId={reportId} />}
    </>
  );
}
