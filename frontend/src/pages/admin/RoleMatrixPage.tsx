/*
 * Shows the backend's RoleMatrix: every address and exactly who may call it.
 * Data: GET /api/admin/role-matrix
 * HTTP methods get their own colours (GET green, POST blue, PUT amber, DELETE red).
 */
import { ShieldCheck } from 'lucide-react';
import { api } from '../../api/endpoints';
import { Badge, EmptyState, ErrorBanner, Loading, PageHeader } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n/messages';

export function RoleMatrixPage() {
  const { data, error, loading, reload } = useLoad(() => api.admin.roleMatrix(), []);

  return (
    <>
      <PageHeader title={t.admin.roleMatrixTitle} subtitle={t.admin.roleMatrixSubtitle} />
      {loading && <Loading />}
      {error && <ErrorBanner message={error} onRetry={reload} />}
      {data && data.length === 0 && <EmptyState icon={ShieldCheck} />}
      {data && data.length > 0 && (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.admin.roleColumns.method}</th>
                <th>{t.admin.roleColumns.path}</th>
                <th>{t.admin.roleColumns.access}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((rule, i) => (
                <tr key={i}>
                  <td>
                    <span className={`method method-${rule.method ?? 'ANY'}`}>{rule.method ?? t.admin.anyMethod}</span>
                  </td>
                  <td className="mono small">{rule.pattern}</td>
                  <td>
                    {rule.access === 'ROLES' ? (
                      <div className="role-badges">
                        {rule.roles.map((r) => (
                          <Badge key={r} plain>
                            {t.roles[r]}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <Badge tone={rule.access === 'PUBLIC' ? 'warn' : 'info'}>{t.admin.access[rule.access]}</Badge>
                    )}
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
