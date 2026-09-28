/*
 * The applicant's whole journey on one page:
 *   1-3  the form            -> POST (first time) or PUT /api/admissions/applications
 *   4    scanned documents   -> DocumentUpload boxes (multipart upload with progress)
 *   5    guardian consent    -> only for applicants under 18 (DPDP Rules, 2025; fix for RR-02)
 *   6    submit              -> POST .../transitions { "action": "SUBMIT" }
 * A step tracker at the top shows which of the six steps are done; each step is its own numbered card.
 */
import { KeyRound, LoaderCircle, Save, Send, Undo2 } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { api } from '../../api/endpoints';
import { ApiError, errorMessage } from '../../api/http';
import type { ApplicationForm, ApplicationView, ConsentView, DocumentType, DocumentView, Program } from '../../api/types';
import { useUser } from '../../auth/AuthContext';
import { useConfirm } from '../../components/ConfirmDialog';
import { DocumentUpload } from '../../components/DocumentUpload';
import { useToast } from '../../components/Toast';
import { Alert, Badge, ErrorBanner, Field, Loading, PageHeader, Steps } from '../../components/ui';
import { t } from '../../i18n/messages';
import { todayIso } from '../../utils/format';
import { ageOn, validateApplication, type FieldErrors } from '../../utils/validation';
import { admissionTone } from '../../utils/visuals';

const DOCUMENT_ORDER: DocumentType[] = ['PHOTO', 'ID_PROOF', 'MARKSHEET_12', 'MARKSHEET_10', 'CATEGORY_CERTIFICATE'];

const EMPTY_FORM: ApplicationForm = {
  fullName: '',
  dateOfBirth: '',
  email: '',
  phone: '',
  programId: null,
  category: 'GEN',
  entranceScore: null,
  qualifyingPercent: null,
  guardianName: '',
  guardianEmail: '',
  guardianPhone: '',
};

/**
 * Which of the six steps are finished: about you, programme, guardian, documents, consent, submit.
 * Before the application exists, none are.
 */
function stepsDone(app: ApplicationView | null): boolean[] {
  if (!app) return [false, false, false, false, false, false];
  return [
    Boolean(app.fullName && app.dateOfBirth && app.email),
    app.entranceScore !== null && app.qualifyingPercent !== null,
    !app.minor || Boolean(app.guardianName && (app.guardianEmail || app.guardianPhone)),
    app.missingDocuments.length === 0,
    app.consentStatus === 'NOT_REQUIRED' || app.consentStatus === 'GRANTED',
    app.status !== 'DRAFT',
  ];
}

/** The numbered title of one step's card. */
function StepTitle({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div className="step-card-title" style={{ marginBottom: 16 }}>
      <span className="step-num">{n}</span>
      <h2>{children}</h2>
    </div>
  );
}

/** Copies the saved application into the editable form. */
function toForm(app: ApplicationView): ApplicationForm {
  return {
    fullName: app.fullName,
    dateOfBirth: app.dateOfBirth,
    email: app.email,
    phone: app.phone ?? '',
    programId: app.programId,
    category: app.category,
    entranceScore: app.entranceScore,
    qualifyingPercent: app.qualifyingPercent,
    guardianName: app.guardianName ?? '',
    guardianEmail: app.guardianEmail ?? '',
    guardianPhone: app.guardianPhone ?? '',
  };
}

export function ApplyPage() {
  const user = useUser();
  const toast = useToast();
  const confirm = useConfirm();
  const [app, setApp] = useState<ApplicationView | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [documents, setDocuments] = useState<DocumentView[]>([]);
  const [form, setForm] = useState<ApplicationForm>({ ...EMPTY_FORM, fullName: user.fullName });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadDocuments = useCallback(
    async (id: number) => {
      try {
        setDocuments(await api.admissions.documents(id));
      } catch (err) {
        toast.error(errorMessage(err));
      }
    },
    [toast],
  );

  const refresh = useCallback(async () => {
    try {
      const mine = await api.admissions.mine();
      setApp(mine);
      setForm(toForm(mine));
      await loadDocuments(mine.id);
    } catch (err) {
      // 404 simply means "no application yet": show the empty form.
      if (!(err instanceof ApiError && err.status === 404)) {
        setLoadError(errorMessage(err));
      }
    }
  }, [loadDocuments]);

  useEffect(() => {
    Promise.all([api.academic.programs().then(setPrograms), refresh()])
      .catch((err) => setLoadError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [refresh]);

  const editable = !app || app.status === 'DRAFT';
  const update = <K extends keyof ApplicationForm>(key: K, value: ApplicationForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  async function save(event: FormEvent) {
    event.preventDefault();
    const found = validateApplication(form, todayIso());
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    try {
      const saved = app ? await api.admissions.update(app.id, form) : await api.admissions.create(form);
      setApp(saved);
      setForm(toForm(saved));
      toast.success(app ? t.apply.savedToast : t.apply.createdToast(saved.applicationNo));
      await loadDocuments(saved.id);
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        setErrors(err.fieldErrors as FieldErrors); // the backend's own field messages
      }
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function transition(action: 'SUBMIT' | 'WITHDRAW') {
    if (!app) return;
    const question = action === 'SUBMIT' ? t.apply.confirmSubmit : t.apply.confirmWithdraw;
    if (!(await confirm(question, t.admissions.actions[action], action === 'WITHDRAW' ? 'danger' : 'normal'))) return;
    setBusy(true);
    try {
      const updated = await api.admissions.transition(app.id, action);
      setApp(updated);
      toast.success(action === 'SUBMIT' ? t.apply.submittedToast : t.admissions.doneToast(t.admissions.statuses[updated.status]));
    } catch (err) {
      toast.error(errorMessage(err)); // e.g. "You are under 18. Your parent or guardian must give consent ..."
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading />;
  if (loadError) return <ErrorBanner message={loadError} />;

  const age = form.dateOfBirth ? ageOn(form.dateOfBirth, todayIso()) : null;
  const done = stepsDone(app);
  const firstOpen = done.indexOf(false);
  const inputProps = (key: keyof ApplicationForm) => ({
    id: key,
    disabled: !editable,
    'aria-invalid': errors[key] ? true : undefined,
    'aria-describedby': errors[key] ? `${key}-error` : undefined,
  });

  return (
    <>
      <PageHeader
        title={app ? t.apply.title : t.apply.startTitle}
        subtitle={t.apply.subtitle}
        actions={
          app && <Badge tone={admissionTone(app.status)}>{`${app.applicationNo} · ${t.admissions.statuses[app.status]}`}</Badge>
        }
      />

      <div className="card">
        <div className="card-header">
          <h2>{t.apply.title}</h2>
          <span className="chip">{t.apply.progress(done.filter(Boolean).length, done.length)}</span>
        </div>
        <Steps labels={[...t.apply.stepShort]} current={firstOpen === -1 ? done.length : firstOpen} />
      </div>

      {app && !editable && <Alert tone="info">{t.apply.lockedNotice}</Alert>}
      {app?.statusReason && <Alert tone="info">{app.statusReason}</Alert>}

      <form className="card" onSubmit={save} noValidate>
        <StepTitle n={1}>{t.apply.sectionPersonal}</StepTitle>
        <div className="form-grid">
          <Field id="fullName" label={t.apply.fields.fullName} error={errors.fullName}>
            <input {...inputProps('fullName')} value={form.fullName} onChange={(e) => update('fullName', e.target.value)} />
          </Field>
          <Field id="dateOfBirth" label={t.apply.fields.dateOfBirth} error={errors.dateOfBirth}>
            <input
              {...inputProps('dateOfBirth')}
              type="date"
              max={todayIso()}
              value={form.dateOfBirth}
              onChange={(e) => update('dateOfBirth', e.target.value)}
            />
          </Field>
          <Field id="email" label={t.apply.fields.email} error={errors.email}>
            <input {...inputProps('email')} type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
          </Field>
          <Field id="phone" label={t.apply.fields.phone} error={errors.phone}>
            <input {...inputProps('phone')} type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
          </Field>
        </div>

        <div style={{ marginTop: 32 }}>
          <StepTitle n={2}>{t.apply.sectionProgramme}</StepTitle>
        </div>
        <div className="form-grid">
          <Field id="programId" label={t.apply.fields.programme} error={errors.programId}>
            <select
              {...inputProps('programId')}
              value={form.programId ?? ''}
              onChange={(e) => update('programId', e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">{t.common.choose}</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field id="category" label={t.apply.fields.category}>
            <select
              {...inputProps('category')}
              value={form.category}
              onChange={(e) => update('category', e.target.value as ApplicationForm['category'])}
            >
              {(Object.keys(t.admissions.categories) as ApplicationForm['category'][]).map((c) => (
                <option key={c} value={c}>
                  {t.admissions.categories[c]}
                </option>
              ))}
            </select>
          </Field>
          <Field id="entranceScore" label={t.apply.fields.entranceScore} hint={t.apply.hints.scores} error={errors.entranceScore}>
            <input
              {...inputProps('entranceScore')}
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={form.entranceScore ?? ''}
              onChange={(e) => update('entranceScore', e.target.value === '' ? null : Number(e.target.value))}
            />
          </Field>
          <Field id="qualifyingPercent" label={t.apply.fields.qualifyingPercent} error={errors.qualifyingPercent}>
            <input
              {...inputProps('qualifyingPercent')}
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={form.qualifyingPercent ?? ''}
              onChange={(e) => update('qualifyingPercent', e.target.value === '' ? null : Number(e.target.value))}
            />
          </Field>
        </div>

        <div style={{ marginTop: 32 }}>
          <StepTitle n={3}>{t.apply.sectionGuardian}</StepTitle>
        </div>
        <p className="small muted">{t.apply.hints.guardian}</p>
        <div className="form-grid">
          <Field id="guardianName" label={t.apply.fields.guardianName} error={errors.guardianName}>
            <input
              {...inputProps('guardianName')}
              value={form.guardianName}
              onChange={(e) => update('guardianName', e.target.value)}
            />
          </Field>
          <Field id="guardianEmail" label={t.apply.fields.guardianEmail} error={errors.guardianEmail}>
            <input
              {...inputProps('guardianEmail')}
              type="email"
              value={form.guardianEmail}
              onChange={(e) => update('guardianEmail', e.target.value)}
            />
          </Field>
          <Field id="guardianPhone" label={t.apply.fields.guardianPhone} error={errors.guardianPhone}>
            <input
              {...inputProps('guardianPhone')}
              type="tel"
              value={form.guardianPhone}
              onChange={(e) => update('guardianPhone', e.target.value)}
            />
          </Field>
        </div>

        {editable && (
          <div className="btn-row" style={{ marginTop: 16 }}>
            <button type="submit" className="btn" disabled={busy}>
              {busy ? <LoaderCircle size={16} className="spin" /> : <Save size={16} />}
              {busy ? t.common.saving : app ? t.apply.saveDraft : t.apply.create}
            </button>
          </div>
        )}
      </form>

      {app && (
        <>
          <div className="section-title">
            <StepTitle n={4}>{t.apply.sectionDocuments}</StepTitle>
          </div>
          <div className="doc-grid" style={{ marginBottom: 24 }}>
            {DOCUMENT_ORDER.map((type) => (
              <DocumentUpload
                key={type}
                applicationId={app.id}
                type={type}
                document={documents.find((d) => d.type === type)}
                editable={editable}
                onChanged={() => void refresh()}
              />
            ))}
          </div>

          <div className="card">
            <StepTitle n={5}>{t.apply.sectionConsent}</StepTitle>
            {app.minor ? (
              <ConsentStep app={app} age={age ?? app.age} editable={editable} onChanged={() => void refresh()} />
            ) : (
              <p className="muted">{t.apply.adultNotice}</p>
            )}
          </div>

          <div className="card">
            <StepTitle n={6}>{t.apply.sectionSubmit}</StepTitle>
            {app.missingDocuments.length > 0 ? (
              <Alert tone="warn">{t.apply.missingDocs(app.missingDocuments.map((d) => t.documentTypes[d]).join(', '))}</Alert>
            ) : (
              <Alert tone="good">{t.apply.allDocs}</Alert>
            )}
            <div className="btn-row">
              {app.allowedActions.includes('SUBMIT') && (
                <button type="button" className="btn btn-lg" disabled={busy} onClick={() => transition('SUBMIT')}>
                  <Send size={16} /> {t.apply.submit}
                </button>
              )}
              {app.allowedActions.includes('WITHDRAW') && (
                <button type="button" className="btn btn-danger" disabled={busy} onClick={() => transition('WITHDRAW')}>
                  <Undo2 size={16} /> {t.apply.withdraw}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

/** Step 5: send a one-time code to the guardian and verify the code they share. */
function ConsentStep({
  app,
  age,
  editable,
  onChanged,
}: {
  app: ApplicationView;
  age: number;
  editable: boolean;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [sent, setSent] = useState<ConsentView | null>(null);
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    setBusy(true);
    try {
      const consent = await api.consent.request(app.id);
      setSent(consent);
      toast.info(t.apply.codeSentToast(consent.guardianContact));
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err)); // e.g. "Enter the guardian's name and e-mail or phone ..."
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      toast.error(t.apply.otpInvalid);
      return;
    }
    setBusy(true);
    try {
      await api.consent.verify(app.id, otp);
      toast.success(t.apply.consentGrantedToast);
      setSent(null);
      setOtp('');
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err)); // e.g. "That code is not correct. Attempts left: 4."
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Alert tone="warn">{t.apply.minorNotice(age)}</Alert>
      <p>
        {t.apply.status}:{' '}
        <Badge tone={app.consentStatus === 'GRANTED' ? 'good' : 'warn'}>{t.admissions.consentStatus[app.consentStatus]}</Badge>
      </p>
      {app.consentStatus === 'GRANTED' && <Alert tone="good">{t.apply.consentGranted}</Alert>}
      {app.consentStatus === 'REVOKED' && <Alert tone="bad">{t.apply.consentRevoked}</Alert>}
      {editable && app.consentStatus !== 'GRANTED' && (
        <>
          <p className="small">{t.apply.consentSteps}</p>
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={sendCode}>
            <Send size={16} /> {app.consentStatus === 'PENDING' ? t.apply.resendCode : t.apply.sendCode}
          </button>
          {sent?.demoOtp && <Alert tone="info">{t.apply.demoOtp(sent.demoOtp)}</Alert>}
          {(sent || app.consentStatus === 'PENDING') && (
            <form className="toolbar" style={{ marginTop: 12 }} onSubmit={verify}>
              <Field id="otp" label={t.apply.otpLabel}>
                <input
                  id="otp"
                  className="otp-input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="••••••"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                />
              </Field>
              <button type="submit" className="btn" disabled={busy}>
                <KeyRound size={16} /> {t.apply.verify}
              </button>
            </form>
          )}
        </>
      )}
    </>
  );
}
