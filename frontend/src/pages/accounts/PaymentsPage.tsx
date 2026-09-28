/*
 * The accounts office: recent gateway payments, and any student's fee account by USN.
 */
import { CreditCard, Search, Wallet } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { api } from '../../api/endpoints';
import { errorMessage } from '../../api/http';
import type { FeeAccount } from '../../api/types';
import { useToast } from '../../components/Toast';
import { Avatar, Badge, EmptyState, ErrorBanner, Field, Loading, PageHeader } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n/messages';
import { formatDateTime, formatMoney } from '../../utils/format';

const TONE = { SUCCESS: 'good', INITIATED: 'info', FAILED: 'bad' } as const;

export function PaymentsPage() {
  const toast = useToast();
  const recent = useLoad(() => api.fees.recent(), []);
  const [usn, setUsn] = useState('');
  const [account, setAccount] = useState<FeeAccount | null>(null);

  async function lookup(event: FormEvent) {
    event.preventDefault();
    if (!usn.trim()) return;
    try {
      setAccount(await api.fees.ledger(usn.trim()));
    } catch (err) {
      setAccount(null);
      toast.error(errorMessage(err));
    }
  }

  return (
    <>
      <PageHeader title={t.payments.title} />

      <form className="card toolbar" onSubmit={lookup}>
        <Field id="usn" label={t.payments.lookupTitle}>
          <div className="input-icon">
            <Search size={16} />
            <input id="usn" value={usn} placeholder={t.payments.lookupPlaceholder} onChange={(e) => setUsn(e.target.value)} />
          </div>
        </Field>
        <button type="submit" className="btn">
          <Wallet size={16} /> {t.payments.lookup}
        </button>
      </form>

      {account && (
        <div className="card table-wrap">
          <div className="card-header">
            <div className="btn-row" style={{ flexWrap: 'nowrap' }}>
              <Avatar name={account.fullName} size="lg" />
              <div>
                <h2 style={{ margin: 0 }}>{account.fullName}</h2>
                <span className="mono muted small">{account.usn}</span>
              </div>
            </div>
            <div className="gpa-tile">
              <span>{t.fees.outstanding}</span>
              <strong>{formatMoney(Math.max(0, account.outstanding))}</strong>
            </div>
          </div>
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
              {account.ledger.map((line, i) => (
                <tr key={i}>
                  <td>{formatDateTime(line.at)}</td>
                  <td>
                    <Badge tone={line.type === 'CREDIT' ? 'good' : 'warn'}>{t.fees.ledgerType[line.type]}</Badge>
                  </td>
                  <td>{line.description}</td>
                  <td className="num">{formatMoney(line.amount)}</td>
                  <td className="mono small">{line.reference}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card table-wrap">
        <h2 className="card-title">
          <CreditCard size={18} /> {t.payments.recentTitle}
        </h2>
        {recent.loading && <Loading inline />}
        {recent.error && <ErrorBanner message={recent.error} onRetry={recent.reload} />}
        {recent.data && recent.data.length === 0 && <EmptyState icon={CreditCard} />}
        {recent.data && recent.data.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>{t.fees.columns.when}</th>
                <th>{t.fees.columns.order}</th>
                <th className="num">{t.fees.columns.amount}</th>
                <th>{t.fees.columns.status}</th>
                <th>{t.fees.columns.reference}</th>
                <th>{t.fees.columns.receipt}</th>
              </tr>
            </thead>
            <tbody>
              {recent.data.map((p) => (
                <tr key={p.id}>
                  <td>{formatDateTime(p.updatedAt)}</td>
                  <td className="mono small">{p.orderId}</td>
                  <td className="num">
                    <strong>{formatMoney(p.amount)}</strong>
                  </td>
                  <td>
                    <Badge tone={TONE[p.status]}>{t.fees.paymentStatus[p.status]}</Badge>
                  </td>
                  <td className="mono small">{p.txnRef ?? t.common.none}</td>
                  <td className="mono small">{p.receiptNo ?? t.common.none}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
