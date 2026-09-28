/*
 * One application as the admissions officer sees it: details, documents, consent history,
 * and one button per action the state machine allows for the officer's role.
 */
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../../api/endpoints';
import { errorMessage } from '../../api/http';
import type { AdmissionAction, DocumentType } from '../../api/types';
import { useConfirm } from '../../components/ConfirmDialog';
import { DocumentUpload } from '../../components/DocumentUpload';
import { useToast } from '../../components/Toast';
import { Alert, Badge, ErrorBanner, Field, Loading, PageHeader } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n/messages';
import { formatDate, formatDateTime } from '../../utils/format';

const ALL_TYPES = Object.keys(t.documentTypes) as DocumentType[];

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
    if (!(await confirm(t.admissions.confirmAction(label), label))) return;
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

  return (
    <>
      <PageHeader
        title={t.admissions.detailTitle(a.applicationNo)}
        subtitle={<Badge>{t.admissions.statuses[a.status]}</Badge>}
        actions={
          <Link className="btn btn-secondary" to="/admissions">
            {t.common.back}
          </Link>
        }
      />
      {a.statusReason && <Alert tone="info">{a.statusReason}</Alert>}

      <div className="grid">
        <div className="card">
          <h3>{t.admissions.personal}</h3>
          <p>
            <strong>{a.fullName}</strong> {a.minor && <Badge tone="warn">{t.admissions.minorBadge(a.age)}</Badge>}
          </p>
          <p className="small">
            {formatDate(a.dateOfBirth)} · {a.email} · {a.phone ?? t.common.none}
          </p>
        </div>
        <div className="card">
          <h3>{t.admissions.academic}</h3>
          <p>{a.programName}</p>
          <p className="small">
            {t.admissions.categories[a.category]} · {t.admissions.columns.entrance} {a.entranceScore ?? t.common.none} ·{' '}
            {t.admissions.columns.qualifying} {a.qualifyingPercent ?? t.common.none}
          </p>
        </div>
        <div className="card">
          <h3>{t.admissions.guardian}</h3>
          <p className="small">
            {a.guardianName ?? t.common.none} · {a.guardianEmail ?? t.common.none}
          </p>
          <p className="small">{t.admissions.consentStatus[a.consentStatus]}</p>
        </div>
      </div>

      <h2>{t.admissions.documentsTitle}</h2>
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
          <h2>{t.admissions.consentTitle}</h2>
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
                  <td className="small muted">
                    {formatDateTime(c.grantedAt ?? c.revokedAt ?? c.otpExpiresAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card">
        <h2>{t.admissions.decisionTitle}</h2>
        {a.allowedActions.length === 0 ? (
          <p className="muted">{t.admissions.noActions}</p>
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
                  className={action === 'REJECT' || action === 'REVERSE_ENROLMENT' ? 'btn btn-danger' : 'btn'}
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
