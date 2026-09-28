/*
 * The pretend bank page at /pay/{orderId}. In real life this page would belong to the payment gateway.
 * "Approve" / "Decline" make the backend send itself the signed callback a real gateway would send,
 * 1, 2 or 3 times, so the replay protection of test case TC-006 can be seen working.
 *
 * On success a check mark draws itself and a burst of confetti celebrates (not for people who ask
 * their computer for reduced motion). The confetti is drawn on our own <canvas>, on the main thread,
 * because the Content-Security-Policy in nginx.conf does not allow the library's background worker.
 */
import confetti from 'canvas-confetti';
import { motion } from 'motion/react';
import { ArrowLeft, CircleX, Landmark, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams } from 'react-router';
import { api } from '../../api/endpoints';
import { errorMessage } from '../../api/http';
import type { CallbackResult } from '../../api/types';
import { useToast } from '../../components/Toast';
import { Alert, Badge, ErrorBanner, IconTile, Loading, PageHeader } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n/messages';
import { EASE_OUT } from '../../motion/presets';
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
  const paid = Boolean(final?.receiptNo);

  return (
    <>
      <PageHeader title={t.gateway.title} subtitle={t.gateway.subtitle} icon={Landmark} eyebrow={t.nav.sections.finance} />
      {loading && <Loading />}
      {error && <ErrorBanner message={error} onRetry={reload} />}
      {data && (
        <div className="card checkout">
          {!results && (
            <>
              <div className="card-header">
                <IconTile icon={Landmark} tone="info" />
                <span className="chip">
                  <ShieldCheck size={14} /> {t.gateway.secure}
                </span>
              </div>
              <span className="muted small">{t.gateway.amount}</span>
              <div className="checkout-amount">{formatMoney(data.amount)}</div>
              <div className="checkout-rows">
                <div>
                  <span className="muted">{t.gateway.order}</span>
                  <span className="mono">{data.orderId}</span>
                </div>
                <div>
                  <span className="muted">{t.gateway.status}</span>
                  <Badge>{t.fees.paymentStatus[data.status as keyof typeof t.fees.paymentStatus] ?? data.status}</Badge>
                </div>
              </div>
              <div className="field" style={{ marginBottom: 20 }}>
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
                <button type="button" className="btn btn-good btn-lg" disabled={busy} onClick={() => complete(true)}>
                  {busy && <LoaderCircle size={18} className="spin" />}
                  {busy ? t.gateway.processing : t.gateway.pay}
                </button>
                <button type="button" className="btn btn-secondary btn-lg" disabled={busy} onClick={() => complete(false)}>
                  {t.gateway.decline}
                </button>
              </div>
            </>
          )}

          {results && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE_OUT }}
            >
              {paid ? <SuccessMark /> : <CircleX size={72} className="success-check" style={{ color: 'var(--color-bad)' }} />}
              {paid && <Confetti />}
              <h2 style={{ textAlign: 'center' }}>{paid ? t.gateway.successTitle : t.gateway.failedTitle}</h2>
              <h3>{t.gateway.resultsTitle}</h3>
              <ol className="callback-list">
                {results.map((r, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.12 }}
                  >
                    <Badge tone={r.outcome === 'PROCESSED' ? 'good' : 'info'}>{r.outcome}</Badge> {t.gateway.outcome[r.outcome]}
                  </motion.li>
                ))}
              </ol>
              {final?.receiptNo && <Alert tone="good">{t.gateway.receipt(final.receiptNo)}</Alert>}
              {final?.failureReason && <Alert tone="bad">{t.gateway.failed(final.failureReason)}</Alert>}
              <Link className="btn" to="/fees">
                <ArrowLeft size={16} /> {t.gateway.backToFees}
              </Link>
            </motion.div>
          )}
        </div>
      )}
    </>
  );
}

/** A green circle that draws itself, then a tick that draws inside it. */
function SuccessMark() {
  const draw = (delay: number) => ({
    initial: { pathLength: 0 },
    animate: { pathLength: 1 },
    transition: { duration: 0.6, ease: EASE_OUT, delay },
  });
  return (
    <svg className="success-check" width="80" height="80" viewBox="0 0 80 80" aria-hidden="true">
      <motion.circle
        cx="40"
        cy="40"
        r="34"
        fill="none"
        stroke="var(--color-good)"
        strokeWidth="4"
        strokeLinecap="round"
        {...draw(0)}
      />
      <motion.path
        d="M26 41 l10 10 l19 -21"
        fill="none"
        stroke="var(--color-good)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...draw(0.45)}
      />
    </svg>
  );
}

/** Two bursts of confetti from the lower corners, on a canvas laid over the whole window. */
function Confetti() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvas.current) return;
    const fire = confetti.create(canvas.current, { resize: true, useWorker: false });
    const colours = ['#3b5bea', '#8b3fe8', '#22b8cf', '#e64980', '#2f9e44'];
    const common = { particleCount: 90, spread: 70, startVelocity: 55, colors: colours, disableForReducedMotion: true };
    void fire({ ...common, angle: 60, origin: { x: 0, y: 0.8 } });
    void fire({ ...common, angle: 120, origin: { x: 1, y: 0.8 } });
    return () => fire.reset();
  }, []);

  return createPortal(<canvas ref={canvas} className="confetti-canvas" aria-hidden="true" />, document.body);
}
