/*
 * The home page after login: a row of coloured tiles ("cards") chosen by the backend for the user's role.
 */
import { Link } from 'react-router';
import { api } from '../api/endpoints';
import { useUser } from '../auth/AuthContext';
import { EmptyState, ErrorBanner, Loading, PageHeader } from '../components/ui';
import { useLoad } from '../hooks/useLoad';
import { t } from '../i18n/messages';

export function DashboardPage() {
  const user = useUser();
  const { data: cards, error, loading, reload } = useLoad(() => api.dashboard(), []);

  return (
    <>
      <PageHeader title={t.dashboard.greeting(user.fullName)} subtitle={t.dashboard.subtitle} />
      {loading && <Loading />}
      {error && <ErrorBanner message={error} onRetry={reload} />}
      {cards && cards.length === 0 && <EmptyState text={t.dashboard.empty} />}
      {cards && (
        <div className="grid">
          {cards.map((card) => (
            <Link key={card.key} to={card.link} className={`stat tone-${card.tone}`}>
              <div className="stat-label">{card.label}</div>
              <div className="stat-value">{card.value}</div>
              <div className="stat-hint">{card.hint}</div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
