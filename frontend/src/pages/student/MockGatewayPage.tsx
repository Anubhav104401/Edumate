/*
 * The pretend bank page at /pay/{orderId}. In real life this page would belong to the payment gateway.
 * "Approve" / "Decline" make the backend send itself the signed callback a real gateway would send,
 * 1, 2 or 3 times, so the replay protection of test case TC-006 can be seen working.
 */
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../../api/endpoints';
import { errorMessage } from '../../api/http';
import type { CallbackResult } from '../../api/types';
import { useToast } from '../../components/Toast';
import { Alert, Badge, ErrorBanner, Loading, PageHeader } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n/messages';
import { formatMoney } from '../../utils/format';

export function MockGatewayPage() {
  const { orderId = '' } = useParams();
  const toast = useToast();
  const [deliveries, setDeliveries] = useState(1);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<CallbackResult[] | null>(null);
  const { data, error, loading, reload } = useLoad(() => api.fees.checkout(orderId), [orderId]);

  async function complete(success: boolean) {
    setBusy(true);
    try {
      setResults(await api.fees.completeMock(orderId, success, deliveries));
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const final = results?.[0];

  return (
    <>
      <PageHeader title={t.gateway.title} subtitle={t.gateway.subtitle} />
      {loading && <Loading />}
      {error && <ErrorBanner message={error} onRetry={reload} />}
      {data && (
        <div className="card" style={{ maxWidth: 560 }}>
          <p>
            {t.gateway.order}: <span className="mono">{data.orderId}</span>
          </p>
          <p>
            {t.gateway.amount}: <strong style={{ fontSize: 'var(--text-xl)' }}>{formatMoney(data.amount)}</strong>
          </p>
          <p>
            {t.gateway.status}: <Badge>{t.fees.paymentStatus[data.status as keyof typeof t.fees.paymentStatus] ?? data.status}</Badge>
          </p>

          {!results && (
            <>
              <div className="field" style={{ marginBottom: 16 }}>
                <label htmlFor="deliveries">{t.gateway.deliveries}</label>
                <select id="deliveries" value={deliveries} onChange={(e) => setDeliveries(Number(e.target.value))}>
                  {[1, 2, 3].map((n) => (
                    <option key={n} value={n}>
                      {t.gateway.deliveryOption(n)}
                    </option>
                  ))}
                </select>
                <span className="hint">{t.gateway.deliveriesHint}</span>
              </div>
              <div className="btn-row">
                <button type="button" className="btn" disabled={busy} onClick={() => complete(true)}>
                  {busy ? t.gateway.processing : t.gateway.pay}
                </button>
                <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => complete(false)}>
                  {t.gateway.decline}
                </button>
              </div>
            </>
          )}

          {results && (
            <>
              <h3>{t.gateway.resultsTitle}</h3>
              <ol>
                {results.map((r, i) => (
                  <li key={i}>
                    <Badge tone={r.outcome === 'PROCESSED' ? 'good' : 'info'}>{r.outcome}</Badge> {t.gateway.outcome[r.outcome]}
                  </li>
                ))}
              </ol>
              {final?.receiptNo && <Alert tone="good">{t.gateway.receipt(final.receiptNo)}</Alert>}
              {final?.failureReason && <Alert tone="bad">{t.gateway.failed(final.failureReason)}</Alert>}
              <Link className="btn" to="/fees">
                {t.gateway.backToFees}
              </Link>
            </>
          )}
        </div>
      )}
    </>
  );
}
