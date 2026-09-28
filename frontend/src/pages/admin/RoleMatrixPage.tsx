/*
 * Shows the backend's RoleMatrix: every address and exactly who may call it.
 * Data: GET /api/admin/role-matrix
 */
import { api } from '../../api/endpoints';
import { Badge, ErrorBanner, Loading, PageHeader } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n/messages';

export function RoleMatrixPage() {
  const { data, error, loading, reload } = useLoad(() => api.admin.roleMatrix(), []);

  return (
    <>
      <PageHeader title={t.admin.roleMatrixTitle} subtitle={t.admin.roleMatrixSubtitle} />
      {loading && <Loading />}
      {error && <ErrorBanner message={error} onRetry={reload} />}
      {data && (
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
                  <td className="mono">{rule.method ?? t.admin.anyMethod}</td>
                  <td className="mono">{rule.pattern}</td>
                  <td>
                    {rule.access === 'ROLES'
                      ? rule.roles.map((r) => (
                          <span key={r} style={{ marginRight: 4 }}>
                            <Badge>{t.roles[r]}</Badge>
                          </span>
                        ))
                      : <Badge tone={rule.access === 'PUBLIC' ? 'warn' : 'info'}>{t.admin.access[rule.access]}</Badge>}
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
