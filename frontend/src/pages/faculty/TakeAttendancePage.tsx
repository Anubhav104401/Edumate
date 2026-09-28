/*
 * Faculty mark attendance for one class meeting.
 *   Open register:  GET /api/attendance/sessions?courseId&section&date&period
 *   Save:           PUT /api/attendance/sessions  (sends the version number that was loaded)
 * If another teacher saved the same register in between, the backend answers 409 STALE_UPDATE
 * and this page explains what happened instead of overwriting their work (fix for DR-01).
 *
 * Every student is a large tile: tap it to mark the student absent (red), tap again for present
 * (green). A bar stuck to the bottom of the screen shows the count and the Save button.
 */
import { AnimatePresence, motion } from 'motion/react';
import { Check, ClipboardCheck, LoaderCircle, RotateCw, Save, UserCheck, UserX, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../api/endpoints';
import { ApiError, errorMessage } from '../../api/http';
import type { AttendanceSheet } from '../../api/types';
import { Ring } from '../../components/charts';
import { useToast } from '../../components/Toast';
import { Alert, Avatar, ErrorBanner, Field, Loading, PageHeader } from '../../components/ui';
import { PERIODS } from '../../config';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n/messages';
import { Stagger, StaggerItem } from '../../motion/Reveal';
import { todayIso } from '../../utils/format';

export function TakeAttendancePage() {
  const toast = useToast();
  const courses = useLoad(() => api.academic.myCourses(), []);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [section, setSection] = useState('A');
  const [date, setDate] = useState(todayIso());
  const [period, setPeriod] = useState(1);
  const [sheet, setSheet] = useState<AttendanceSheet | null>(null);
  const [present, setPresent] = useState<Record<number, boolean>>({});
  const [stale, setStale] = useState(false);
  const [busy, setBusy] = useState(false);

  // Pick the first course automatically once the list arrives.
  useEffect(() => {
    if (courses.data?.length && courseId === null) {
      setCourseId(courses.data[0].id);
      setSection(courses.data[0].sections[0] ?? 'A');
    }
  }, [courses.data, courseId]);

  const course = courses.data?.find((c) => c.id === courseId);

  function show(loaded: AttendanceSheet) {
    setSheet(loaded);
    setPresent(Object.fromEntries(loaded.rows.map((row) => [row.studentId, row.present])));
    setStale(false);
  }

  async function open() {
    if (!courseId) return;
    if (date > todayIso()) {
      toast.error(t.takeAttendance.futureDate);
      return;
    }
    setBusy(true);
    try {
      show(await api.attendance.loadSheet(courseId, section, date, period));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!sheet) return;
    setBusy(true);
    try {
      const saved = await api.attendance.saveSheet({
        courseId: sheet.courseId,
        section: sheet.section,
        date: sheet.date,
        period: sheet.period,
        version: sheet.version,
        marks: sheet.rows.map((row) => ({ studentId: row.studentId, present: present[row.studentId] })),
      });
      show(saved);
      toast.success(t.takeAttendance.savedToast);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'STALE_UPDATE') {
        setStale(true);
      } else {
        toast.error(errorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  }

  const setAll = (value: boolean) => setPresent(Object.fromEntries((sheet?.rows ?? []).map((row) => [row.studentId, value])));
  const presentCount = Object.values(present).filter(Boolean).length;
  const total = sheet?.rows.length ?? 0;

  return (
    <>
      <PageHeader title={t.takeAttendance.title} subtitle={t.takeAttendance.subtitle} />
      {courses.loading && <Loading rows={1} />}
      {courses.error && <ErrorBanner message={courses.error} onRetry={courses.reload} />}

      {courses.data && (
        <div className="card toolbar">
          <Field id="course" label={t.takeAttendance.course}>
            <select
              id="course"
              value={courseId ?? ''}
              onChange={(e) => {
                const next = courses.data!.find((c) => c.id === Number(e.target.value));
                setCourseId(Number(e.target.value));
                setSection(next?.sections[0] ?? 'A');
                setSheet(null);
              }}
            >
              {courses.data.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field id="section" label={t.takeAttendance.section}>
            <select id="section" value={section} onChange={(e) => setSection(e.target.value)}>
              {(course?.sections ?? ['A']).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field id="date" label={t.takeAttendance.date}>
            <input id="date" type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field id="period" label={t.takeAttendance.period}>
            <select id="period" value={period} onChange={(e) => setPeriod(Number(e.target.value))}>
              {PERIODS.map((p) => (
                <option key={p} value={p}>
                  {t.timetable.periodLabel(p)} ({t.timetable.periodTimes[p]})
                </option>
              ))}
            </select>
          </Field>
          <button type="button" className="btn" disabled={busy || !courseId} onClick={open}>
            <ClipboardCheck size={16} /> {t.takeAttendance.open}
          </button>
        </div>
      )}

      {stale && (
        <Alert tone="bad" title={t.takeAttendance.staleTitle}>
          <p>{t.takeAttendance.staleBody}</p>
          <button type="button" className="btn btn-small" onClick={open}>
            <RotateCw size={14} /> {t.takeAttendance.reload}
          </button>
        </Alert>
      )}

      {sheet && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2>
                <span className="mono muted">{sheet.courseCode}</span> {sheet.courseName} · {sheet.section}
              </h2>
              <p className="small muted" style={{ margin: 0 }}>
                {sheet.alreadyTaken ? t.takeAttendance.existingRegister(sheet.version ?? 0) : t.takeAttendance.newRegister}
              </p>
            </div>
            <div className="btn-row">
              <button type="button" className="btn btn-secondary btn-small" onClick={() => setAll(true)}>
                <UserCheck size={14} /> {t.takeAttendance.markAllPresent}
              </button>
              <button type="button" className="btn btn-secondary btn-small" onClick={() => setAll(false)}>
                <UserX size={14} /> {t.takeAttendance.markAllAbsent}
              </button>
            </div>
          </div>
          <p className="small muted">{t.takeAttendance.tapHint}</p>

          <Stagger className="roster" gap={0.02}>
            {sheet.rows.map((row) => {
              const here = present[row.studentId] ?? true;
              return (
                <StaggerItem key={row.studentId}>
                  <button
                    type="button"
                    className="roster-chip"
                    aria-pressed={here}
                    aria-label={`${row.fullName} ${row.usn}: ${here ? t.takeAttendance.present : t.takeAttendance.absent}`}
                    onClick={() => setPresent({ ...present, [row.studentId]: !here })}
                  >
                    <Avatar name={row.fullName} size="sm" />
                    <span className="roster-chip-text">
                      <strong>{row.fullName}</strong>
                      <span>{row.usn}</span>
                    </span>
                    <span className="roster-mark" aria-hidden="true">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={here ? 'in' : 'out'}
                          style={{ display: 'grid' }}
                          initial={{ scale: 0, rotate: -90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0, rotate: 90 }}
                          transition={{ duration: 0.18 }}
                        >
                          {here ? <Check size={15} /> : <X size={15} />}
                        </motion.span>
                      </AnimatePresence>
                    </span>
                  </button>
                </StaggerItem>
              );
            })}
          </Stagger>

          <div className="action-bar">
            <Ring percent={total === 0 ? 0 : (presentCount * 100) / total} size={44} stroke={5} tone="good" />
            <strong className="grow" aria-live="polite">
              {t.takeAttendance.summary(presentCount, total)}
            </strong>
            <button type="button" className="btn btn-lg" disabled={busy} onClick={save} style={{ borderRadius: 999 }}>
              {busy ? <LoaderCircle size={18} className="spin" /> : <Save size={18} />}
              {busy ? t.common.saving : t.takeAttendance.save}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
