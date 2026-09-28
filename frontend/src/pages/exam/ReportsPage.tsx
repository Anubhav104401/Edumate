/*
 * Cohort-wide reports: attendance shortfall across all courses of a semester, and consolidated marks.
 * Both contain every student's data, so only examination superintendents and administrators can load them.
 */
import { FileChartColumn, Play, UserCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../api/endpoints';
import { errorMessage } from '../../api/http';
import type { CourseShortfall } from '../../api/types';
import { useToast } from '../../components/Toast';
import { Avatar, Badge, EmptyState, Field, PageHeader, PercentBar } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n/messages';
import { Stagger, StaggerItem } from '../../motion/Reveal';
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

  const withStudents = report?.filter((c) => c.students.length > 0) ?? [];

  return (
    <>
      <PageHeader title={t.reports.title} />

      <div className="card">
        <h2 className="card-title">{t.reports.shortfallTitle}</h2>
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
              <input
                id="semester"
                type="number"
                min={1}
                max={10}
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value))}
              />
            </Field>
            <Field id="section" label={t.common.section}>
              <input id="section" value={section} maxLength={10} onChange={(e) => setSection(e.target.value.toUpperCase())} />
            </Field>
            <button type="button" className="btn" onClick={runShortfall}>
              <Play size={16} /> {t.reports.run}
            </button>
          </div>
        )}
        {report && withStudents.length === 0 && <EmptyState icon={UserCheck} text={t.reports.none} />}
        {withStudents.length > 0 && (
          <Stagger className="grid-2" gap={0.06}>
            {withStudents.map((c) => (
              <StaggerItem key={c.courseId} className="shortfall-block">
                <h3>
                  <span className="mono muted">{c.courseCode}</span> {c.courseName} <Badge tone="bad">{c.students.length}</Badge>
                </h3>
                <ul className="person-list">
                  {c.students.map((s) => (
                    <li key={s.studentId}>
                      <Avatar name={s.fullName} size="sm" />
                      <div>
                        <strong className="small">{s.fullName}</strong>
                        <div className="small muted mono">{s.usn}</div>
                      </div>
                      <div style={{ minWidth: 120 }}>
                        <span className="small">{formatPercent(s.percent)}</span>
                        <PercentBar percent={s.percent} low />
                      </div>
                    </li>
                  ))}
                </ul>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>

      <div className="card">
        <h2 className="card-title">
          <FileChartColumn size={18} /> {t.resultsManage.viewReport}
        </h2>
        {sets.data && (
          <div className="toolbar" style={{ marginBottom: 0 }}>
            <Field id="resultSet" label={t.resultsManage.setsTitle}>
              <select id="resultSet" value={resultSetId ?? ''} onChange={(e) => setResultSetId(Number(e.target.value) || null)}>
                <option value="">{t.common.choose}</option>
                {sets.data.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.programName} · {t.common.semester} {s.semester} · {s.examSessionCode} ·{' '}
                    {t.resultsManage.statuses[s.status]}
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
