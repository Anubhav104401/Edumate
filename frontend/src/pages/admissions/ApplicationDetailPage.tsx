/*
 * One application as the admissions officer sees it: where it is in the process, details,
 * documents, consent history, and one button per action the state machine allows for the officer.
 */
import { ArrowLeft, GraduationCap, ShieldCheck, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../../api/endpoints';
import { errorMessage } from '../../api/http';
import type { AdmissionAction, AdmissionStatus, DocumentType } from '../../api/types';
import { useConfirm } from '../../components/ConfirmDialog';
import { DocumentUpload } from '../../components/DocumentUpload';
import { useToast } from '../../components/Toast';
import { Alert, Badge, ErrorBanner, Field, IconTile, Loading, PageHeader, Steps } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n/messages';
import { Stagger, StaggerItem } from '../../motion/Reveal';
import { formatDate, formatDateTime } from '../../utils/format';
import { admissionTone } from '../../utils/visuals';

const ALL_TYPES = Object.keys(t.documentTypes) as DocumentType[];

/** The normal road of an application, in order. Rejected / withdrawn / reversed leave this road. */
const ROAD: AdmissionStatus[] = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'OFFERED', 'ENROLLED'];

/** Actions that end or undo something are shown in red and confirmed as dangerous. */
const DANGEROUS: AdmissionAction[] = ['REJECT', 'REVERSE_ENROLMENT', 'WITHDRAW'];

export function ApplicationDetailPage() {
  const id = Number(useParams().id);
  const toast = useToast();
  const confirm = useConfirm();
  const app = useLoad(() => api.admissions.get(id), [id]);
  const docs = useLoad(() => api.admissions.documents(id), [id]);
  const consents = useLoad(() => api.consent.history(id), [id]);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  async function act(action: AdmissionAction) {
    const label = t.admissions.actions[action];
    const tone = DANGEROUS.includes(action) ? 'danger' : 'normal';
    if (!(await confirm(t.admissions.confirmAction(label), label, tone))) return;
    setBusy(true);
    try {
      const updated = await api.admissions.transition(id, action, reason);
      app.setData(updated);
      setReason('');
      toast.success(t.admissions.doneToast(t.admissions.statuses[updated.status]));
    } catch (err) {
      toast.error(errorMessage(err)); // e.g. "Please give a reason for this decision."
    } finally {
      setBusy(false);
    }
  }

  if (app.loading) return <Loading />;
  if (app.error) return <ErrorBanner message={app.error} onRetry={app.reload} />;
  const a = app.data;
  if (!a) return null;
  const onRoad = ROAD.indexOf(a.status);

  return (
    <>
      <PageHeader
        title={t.admissions.detailTitle(a.applicationNo)}
        subtitle={<Badge tone={admissionTone(a.status)}>{t.admissions.statuses[a.status]}</Badge>}
        actions={
          <Link className="btn btn-secondary" to="/admissions">
            <ArrowLeft size={16} /> {t.common.back}
          </Link>
        }
      />

      {onRoad >= 0 ? (
        <div className="card">
          <h2 className="card-title">{t.admissions.journeyTitle}</h2>
          {/* ENROLLED is the last step, so once there every step shows as done. */}
          <Steps labels={ROAD.map((s) => t.admissions.statuses[s])} current={a.status === 'ENROLLED' ? ROAD.length : onRoad} />
        </div>
      ) : (
        <Alert tone="bad" title={t.admissions.statuses[a.status]} />
      )}
      {a.statusReason && <Alert tone="info">{a.statusReason}</Alert>}

      <Stagger className="info-grid" gap={0.07}>
        <StaggerItem>
          <div className="card">
            <div className="info-card-head">
              <IconTile icon={UserRound} size="sm" />
              <h3>{t.admissions.personal}</h3>
            </div>
            <p style={{ margin: '0 0 8px' }}>
              <strong>{a.fullName}</strong> {a.minor && <Badge tone="warn">{t.admissions.minorBadge(a.age)}</Badge>}
            </p>
            <dl className="dl">
              <div>
                <dt>{t.apply.fields.dateOfBirth}</dt>
                <dd>{formatDate(a.dateOfBirth)}</dd>
              </div>
              <div>
                <dt>{t.apply.fields.email}</dt>
                <dd>{a.email}</dd>
              </div>
              <div>
                <dt>{t.apply.fields.phone}</dt>
                <dd>{a.phone ?? t.common.none}</dd>
              </div>
            </dl>
          </div>
        </StaggerItem>
        <StaggerItem>
          <div className="card">
            <div className="info-card-head">
              <IconTile icon={GraduationCap} size="sm" tone="accent" />
              <h3>{t.admissions.academic}</h3>
            </div>
            <p style={{ margin: '0 0 8px' }}>{a.programName}</p>
            <dl className="dl">
              <div>
                <dt>{t.apply.fields.category}</dt>
                <dd>{t.admissions.categories[a.category]}</dd>
              </div>
              <div>
                <dt>{t.admissions.columns.entrance}</dt>
                <dd>{a.entranceScore ?? t.common.none}</dd>
              </div>
              <div>
                <dt>{t.admissions.columns.qualifying}</dt>
                <dd>{a.qualifyingPercent ?? t.common.none}</dd>
              </div>
            </dl>
          </div>
        </StaggerItem>
        <StaggerItem>
          <div className="card">
            <div className="info-card-head">
              <IconTile icon={ShieldCheck} size="sm" tone={a.consentStatus === 'GRANTED' ? 'good' : 'warn'} />
              <h3>{t.admissions.guardian}</h3>
            </div>
            <dl className="dl">
              <div>
                <dt>{t.common.name}</dt>
                <dd>{a.guardianName ?? t.common.none}</dd>
              </div>
              <div>
                <dt>{t.apply.fields.email}</dt>
                <dd>{a.guardianEmail ?? t.common.none}</dd>
              </div>
              <div>
                <dt>{t.common.status}</dt>
                <dd>{t.admissions.consentStatus[a.consentStatus]}</dd>
              </div>
            </dl>
          </div>
        </StaggerItem>
      </Stagger>

      <div className="section-title">
        <h2>{t.admissions.documentsTitle}</h2>
      </div>
      {docs.error && <ErrorBanner message={docs.error} />}
      <div className="doc-grid" style={{ marginBottom: 24 }}>
        {ALL_TYPES.map((type) => (
          <DocumentUpload
            key={type}
            applicationId={a.id}
            type={type}
            document={docs.data?.find((d) => d.type === type)}
            editable={false}
            onChanged={docs.reload}
          />
        ))}
      </div>

      {consents.data && consents.data.length > 0 && (
        <div className="card table-wrap">
          <h2 className="card-title">{t.admissions.consentTitle}</h2>
          <table>
            <tbody>
              {consents.data.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Badge tone={c.status === 'GRANTED' ? 'good' : c.status === 'REVOKED' ? 'bad' : 'warn'}>{c.status}</Badge>
                  </td>
                  <td>
                    {c.guardianName} ({c.guardianContact})
                  </td>
                  <td className="small muted">{formatDateTime(c.grantedAt ?? c.revokedAt ?? c.otpExpiresAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card">
        <h2 className="card-title">{t.admissions.decisionTitle}</h2>
        {a.allowedActions.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            {t.admissions.noActions}
          </p>
        ) : (
          <>
            <Field id="reason" label={t.admissions.reasonPrompt}>
              <textarea id="reason" rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
            <div className="btn-row" style={{ marginTop: 12 }}>
              {a.allowedActions.map((action) => (
                <button
                  key={action}
                  type="button"
                  className={DANGEROUS.includes(action) ? 'btn btn-danger' : 'btn'}
                  disabled={busy}
                  onClick={() => act(action)}
                >
                  {t.admissions.actions[action]}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
