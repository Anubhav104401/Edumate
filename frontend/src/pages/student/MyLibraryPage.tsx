/*
 * Books a student has borrowed, with due dates and fines so far.
 * Data: GET /api/library/loans/me
 *
 * Each loan is a card with a little "book cover" whose colour comes from the title.
 */
import { BookOpen } from 'lucide-react';
import type { CSSProperties } from 'react';
import { api } from '../../api/endpoints';
import { Badge, EmptyState, ErrorBanner, Loading, PageHeader } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n/messages';
import { Stagger, StaggerItem } from '../../motion/Reveal';
import { formatDate, formatMoney } from '../../utils/format';
import { hueFor } from '../../utils/visuals';

export function MyLibraryPage() {
  const { data, error, loading, reload } = useLoad(() => api.library.myLoans(), []);

  return (
    <>
      <PageHeader title={t.library.myTitle} subtitle={t.library.finePolicy} />
      {loading && <Loading />}
      {error && <ErrorBanner message={error} onRetry={reload} />}
      {data && data.length === 0 && <EmptyState icon={BookOpen} text={t.library.none} />}
      {data && data.length > 0 && (
        <Stagger className="course-cards" gap={0.07}>
          {data.map((loan) => (
            <StaggerItem key={loan.id}>
              <div className="card book-card">
                <div className="book-cover" style={{ '--hue': hueFor(loan.title) } as CSSProperties} aria-hidden="true">
                  {loan.title.charAt(0)}
                </div>
                <div className="course-card-body">
                  <h3>{loan.title}</h3>
                  <span className="muted small">{loan.author}</span>
                  <dl className="dl">
                    <div>
                      <dt>{t.library.columns.issued}</dt>
                      <dd>{formatDate(loan.issuedOn)}</dd>
                    </div>
                    <div>
                      <dt>{t.library.columns.due}</dt>
                      <dd>{formatDate(loan.dueOn)}</dd>
                    </div>
                    <div>
                      <dt>{t.library.columns.late}</dt>
                      <dd>{loan.daysLate}</dd>
                    </div>
                    <div>
                      <dt>{t.library.columns.fine}</dt>
                      <dd>{formatMoney(loan.fine)}</dd>
                    </div>
                  </dl>
                  <div>
                    {loan.open ? (
                      <Badge tone={loan.daysLate > 0 ? 'bad' : 'info'}>
                        {loan.daysLate > 0 ? t.library.overdue : t.library.onLoan}
                      </Badge>
                    ) : (
                      <Badge tone="good">{t.library.returnedOn(formatDate(loan.returnedOn))}</Badge>
                    )}
                  </div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </>
  );
}
