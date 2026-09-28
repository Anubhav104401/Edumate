/*
 * Every e-mail and SMS EduMate has queued, and whether the dispatcher has sent it yet.
 * Data: GET /api/notifications/outbox
 */
import { api } from '../../api/endpoints';
import { Badge, ErrorBanner, Loading, PageHeader } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n/messages';
import { formatDateTime } from '../../utils/format';

const TONE = { PENDING: 'warn', SENT: 'good', FAILED: 'bad' } as const;

export function OutboxPage() {
  const { data, error, loading, reload } = useLoad(() => api.admin.outbox(), []);

  return (
    <>
      <PageHeader
        title={t.admin.outboxTitle}
        subtitle={t.admin.outboxSubtitle}
        actions={
          <button type="button" className="btn btn-secondary" onClick={reload}>
            {t.common.refresh}
          </button>
        }
      />
      {loading && <Loading />}
      {error && <ErrorBanner message={error} onRetry={reload} />}
      {data && (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.admin.outboxColumns.created}</th>
                <th>{t.admin.outboxColumns.channel}</th>
                <th>{t.admin.outboxColumns.to}</th>
                <th>{t.admin.outboxColumns.subject}</th>
                <th>{t.admin.outboxColumns.status}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((m) => (
                <tr key={m.id}>
                  <td className="nowrap">{formatDateTime(m.createdAt)}</td>
                  <td>{m.channel}</td>
                  <td className="small">{m.recipient}</td>
                  <td>
                    {m.subject}
                    <div className="small muted">{m.body}</div>
                  </td>
                  <td>
                    <Badge tone={TONE[m.status]}>{m.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
