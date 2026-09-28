/*
 * Bills, payments and the account statement, with a "Pay now" button on each unpaid bill.
 * Data: GET /api/fees/me.  Pay now: POST /api/fees/payments, then go to the gateway page.
 *
 * On top: the amount outstanding and a ring showing how much of everything billed is paid.
 * The account statement is drawn as a timeline: bills and payments in the order they happened.
 */
import { ArrowDownLeft, CreditCard, LoaderCircle, Receipt, Wallet } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../../api/endpoints';
import { errorMessage } from '../../api/http';
import type { FeeAccount } from '../../api/types';
import { useUser } from '../../auth/AuthContext';
import { Ring } from '../../components/charts';
import { useToast } from '../../components/Toast';
import { Badge, EmptyState, ErrorBanner, IconTile, Loading, PageHeader } from '../../components/ui';
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
          <FeeSummary account={data} />

          <div className="card table-wrap">
            <h2 className="card-title">{t.fees.demandsTitle}</h2>
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
                    <td>
                      <strong>{d.description}</strong>
                    </td>
                    <td className="num">{formatMoney(d.amount)}</td>
                    <td className="num">{formatMoney(d.paid)}</td>
                    <td className="num">{formatMoney(d.due)}</td>
                    <td>{formatDate(d.dueDate)}</td>
                    <td>
                      <Badge tone={DEMAND_TONE[d.status]}>{t.fees.demandStatus[d.status]}</Badge>
                    </td>
                    <td className="right">
                      {d.status !== 'PAID' && (
                        <button type="button" className="btn btn-small" disabled={starting !== null} onClick={() => pay(d.id)}>
                          {starting === d.id ? <LoaderCircle size={14} className="spin" /> : <CreditCard size={14} />}
                          {starting === d.id ? t.fees.starting : t.fees.payNow}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid-2">
            <div className="card table-wrap">
              <h2 className="card-title">{t.fees.paymentsTitle}</h2>
              {data.payments.length === 0 && <EmptyState icon={CreditCard} text={t.fees.noPayments} />}
              {data.payments.length > 0 && (
                <table>
                  <thead>
                    <tr>
                      <th>{t.fees.columns.when}</th>
                      <th className="num">{t.fees.columns.amount}</th>
                      <th>{t.fees.columns.status}</th>
                      <th>{t.fees.columns.receipt}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.payments.map((p) => (
                      <tr key={p.id}>
                        <td>
                          {formatDateTime(p.updatedAt)}
                          <div className="small muted mono">{p.orderId}</div>
                        </td>
                        <td className="num">{formatMoney(p.amount)}</td>
                        <td>
                          <Badge tone={PAYMENT_TONE[p.status]}>{t.fees.paymentStatus[p.status]}</Badge>
                          {p.failureReason && <div className="small muted">{p.failureReason}</div>}
                        </td>
                        <td className="mono small">{p.receiptNo ?? t.common.none}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="card" style={{ paddingInline: 0 }}>
              <h2 className="card-title" style={{ paddingInline: 24 }}>
                {t.fees.ledgerTitle}
              </h2>
              <ol className="timeline">
                {data.ledger.map((line, i) => {
                  const credit = line.type === 'CREDIT';
                  return (
                    <li key={i} className={credit ? 'tone-good' : 'tone-warn'}>
                      <span className="timeline-dot">{credit ? <ArrowDownLeft size={14} /> : <Receipt size={14} />}</span>
                      <div>
                        <strong className="small">{line.description}</strong>
                        <div className="small muted">
                          {t.fees.ledgerType[line.type]} · {formatDateTime(line.at)}
                        </div>
                        <div className="small faint mono">{line.reference}</div>
                      </div>
                      <span className="timeline-amount">{(credit ? '− ' : '') + formatMoney(line.amount)}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </>
      )}
    </>
  );
}

/** Outstanding amount on the left; a ring of "paid out of everything billed" on the right. */
function FeeSummary({ account }: { account: FeeAccount }) {
  const billed = account.demands.reduce((sum, d) => sum + d.amount, 0);
  const paid = account.demands.reduce((sum, d) => sum + d.paid, 0);
  const share = billed === 0 ? 100 : (paid * 100) / billed;
  const clear = account.outstanding <= 0;

  return (
    <div className="card summary-strip">
      <IconTile icon={Wallet} size="lg" tone={clear ? 'good' : 'warn'} />
      <div className="metric">
        <span>{t.fees.outstanding}</span>
        <strong style={{ fontSize: 'var(--text-2xl)' }}>{formatMoney(Math.max(0, account.outstanding))}</strong>
        <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>
          {clear ? t.fees.allPaid : t.fees.paidOf(formatMoney(paid), formatMoney(billed))}
        </span>
      </div>
      <div className="topbar-spacer" />
      <Ring percent={share} size={96} stroke={9} tone={clear ? 'good' : 'warn'}>
        <strong>{Math.round(share)}%</strong>
        <span>{t.fees.columns.paid}</span>
      </Ring>
    </div>
  );
}
