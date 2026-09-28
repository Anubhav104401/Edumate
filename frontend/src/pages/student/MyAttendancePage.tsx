/*
 * "My attendance" for a student, or "Your child's attendance" for a guardian.
 * Data: GET /api/attendance/me
 */
import { api } from '../../api/endpoints';
import type { CourseAttendance } from '../../api/types';
import { useUser } from '../../auth/AuthContext';
import { Alert, Badge, ErrorBanner, Loading, PageHeader, PercentBar } from '../../components/ui';
import { ATTENDANCE_THRESHOLD } from '../../config';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n/messages';
import { formatPercent } from '../../utils/format';

const STATUS_TONE = { OK: 'good', WARNING: 'warn', SHORTFALL: 'bad' } as const;

export function MyAttendancePage() {
  const user = useUser();
  const { data, error, loading, reload } = useLoad(() => api.attendance.mine(), []);
  const shortfall = data?.filter((row) => !row.meetsThreshold && !row.medicalExemption).length ?? 0;

  return (
    <>
      <PageHeader
        title={user.role === 'GUARDIAN' ? t.attendance.guardianTitle : t.attendance.title}
        subtitle={t.attendance.subtitle(ATTENDANCE_THRESHOLD)}
      />
      {loading && <Loading />}
      {error && <ErrorBanner message={error} onRetry={reload} />}
      {shortfall > 0 && <Alert tone="bad">{t.attendance.shortfallAlert(shortfall)}</Alert>}
      {data && (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.attendance.columns.course}</th>
                <th className="num">{t.attendance.columns.attended}</th>
                <th>{t.attendance.columns.percent}</th>
                <th>{t.attendance.columns.canMiss}</th>
                <th>{t.attendance.columns.status}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <AttendanceRow key={row.courseId} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function AttendanceRow({ row }: { row: CourseAttendance }) {
  return (
    <tr>
      <td>
        <strong>{row.courseCode}</strong> {row.courseName}
        {row.medicalExemption && (
          <div>
            <Badge tone="info">{t.attendance.exempt}</Badge>
          </div>
        )}
      </td>
      <td className="num">{row.held === 0 ? t.attendance.noClasses : t.attendance.attendedOf(row.attended, row.held)}</td>
      <td>
        <div>{formatPercent(row.percent)}</div>
        <PercentBar percent={row.percent} low={!row.meetsThreshold} warn={row.status === 'WARNING'} />
      </td>
      <td>{row.canMiss < 0 ? t.attendance.cannotReach : t.attendance.canMiss(row.canMiss)}</td>
      <td>
        <Badge tone={STATUS_TONE[row.status]}>{t.attendance.status[row.status]}</Badge>
      </td>
    </tr>
  );
}
