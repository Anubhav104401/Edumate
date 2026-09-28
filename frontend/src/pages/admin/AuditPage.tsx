/*
 * The audit trail: who changed what, when, with the value before and after (fix for DR-04).
 * Data: GET /api/audit?entityType=&entityId=
 */
import { useState, type FormEvent } from 'react';
import { api } from '../../api/endpoints';
import { ErrorBanner, Field, Loading, PageHeader } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n/messages';
import { formatDateTime } from '../../utils/format';

export function AuditPage() {
  const [type, setType] = useState('');
  const [id, setId] = useState('');
  const [filter, setFilter] = useState<{ type?: string; id?: string }>({});
  const { data, error, loading, reload } = useLoad(() => api.admin.audit(filter.type, filter.id), [filter]);

  const apply = (event: FormEvent) => {
    event.preventDefault();
    setFilter(type && id ? { type: type.trim(), id: id.trim() } : {});
  };

  return (
    <>
      <PageHeader title={t.admin.auditTitle} subtitle={t.admin.auditSubtitle} />
      <form className="card toolbar" onSubmit={apply}>
        <Field id="type" label={t.admin.filterType}>
          <input id="type" value={type} onChange={(e) => setType(e.target.value)} />
        </Field>
        <Field id="id" label={t.admin.filterId}>
          <input id="id" value={id} onChange={(e) => setId(e.target.value)} />
        </Field>
        <button type="submit" className="btn">
          {t.common.search}
        </button>
        <button type="button" className="btn btn-secondary" onClick={reload}>
          {t.common.refresh}
        </button>
      </form>
      {loading && <Loading />}
      {error && <ErrorBanner message={error} onRetry={reload} />}
      {data && (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.admin.columns.when}</th>
                <th>{t.admin.columns.who}</th>
                <th>{t.admin.columns.action}</th>
                <th>{t.admin.columns.record}</th>
                <th>{t.admin.columns.before}</th>
                <th>{t.admin.columns.after}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((e) => (
                <tr key={e.id}>
                  <td className="nowrap">{formatDateTime(e.occurredAt)}</td>
                  <td>{e.actor}</td>
                  <td className="mono small">{e.action}</td>
                  <td className="small">
                    {e.entityType} #{e.entityId}
                  </td>
                  <td className="small">{e.oldValue ?? t.common.none}</td>
                  <td className="small">{e.newValue ?? t.common.none}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
