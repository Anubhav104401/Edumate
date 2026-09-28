/*
 * "My attendance" for a student, or "Your child's attendance" for a guardian.
 * Data: GET /api/attendance/me
 *
 * A summary strip (overall percentage and how many courses are on track / careful / below),
 * then one card per course with a progress ring. The ring's colour is the course's status:
 * green on track, amber careful, red below the minimum.
 */
import { CalendarCheck, CircleCheck, CircleX, ShieldPlus, TriangleAlert } from 'lucide-react';
import { api } from '../../api/endpoints';
import type { CourseAttendance } from '../../api/types';
import { useUser } from '../../auth/AuthContext';
import { Ring } from '../../components/charts';
import { Alert, Badge, EmptyState, ErrorBanner, Loading, PageHeader } from '../../components/ui';
import { ATTENDANCE_THRESHOLD } from '../../config';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n/messages';
import { Stagger, StaggerItem } from '../../motion/Reveal';
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
      {data && data.length === 0 && <EmptyState icon={CalendarCheck} />}
      {data && data.length > 0 && (
        <>
          <Summary rows={data} />
          <Stagger className="course-cards" gap={0.06}>
            {data.map((row, i) => (
              <StaggerItem key={row.courseId}>
                <CourseCard row={row} delay={0.2 + i * 0.06} />
              </StaggerItem>
            ))}
          </Stagger>
        </>
      )}
    </>
  );
}

/** The strip at the top: overall percentage across every course, and the courses by status. */
function Summary({ rows }: { rows: CourseAttendance[] }) {
  const held = rows.reduce((sum, row) => sum + row.held, 0);
  const attended = rows.reduce((sum, row) => sum + row.attended, 0);
  const overall = held === 0 ? null : (attended * 100) / held;
  const count = (status: CourseAttendance['status']) => rows.filter((row) => row.status === status).length;
  const tone = overall === null ? 'info' : overall >= ATTENDANCE_THRESHOLD ? 'good' : 'bad';

  return (
    <div className="card summary-strip">
      <Ring percent={overall} size={88} stroke={8} tone={tone}>
        <strong>{overall === null ? t.common.none : `${Math.round(overall)}%`}</strong>
        <span>{t.attendance.overall}</span>
      </Ring>
      <div className="metric">
        <strong>{formatPercent(overall)}</strong>
        <span>{t.attendance.overall}</span>
      </div>
      <div className="divider" />
      <div className="metric">
        <strong>{rows.length}</strong>
        <span>{t.attendance.courses}</span>
      </div>
      <div className="metric">
        <strong>{held}</strong>
        <span>{t.attendance.classesHeld}</span>
      </div>
      <div className="divider" />
      <div className="btn-row">
        <Badge tone="good">
          {count('OK')} {t.attendance.status.OK}
        </Badge>
        <Badge tone="warn">
          {count('WARNING')} {t.attendance.status.WARNING}
        </Badge>
        <Badge tone="bad">
          {count('SHORTFALL')} {t.attendance.status.SHORTFALL}
        </Badge>
      </div>
    </div>
  );
}

function CourseCard({ row, delay }: { row: CourseAttendance; delay: number }) {
  const tone = STATUS_TONE[row.status];
  const StatusIcon = row.status === 'OK' ? CircleCheck : row.status === 'WARNING' ? TriangleAlert : CircleX;

  return (
    <div className="card course-card">
      <Ring percent={row.percent} size={84} stroke={8} tone={tone} delay={delay}>
        <strong>{row.percent === null ? t.common.none : `${Math.round(row.percent)}%`}</strong>
      </Ring>
      <div className="course-card-body">
        <span className="course-code">{row.courseCode}</span>
        <h3>{row.courseName}</h3>
        <div className="meta-row">
          <span>{row.held === 0 ? t.attendance.noClasses : t.attendance.attendedOf(row.attended, row.held)}</span>
          <span aria-hidden="true">·</span>
          <strong>{formatPercent(row.percent)}</strong>
        </div>
        <div className="meta-row">
          <Badge tone={tone} plain>
            <StatusIcon size={12} /> {t.attendance.status[row.status]}
          </Badge>
          <span className="chip">
            {t.attendance.columns.canMiss}: {row.canMiss < 0 ? t.attendance.cannotReach : t.attendance.canMiss(row.canMiss)}
          </span>
          {row.medicalExemption && (
            <span className="chip">
              <ShieldPlus size={12} /> {t.attendance.exempt}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
