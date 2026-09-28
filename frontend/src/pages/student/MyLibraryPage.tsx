/*
 * Books a student has borrowed, with due dates and fines so far.
 * Data: GET /api/library/loans/me
 */
import { api } from '../../api/endpoints';
import { Badge, EmptyState, ErrorBanner, Loading, PageHeader } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n/messages';
import { formatDate, formatMoney } from '../../utils/format';

export function MyLibraryPage() {
  const { data, error, loading, reload } = useLoad(() => api.library.myLoans(), []);

  return (
    <>
      <PageHeader title={t.library.myTitle} subtitle={t.library.finePolicy} />
      {loading && <Loading />}
      {error && <ErrorBanner message={error} onRetry={reload} />}
      {data && data.length === 0 && <EmptyState text={t.library.none} />}
      {data && data.length > 0 && (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.library.columns.title}</th>
                <th>{t.library.columns.issued}</th>
                <th>{t.library.columns.due}</th>
                <th className="num">{t.library.columns.late}</th>
                <th className="num">{t.library.columns.fine}</th>
                <th>{t.common.status}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((loan) => (
                <tr key={loan.id}>
                  <td>
                    <strong>{loan.title}</strong>
                    <div className="small muted">{loan.author}</div>
                  </td>
                  <td>{formatDate(loan.issuedOn)}</td>
                  <td>{formatDate(loan.dueOn)}</td>
                  <td className="num">{loan.daysLate}</td>
                  <td className="num">{formatMoney(loan.fine)}</td>
                  <td>
                    {loan.open ? (
                      <Badge tone={loan.daysLate > 0 ? 'bad' : 'info'}>{loan.daysLate > 0 ? t.library.overdue : t.library.onLoan}</Badge>
                    ) : (
                      <Badge tone="good">{t.library.returnedOn(formatDate(loan.returnedOn))}</Badge>
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
