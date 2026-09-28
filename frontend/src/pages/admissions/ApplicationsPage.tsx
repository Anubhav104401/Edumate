/*
 * The admissions officer's list of applications, with a status filter and a search box.
 * Data: GET /api/admissions/applications?status=&q=
 */
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { api } from '../../api/endpoints';
import type { AdmissionStatus } from '../../api/types';
import { Badge, EmptyState, ErrorBanner, Field, Loading, PageHeader } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n/messages';
import { formatDateTime } from '../../utils/format';

const STATUSES = Object.keys(t.admissions.statuses) as AdmissionStatus[];

export function ApplicationsPage() {
  const [status, setStatus] = useState<AdmissionStatus | ''>('');
  const [typed, setTyped] = useState('');
  const [query, setQuery] = useState('');
  const { data, error, loading, reload } = useLoad(() => api.admissions.list(status, query), [status, query]);

  const search = (event: FormEvent) => {
    event.preventDefault();
    setQuery(typed.trim());
  };

  return (
    <>
      <PageHeader title={t.admissions.listTitle} subtitle={t.admissions.listSubtitle} />
      <form className="card toolbar" onSubmit={search}>
        <Field id="status" label={t.admissions.filterStatus}>
          <select id="status" value={status} onChange={(e) => setStatus(e.target.value as AdmissionStatus | '')}>
            <option value="">{t.admissions.anyStatus}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t.admissions.statuses[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field id="q" label={t.common.search}>
          <input id="q" value={typed} placeholder={t.admissions.searchPlaceholder} onChange={(e) => setTyped(e.target.value)} />
        </Field>
        <button type="submit" className="btn">
          {t.common.search}
        </button>
      </form>

      {loading && <Loading />}
      {error && <ErrorBanner message={error} onRetry={reload} />}
      {data && data.length === 0 && <EmptyState />}
      {data && data.length > 0 && (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.admissions.columns.number}</th>
                <th>{t.admissions.columns.name}</th>
                <th>{t.admissions.columns.programme}</th>
                <th>{t.admissions.columns.category}</th>
                <th className="num">{t.admissions.columns.entrance}</th>
                <th className="num">{t.admissions.columns.qualifying}</th>
                <th>{t.admissions.columns.status}</th>
                <th>{t.admissions.columns.submitted}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((a) => (
                <tr key={a.id}>
                  <td className="mono">
                    <Link to={`/admissions/${a.id}`}>{a.applicationNo}</Link>
                  </td>
                  {/* React writes names as plain text, never as HTML, so a name like
                      <script>...</script> is shown harmlessly (fix for DEF-036, reflected XSS). */}
                  <td>{a.fullName}</td>
                  <td>{a.programName}</td>
                  <td>{a.category}</td>
                  <td className="num">{a.entranceScore ?? t.common.none}</td>
                  <td className="num">{a.qualifyingPercent ?? t.common.none}</td>
                  <td>
                    <Badge>{t.admissions.statuses[a.status]}</Badge>
                  </td>
                  <td>{formatDateTime(a.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
