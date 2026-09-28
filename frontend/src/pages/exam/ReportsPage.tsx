/*
 * Cohort-wide reports: attendance shortfall across all courses of a semester, and consolidated marks.
 * Both contain every student's data, so only examination superintendents and administrators can load them.
 */
import { useEffect, useState } from 'react';
import { api } from '../../api/endpoints';
import { errorMessage } from '../../api/http';
import type { CourseShortfall } from '../../api/types';
import { useToast } from '../../components/Toast';
import { EmptyState, Field, PageHeader } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n/messages';
import { formatPercent } from '../../utils/format';
import { ConsolidatedReportView } from './ConsolidatedReportView';

export function ReportsPage() {
  const toast = useToast();
  const programs = useLoad(() => api.academic.programs(), []);
  const sets = useLoad(() => api.exams.resultSets(), []);
  const [programId, setProgramId] = useState<number | null>(null);
  const [semester, setSemester] = useState(5);
  const [section, setSection] = useState('A');
  const [report, setReport] = useState<CourseShortfall[] | null>(null);
  const [resultSetId, setResultSetId] = useState<number | null>(null);

  useEffect(() => {
    if (programs.data?.length && programId === null) setProgramId(programs.data[0].id);
  }, [programs.data, programId]);

  async function runShortfall() {
    if (!programId) return;
    try {
      setReport(await api.reports.shortfall(programId, semester, section));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <>
      <PageHeader title={t.reports.title} />

      <div className="card">
        <h2>{t.reports.shortfallTitle}</h2>
        {programs.data && (
          <div className="toolbar">
            <Field id="programme" label={t.common.programme}>
              <select id="programme" value={programId ?? ''} onChange={(e) => setProgramId(Number(e.target.value))}>
                {programs.data.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="semester" label={t.common.semester}>
              <input id="semester" type="number" min={1} max={10} value={semester} onChange={(e) => setSemester(Number(e.target.value))} />
            </Field>
            <Field id="section" label={t.common.section}>
              <input id="section" value={section} maxLength={10} onChange={(e) => setSection(e.target.value.toUpperCase())} />
            </Field>
            <button type="button" className="btn" onClick={runShortfall}>
              {t.reports.run}
            </button>
          </div>
        )}
        {report && report.every((c) => c.students.length === 0) && <EmptyState text={t.reports.none} />}
        {report?.filter((c) => c.students.length > 0).map((c) => (
          <div key={c.courseId} style={{ marginBottom: 16 }}>
            <h3>
              {c.courseCode} {c.courseName} ({c.students.length})
            </h3>
            <ul className="small">
              {c.students.map((s) => (
                <li key={s.studentId}>
                  <span className="mono">{s.usn}</span> {s.fullName}: {formatPercent(s.percent)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>{t.resultsManage.viewReport}</h2>
        {sets.data && (
          <div className="toolbar">
            <Field id="resultSet" label={t.resultsManage.setsTitle}>
              <select id="resultSet" value={resultSetId ?? ''} onChange={(e) => setResultSetId(Number(e.target.value) || null)}>
                <option value="">{t.common.choose}</option>
                {sets.data.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.programName} · {t.common.semester} {s.semester} · {s.examSessionCode} · {t.resultsManage.statuses[s.status]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}
      </div>
      {resultSetId !== null && <ConsolidatedReportView resultSetId={resultSetId} />}
    </>
  );
}
