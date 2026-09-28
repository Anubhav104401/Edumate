/*
 * The admissions officer's list of applications, with a status filter and a search box.
 * Data: GET /api/admissions/applications?status=&q=
 */
import { ArrowRight, Inbox, Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { api } from '../../api/endpoints';
import type { AdmissionStatus } from '../../api/types';
import { Avatar, Badge, EmptyState, ErrorBanner, Field, Loading, PageHeader } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n/messages';
import { formatDateTime } from '../../utils/format';
import { admissionTone } from '../../utils/visuals';

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
          <div className="input-icon">
            <Search size={16} />
            <input id="q" value={typed} placeholder={t.admissions.searchPlaceholder} onChange={(e) => setTyped(e.target.value)} />
          </div>
        </Field>
        <button type="submit" className="btn">
          <Search size={16} /> {t.common.search}
        </button>
      </form>

      {loading && <Loading />}
      {error && <ErrorBanner message={error} onRetry={reload} />}
      {data && data.length === 0 && <EmptyState icon={Inbox} />}
      {data && data.length > 0 && (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.admissions.columns.name}</th>
                <th>{t.admissions.columns.programme}</th>
                <th>{t.admissions.columns.category}</th>
                <th className="num">{t.admissions.columns.entrance}</th>
                <th className="num">{t.admissions.columns.qualifying}</th>
                <th>{t.admissions.columns.status}</th>
                <th>{t.admissions.columns.submitted}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="btn-row" style={{ flexWrap: 'nowrap' }}>
                      <Avatar name={a.fullName} size="sm" />
                      <div>
                        {/* React writes names as plain text, never as HTML, so a name like
                            <script>...</script> is shown harmlessly (fix for DEF-036, reflected XSS). */}
                        <strong>{a.fullName}</strong>
                        <div className="small mono">
                          <Link to={`/admissions/${a.id}`}>{a.applicationNo}</Link>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{a.programName}</td>
                  <td>
                    <span className="chip">{a.category}</span>
                  </td>
                  <td className="num">{a.entranceScore ?? t.common.none}</td>
                  <td className="num">{a.qualifyingPercent ?? t.common.none}</td>
                  <td>
                    <Badge tone={admissionTone(a.status)}>{t.admissions.statuses[a.status]}</Badge>
                  </td>
                  <td className="small muted">{formatDateTime(a.submittedAt)}</td>
                  <td className="right">
                    <Link
                      to={`/admissions/${a.id}`}
                      className="icon-btn plain"
                      aria-label={t.admissions.detailTitle(a.applicationNo)}
                    >
                      <ArrowRight size={16} />
                    </Link>
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
