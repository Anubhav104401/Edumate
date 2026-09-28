/*
 * Bills, payments and the account statement, with a "Pay now" button on each unpaid bill.
 * Data: GET /api/fees/me.  Pay now: POST /api/fees/payments, then go to the gateway page.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../../api/endpoints';
import { errorMessage } from '../../api/http';
import { useUser } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast';
import { Badge, ErrorBanner, Loading, PageHeader } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n/messages';
import { formatDate, formatDateTime, formatMoney } from '../../utils/format';

const DEMAND_TONE = { PAID: 'good', DUE: 'warn', OVERDUE: 'bad' } as const;
const PAYMENT_TONE = { SUCCESS: 'good', INITIATED: 'info', FAILED: 'bad' } as const;

export function MyFeesPage() {
  const user = useUser();
  const navigate = useNavigate();
  const toast = useToast();
  const [starting, setStarting] = useState<number | null>(null);
  const { data, error, loading, reload } = useLoad(() => api.fees.mine(), []);

  async function pay(demandId: number) {
    setStarting(demandId);
    try {
      const order = await api.fees.initiate(demandId);
      navigate(order.checkoutPath); // e.g. /pay/ORD-1A2B3C...
    } catch (err) {
      toast.error(errorMessage(err));
      setStarting(null);
    }
  }

  return (
    <>
      <PageHeader title={user.role === 'GUARDIAN' ? t.fees.guardianTitle : t.fees.title} />
      {loading && <Loading />}
      {error && <ErrorBanner message={error} onRetry={reload} />}
      {data && (
        <>
          <div className="grid">
            <div className={`stat tone-${data.outstanding > 0 ? 'warn' : 'good'}`}>
              <div className="stat-label">{t.fees.outstanding}</div>
              <div className="stat-value">{formatMoney(Math.max(0, data.outstanding))}</div>
              <div className="stat-hint">{data.outstanding > 0 ? '' : t.fees.nothingDue}</div>
            </div>
          </div>

          <div className="card table-wrap">
            <h2>{t.fees.demandsTitle}</h2>
            <table>
              <thead>
                <tr>
                  <th>{t.fees.columns.description}</th>
                  <th className="num">{t.fees.columns.amount}</th>
                  <th className="num">{t.fees.columns.paid}</th>
                  <th className="num">{t.fees.columns.due}</th>
                  <th>{t.fees.columns.dueDate}</th>
                  <th>{t.fees.columns.status}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.demands.map((d) => (
                  <tr key={d.id}>
                    <td>{d.description}</td>
                    <td className="num">{formatMoney(d.amount)}</td>
                    <td className="num">{formatMoney(d.paid)}</td>
                    <td className="num">{formatMoney(d.due)}</td>
                    <td>{formatDate(d.dueDate)}</td>
                    <td>
                      <Badge tone={DEMAND_TONE[d.status]}>{t.fees.demandStatus[d.status]}</Badge>
                    </td>
                    <td>
                      {d.status !== 'PAID' && (
                        <button type="button" className="btn btn-small" disabled={starting !== null} onClick={() => pay(d.id)}>
                          {starting === d.id ? t.fees.starting : t.fees.payNow}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card table-wrap">
            <h2>{t.fees.paymentsTitle}</h2>
            <table>
              <thead>
                <tr>
                  <th>{t.fees.columns.when}</th>
                  <th>{t.fees.columns.order}</th>
                  <th className="num">{t.fees.columns.amount}</th>
                  <th>{t.fees.columns.status}</th>
                  <th>{t.fees.columns.receipt}</th>
                </tr>
              </thead>
              <tbody>
                {data.payments.map((p) => (
                  <tr key={p.id}>
                    <td>{formatDateTime(p.updatedAt)}</td>
                    <td className="mono">{p.orderId}</td>
                    <td className="num">{formatMoney(p.amount)}</td>
                    <td>
                      <Badge tone={PAYMENT_TONE[p.status]}>{t.fees.paymentStatus[p.status]}</Badge>
                      {p.failureReason && <div className="small muted">{p.failureReason}</div>}
                    </td>
                    <td className="mono">{p.receiptNo ?? t.common.none}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card table-wrap">
            <h2>{t.fees.ledgerTitle}</h2>
            <table>
              <thead>
                <tr>
                  <th>{t.fees.columns.when}</th>
                  <th>{t.fees.columns.type}</th>
                  <th>{t.fees.columns.description}</th>
                  <th className="num">{t.fees.columns.amount}</th>
                  <th>{t.fees.columns.reference}</th>
                </tr>
              </thead>
              <tbody>
                {data.ledger.map((line, i) => (
                  <tr key={i}>
                    <td>{formatDateTime(line.at)}</td>
                    <td>{t.fees.ledgerType[line.type]}</td>
                    <td>{line.description}</td>
                    <td className="num">{(line.type === 'CREDIT' ? '− ' : '') + formatMoney(line.amount)}</td>
                    <td className="mono small">{line.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
