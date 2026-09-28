/*
 * The audit trail: who changed what, when, with the value before and after (fix for DR-04).
 * Data: GET /api/audit?entityType=&entityId=
 * The "before" value is shown struck through in red and the "after" value in green, like a diff.
 */
import { Filter, RotateCw, ScrollText } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { api } from '../../api/endpoints';
import { Avatar, EmptyState, ErrorBanner, Field, Loading, PageHeader } from '../../components/ui';
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
          <Filter size={16} /> {t.common.search}
        </button>
        <button type="button" className="btn btn-secondary" onClick={reload}>
          <RotateCw size={16} /> {t.common.refresh}
        </button>
      </form>
      {loading && <Loading />}
      {error && <ErrorBanner message={error} onRetry={reload} />}
      {data && data.length === 0 && <EmptyState icon={ScrollText} />}
      {data && data.length > 0 && (
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
                  <td className="nowrap small">{formatDateTime(e.occurredAt)}</td>
                  <td>
                    <div className="btn-row" style={{ flexWrap: 'nowrap' }}>
                      <Avatar name={e.actor} size="sm" />
                      <span>{e.actor}</span>
                    </div>
                  </td>
                  <td>
                    <span className="chip mono">{e.action}</span>
                  </td>
                  <td className="small">
                    {e.entityType} <span className="mono muted">#{e.entityId}</span>
                  </td>
                  <td className="small">{e.oldValue ? <span className="diff-old">{e.oldValue}</span> : t.common.none}</td>
                  <td className="small">{e.newValue ? <span className="diff-new">{e.newValue}</span> : t.common.none}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
