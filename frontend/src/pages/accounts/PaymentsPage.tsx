/*
 * The accounts office: recent gateway payments, and any student's fee account by USN.
 */
import { useState, type FormEvent } from 'react';
import { api } from '../../api/endpoints';
import { errorMessage } from '../../api/http';
import type { FeeAccount } from '../../api/types';
import { useToast } from '../../components/Toast';
import { Badge, ErrorBanner, Field, Loading, PageHeader } from '../../components/ui';
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
          <input id="usn" value={usn} placeholder={t.payments.lookupPlaceholder} onChange={(e) => setUsn(e.target.value)} />
        </Field>
        <button type="submit" className="btn">
          {t.payments.lookup}
        </button>
      </form>

      {account && (
        <div className="card table-wrap">
          <h2>
            {account.fullName} <span className="mono muted">{account.usn}</span>
          </h2>
          <p>
            {t.fees.outstanding}: <strong>{formatMoney(Math.max(0, account.outstanding))}</strong>
          </p>
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
                  <td>{t.fees.ledgerType[line.type]}</td>
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
        <h2>{t.payments.recentTitle}</h2>
        {recent.loading && <Loading />}
        {recent.error && <ErrorBanner message={recent.error} onRetry={recent.reload} />}
        {recent.data && (
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
                  <td className="num">{formatMoney(p.amount)}</td>
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
