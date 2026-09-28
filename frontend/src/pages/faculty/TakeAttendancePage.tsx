/*
 * Faculty mark attendance for one class meeting.
 *   Open register:  GET /api/attendance/sessions?courseId&section&date&period
 *   Save:           PUT /api/attendance/sessions  (sends the version number that was loaded)
 * If another teacher saved the same register in between, the backend answers 409 STALE_UPDATE
 * and this page explains what happened instead of overwriting their work (fix for DR-01).
 */
import { useEffect, useState } from 'react';
import { api } from '../../api/endpoints';
import { ApiError, errorMessage } from '../../api/http';
import type { AttendanceSheet } from '../../api/types';
import { useToast } from '../../components/Toast';
import { Alert, ErrorBanner, Field, Loading, PageHeader } from '../../components/ui';
import { PERIODS } from '../../config';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n/messages';
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

  const setAll = (value: boolean) =>
    setPresent(Object.fromEntries((sheet?.rows ?? []).map((row) => [row.studentId, value])));
  const presentCount = Object.values(present).filter(Boolean).length;

  return (
    <>
      <PageHeader title={t.takeAttendance.title} subtitle={t.takeAttendance.subtitle} />
      {courses.loading && <Loading />}
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
            {t.takeAttendance.open}
          </button>
        </div>
      )}

      {stale && (
        <Alert tone="bad" title={t.takeAttendance.staleTitle}>
          <p>{t.takeAttendance.staleBody}</p>
          <button type="button" className="btn btn-small" onClick={open}>
            {t.takeAttendance.reload}
          </button>
        </Alert>
      )}

      {sheet && (
        <div className="card">
          <div className="page-header" style={{ marginBottom: 12 }}>
            <div>
              <h2>
                {sheet.courseCode} {sheet.courseName} · {sheet.section}
              </h2>
              <p className="small">
                {sheet.alreadyTaken ? t.takeAttendance.existingRegister(sheet.version ?? 0) : t.takeAttendance.newRegister}
              </p>
            </div>
            <div className="btn-row">
              <strong>{t.takeAttendance.summary(presentCount, sheet.rows.length)}</strong>
              <button type="button" className="btn btn-secondary btn-small" onClick={() => setAll(true)}>
                {t.takeAttendance.markAllPresent}
              </button>
              <button type="button" className="btn btn-secondary btn-small" onClick={() => setAll(false)}>
                {t.takeAttendance.markAllAbsent}
              </button>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t.common.usn}</th>
                  <th>{t.common.name}</th>
                  <th>{t.takeAttendance.present}</th>
                </tr>
              </thead>
              <tbody>
                {sheet.rows.map((row) => (
                  <tr key={row.studentId}>
                    <td className="mono">{row.usn}</td>
                    <td>{row.fullName}</td>
                    <td>
                      <label>
                        <input
                          type="checkbox"
                          checked={present[row.studentId] ?? true}
                          onChange={(e) => setPresent({ ...present, [row.studentId]: e.target.checked })}
                        />{' '}
                        {present[row.studentId] ? t.takeAttendance.present : t.takeAttendance.absent}
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="btn-row" style={{ marginTop: 16 }}>
            <button type="button" className="btn" disabled={busy} onClick={save}>
              {busy ? t.common.saving : t.takeAttendance.save}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
