/*
 * The administrator's timetable planner (FR-14):
 *   Generate draft -> (optionally) move lectures -> check clashes -> Publish.
 * Moving a lecture into a busy slot shows the clash in red and the backend refuses to publish (TC-011).
 */
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRightLeft, Send, Sparkles, Users } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useEffect, useState } from 'react';
import { api } from '../../api/endpoints';
import { errorMessage } from '../../api/http';
import type { TimetableEntry } from '../../api/types';
import { useConfirm } from '../../components/ConfirmDialog';
import { TimetableGrid } from '../../components/TimetableGrid';
import { useToast } from '../../components/Toast';
import { Alert, ErrorBanner, Field, Loading, PageHeader, PercentBar, Segmented } from '../../components/ui';
import { DAYS, PERIODS } from '../../config';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n/messages';
import { SPRING } from '../../motion/presets';
import { useScrollLock } from '../../motion/SmoothScroll';

/** Most teaching hours a week the workload bars are measured against. */
const MAX_WEEKLY_HOURS = 20;

export function TimetableManagePage() {
  const toast = useToast();
  const confirm = useConfirm();
  const programs = useLoad(() => api.academic.programs(), []);
  const workload = useLoad(() => api.timetable.workload(), []);
  const [programId, setProgramId] = useState<number | null>(null);
  const [semester, setSemester] = useState(5);
  const [section, setSection] = useState('A');
  const [showDraft, setShowDraft] = useState(true);
  const [moving, setMoving] = useState<TimetableEntry | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (programs.data?.length && programId === null) setProgramId(programs.data[0].id);
  }, [programs.data, programId]);

  const view = useLoad(
    () => api.timetable.view(programId!, semester, section),
    [programId, semester, section],
    programId !== null,
  );
  const clashIds = new Set((view.data?.clashes ?? []).flatMap((c) => c.entryIds));

  async function generate() {
    if (!programId) return;
    setBusy(true);
    try {
      const result = await api.timetable.generate(programId, semester, section);
      view.setData(result);
      setShowDraft(true);
      toast.success(t.timetable.generatedToast(result.draft.length));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (!programId || !(await confirm(t.timetable.confirmPublish, t.timetable.publish))) return;
    setBusy(true);
    try {
      view.setData(await api.timetable.publish(programId, semester, section));
      setShowDraft(false);
      toast.success(t.timetable.publishedToast);
      workload.reload();
    } catch (err) {
      toast.error(errorMessage(err)); // "1 clash(es) must be fixed before this timetable can be published."
    } finally {
      setBusy(false);
    }
  }

  async function saveMove(day: number, period: number, room: string) {
    if (!moving) return;
    try {
      await api.timetable.move(moving.id, day, period, room);
      toast.info(t.timetable.moved);
      setMoving(null);
      view.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  const entries = showDraft ? (view.data?.draft ?? []) : (view.data?.published ?? []);

  return (
    <>
      <PageHeader title={t.timetable.manageTitle} subtitle={t.timetable.manageSubtitle} />
      {programs.data && (
        <div className="card toolbar">
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
          <button type="button" className="btn" disabled={busy} onClick={generate}>
            <Sparkles size={16} /> {busy ? t.timetable.generating : t.timetable.generate}
          </button>
          <button type="button" className="btn btn-secondary" disabled={busy || !view.data?.draft.length} onClick={publish}>
            <Send size={16} /> {t.timetable.publish}
          </button>
        </div>
      )}

      {view.loading && <Loading />}
      {view.error && <ErrorBanner message={view.error} onRetry={view.reload} />}
      {view.data && (
        <>
          <div className="btn-row" style={{ marginBottom: 16 }}>
            <span className="muted small">{t.timetable.showing}:</span>
            <Segmented
              id="timetable-view"
              value={showDraft ? 'draft' : 'published'}
              onChange={(value) => setShowDraft(value === 'draft')}
              options={[
                { value: 'draft', label: `${t.timetable.draft} (${view.data.draft.length})` },
                { value: 'published', label: `${t.timetable.published} (${view.data.published.length})` },
              ]}
            />
          </div>

          {showDraft &&
            view.data.draft.length > 0 &&
            (view.data.clashes.length === 0 ? (
              <Alert tone="good">{t.timetable.noClashes}</Alert>
            ) : (
              <Alert tone="bad" title={t.timetable.clashesTitle}>
                <ul>
                  {view.data.clashes.map((c, i) => (
                    <li key={i}>
                      {t.timetable.clashType[c.type]}: {t.timetable.days[c.day]} {t.timetable.periodLabel(c.period)}
                    </li>
                  ))}
                </ul>
              </Alert>
            ))}
          {showDraft && view.data.draft.length === 0 && <Alert tone="info">{t.timetable.noDraft}</Alert>}

          <div className="card">
            <TimetableGrid
              entries={entries}
              clashIds={showDraft ? clashIds : undefined}
              actions={
                showDraft
                  ? (e) => (
                      <button type="button" className="btn btn-secondary btn-small" onClick={() => setMoving(e)}>
                        <ArrowRightLeft size={12} /> {t.timetable.move}
                      </button>
                    )
                  : undefined
              }
            />
          </div>
        </>
      )}

      <MoveDialog entry={moving} onCancel={() => setMoving(null)} onSave={saveMove} />

      <div className="card table-wrap">
        <h2 className="card-title">
          <Users size={18} /> {t.timetable.workloadTitle}
        </h2>
        {workload.data && (
          <table>
            <thead>
              <tr>
                <th>{t.common.name}</th>
                <th>{t.timetable.hoursPerWeek}</th>
                <th>{t.timetable.teaching}</th>
              </tr>
            </thead>
            <tbody>
              {workload.data.map((f) => (
                <tr key={f.facultyId}>
                  <td>
                    <strong>{f.fullName}</strong>
                  </td>
                  <td style={{ minWidth: 160 }}>
                    <span className="small">{f.hoursPerWeek}</span>
                    <PercentBar percent={(f.hoursPerWeek * 100) / MAX_WEEKLY_HOURS} low={false} />
                  </td>
                  <td>
                    <div className="role-badges">
                      {f.teaching.length === 0
                        ? t.common.none
                        : f.teaching.map((code) => (
                            <span key={code} className="chip mono">
                              {code}
                            </span>
                          ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

/** Pick a new day, period and room for one lecture. A Radix Dialog handles focus and the Escape key. */
function MoveDialog({
  entry,
  onCancel,
  onSave,
}: {
  entry: TimetableEntry | null;
  onCancel: () => void;
  onSave: (d: number, p: number, r: string) => void;
}) {
  useScrollLock(entry !== null);
  return (
    <Dialog.Root open={entry !== null} onOpenChange={(open) => !open && onCancel()}>
      <AnimatePresence>
        {entry && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div className="dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </Dialog.Overlay>
            <div className="dialog-positioner">
              <Dialog.Content asChild forceMount aria-describedby={undefined}>
                <motion.div
                  className="dialog dialog-wide"
                  initial={{ opacity: 0, scale: 0.95, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.15 } }}
                  transition={SPRING}
                >
                  <MoveForm key={entry.id} entry={entry} onCancel={onCancel} onSave={onSave} />
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

function MoveForm({
  entry,
  onCancel,
  onSave,
}: {
  entry: TimetableEntry;
  onCancel: () => void;
  onSave: (d: number, p: number, r: string) => void;
}) {
  const [day, setDay] = useState(entry.day);
  const [period, setPeriod] = useState(entry.period);
  const [room, setRoom] = useState(entry.room);

  return (
    <>
      <Dialog.Title className="dialog-title">
        {t.timetable.moveTitle}: {entry.courseCode}
      </Dialog.Title>
      <div className="form-grid" style={{ marginTop: 16 }}>
        <Field id="day" label={t.timetable.day}>
          <select id="day" value={day} onChange={(e) => setDay(Number(e.target.value))}>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {t.timetable.days[d]}
              </option>
            ))}
          </select>
        </Field>
        <Field id="period" label={t.timetable.period}>
          <select id="period" value={period} onChange={(e) => setPeriod(Number(e.target.value))}>
            {PERIODS.map((p) => (
              <option key={p} value={p}>
                {t.timetable.periodLabel(p)} ({t.timetable.periodTimes[p]})
              </option>
            ))}
          </select>
        </Field>
        <Field id="room" label={t.timetable.room}>
          <input id="room" value={room} maxLength={20} onChange={(e) => setRoom(e.target.value)} />
        </Field>
      </div>
      <div className="dialog-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          {t.common.cancel}
        </button>
        <button type="button" className="btn" onClick={() => onSave(day, period, room)}>
          {t.common.save}
        </button>
      </div>
    </>
  );
}
