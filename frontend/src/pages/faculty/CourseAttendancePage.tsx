/*
 * A teacher's view of one class: everyone's attendance, who is below the minimum,
 * and a button to e-mail those students' guardians (FR-31).
 */
import { useEffect, useState } from 'react';
import { api } from '../../api/endpoints';
import { errorMessage } from '../../api/http';
import type { StudentAttendance } from '../../api/types';
import { useConfirm } from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';
import { Badge, EmptyState, ErrorBanner, Field, Loading, PageHeader, PercentBar } from '../../components/ui';
import { ATTENDANCE_THRESHOLD } from '../../config';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n/messages';
import { formatPercent } from '../../utils/format';

export function CourseAttendancePage() {
  const toast = useToast();
  const confirm = useConfirm();
  const courses = useLoad(() => api.academic.myCourses(), []);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [section, setSection] = useState('A');
  const [threshold, setThreshold] = useState(ATTENDANCE_THRESHOLD);

  useEffect(() => {
    if (courses.data?.length && courseId === null) {
      setCourseId(courses.data[0].id);
    }
  }, [courses.data, courseId]);

  const course = courses.data?.find((c) => c.id === courseId);
  const summary = useLoad(() => api.attendance.courseSummary(courseId!, section), [courseId, section], courseId !== null);
  const shortfall = useLoad(
    () => api.attendance.shortfall(courseId!, section, threshold),
    [courseId, section, threshold],
    courseId !== null,
  );

  async function notify() {
    const count = shortfall.data?.length ?? 0;
    if (!courseId || !(await confirm(t.courseAttendance.confirmNotify(count)))) return;
    try {
      const result = await api.attendance.notifyGuardians(courseId, section);
      toast.success(t.courseAttendance.notifiedToast(result.queued, result.alreadyNotified));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <>
      <PageHeader title={t.courseAttendance.title} subtitle={t.courseAttendance.subtitle} />
      {courses.error && <ErrorBanner message={courses.error} onRetry={courses.reload} />}
      {courses.data && (
        <div className="card toolbar">
          <Field id="course" label={t.common.course}>
            <select id="course" value={courseId ?? ''} onChange={(e) => setCourseId(Number(e.target.value))}>
              {courses.data.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field id="section" label={t.common.section}>
            <select id="section" value={section} onChange={(e) => setSection(e.target.value)}>
              {(course?.sections ?? ['A']).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field id="threshold" label={t.courseAttendance.threshold}>
            <input
              id="threshold"
              type="number"
              min={1}
              max={100}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value) || ATTENDANCE_THRESHOLD)}
            />
          </Field>
        </div>
      )}

      <div className="card">
        <div className="page-header" style={{ marginBottom: 8 }}>
          <h2>{t.courseAttendance.shortfallTitle}</h2>
          {shortfall.data && shortfall.data.length > 0 && (
            <button type="button" className="btn btn-small" onClick={notify}>
              {t.courseAttendance.notify}
            </button>
          )}
        </div>
        {shortfall.loading && <Loading />}
        {shortfall.error && <ErrorBanner message={shortfall.error} />}
        {shortfall.data && shortfall.data.length === 0 && <EmptyState text={t.courseAttendance.none} />}
        {shortfall.data && shortfall.data.length > 0 && <StudentTable rows={shortfall.data} />}
      </div>

      <div className="card">
        <h2>{t.courseAttendance.allTitle}</h2>
        {summary.loading && <Loading />}
        {summary.error && <ErrorBanner message={summary.error} />}
        {summary.data && <StudentTable rows={summary.data} />}
      </div>
    </>
  );
}

function StudentTable({ rows }: { rows: StudentAttendance[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{t.common.usn}</th>
            <th>{t.common.name}</th>
            <th className="num">{t.attendance.columns.attended}</th>
            <th>{t.attendance.columns.percent}</th>
            <th>{t.common.status}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.studentId}>
              <td className="mono">{r.usn}</td>
              <td>{r.fullName}</td>
              <td className="num">{t.attendance.attendedOf(r.attended, r.held)}</td>
              <td>
                {formatPercent(r.percent)}
                <PercentBar percent={r.percent} low={!r.meetsThreshold} />
              </td>
              <td>
                <Badge tone={r.meetsThreshold ? 'good' : 'bad'}>
                  {r.meetsThreshold ? t.attendance.status.OK : t.attendance.status.SHORTFALL}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
