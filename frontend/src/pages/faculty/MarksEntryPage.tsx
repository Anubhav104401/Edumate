/*
 * Internal-assessment marks entry for a teacher's course (FR-17).
 * Each row has its own Save button and needs a reason; the backend audits old and new value.
 */
import { useEffect, useState } from 'react';
import { api } from '../../api/endpoints';
import { errorMessage } from '../../api/http';
import type { MarkLine, MarksSheet } from '../../api/types';
import { useToast } from '../../components/Toast';
import { Alert, Badge, ErrorBanner, Field, Loading, PageHeader } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n/messages';
import { formatDateTime } from '../../utils/format';

export function MarksEntryPage() {
  const courses = useLoad(() => api.academic.myCourses(), []);
  const sessions = useLoad(() => api.academic.examSessions(), []);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);

  useEffect(() => {
    if (courses.data?.length && courseId === null) setCourseId(courses.data[0].id);
  }, [courses.data, courseId]);
  useEffect(() => {
    if (sessions.data?.length && sessionId === null) setSessionId(sessions.data[0].id);
  }, [sessions.data, sessionId]);

  const sheet = useLoad(
    () => api.exams.marks(courseId!, sessionId!),
    [courseId, sessionId],
    courseId !== null && sessionId !== null,
  );

  const replaceLine = (line: MarkLine) => {
    if (!sheet.data) return;
    const next: MarksSheet = { ...sheet.data, lines: sheet.data.lines.map((l) => (l.markId === line.markId ? line : l)) };
    sheet.setData(next);
  };

  return (
    <>
      <PageHeader title={t.marks.title} subtitle={t.marks.subtitle} />
      {(courses.error || sessions.error) && <ErrorBanner message={(courses.error || sessions.error)!} />}
      {courses.data && sessions.data && (
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
          <Field id="session" label={t.marks.examSession}>
            <select id="session" value={sessionId ?? ''} onChange={(e) => setSessionId(Number(e.target.value))}>
              {sessions.data.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} – {s.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}
      {sheet.loading && <Loading />}
      {sheet.error && <ErrorBanner message={sheet.error} onRetry={sheet.reload} />}
      {sheet.data && (
        <div className="card table-wrap">
          {sheet.data.locked && <Alert tone="warn">{t.marks.locked}</Alert>}
          <table>
            <thead>
              <tr>
                <th>{t.common.usn}</th>
                <th>{t.common.name}</th>
                <th>{t.marks.columns.internal}</th>
                <th className="num">{t.marks.columns.external}</th>
                <th className="num">{t.marks.columns.total}</th>
                <th>{t.marks.columns.grade}</th>
                <th>{t.marks.columns.lastChange}</th>
                <th>{t.marks.columns.change}</th>
              </tr>
            </thead>
            <tbody>
              {sheet.data.lines.map((line) => (
                <MarkRow key={line.markId} line={line} locked={sheet.data!.locked} onSaved={replaceLine} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function MarkRow({ line, locked, onSaved }: { line: MarkLine; locked: boolean; onSaved: (line: MarkLine) => void }) {
  const toast = useToast();
  const [value, setValue] = useState(line.internalMarks === null ? '' : String(line.internalMarks));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const changed = value !== (line.internalMarks === null ? '' : String(line.internalMarks));

  async function save() {
    const number = Number(value);
    if (value.trim() === '' || !Number.isFinite(number) || number < 0 || number > 40) {
      toast.error(t.marks.invalid);
      return;
    }
    if (!reason.trim()) {
      toast.error(t.marks.needReason);
      return;
    }
    setBusy(true);
    try {
      const saved = await api.exams.amendMark(line.markId, number, line.version, reason.trim());
      onSaved(saved);
      setReason('');
      toast.success(t.marks.savedToast(line.usn));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr>
      <td className="mono">{line.usn}</td>
      <td>{line.fullName}</td>
      <td>
        <input
          type="number"
          min={0}
          max={40}
          step={0.5}
          value={value}
          disabled={locked}
          style={{ width: 80 }}
          aria-label={`${t.marks.columns.internal} ${line.usn}`}
          onChange={(e) => setValue(e.target.value)}
        />
      </td>
      <td className="num">
        {line.externalMarks ?? t.common.none}
        {line.revalued && <div className="small muted">{t.marks.revalued}</div>}
      </td>
      <td className="num">{line.total ?? t.common.none}</td>
      <td>{line.grade ? <Badge tone={line.grade === 'F' ? 'bad' : 'good'}>{line.grade}</Badge> : t.common.none}</td>
      <td className="small muted">
        {line.updatedBy} <br /> {formatDateTime(line.updatedAt)}
      </td>
      <td>
        {changed && !locked && (
          <div className="btn-row">
            <input
              placeholder={t.marks.reasonPlaceholder}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{ width: 180 }}
            />
            <button type="button" className="btn btn-small" disabled={busy} onClick={save}>
              {t.marks.save}
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
