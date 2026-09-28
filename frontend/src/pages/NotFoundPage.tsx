/*
 * Shown for any address that is not in App.tsx.
 */
import { Link } from 'react-router';
import { PageHeader } from '../components/ui';
import { t } from '../i18n/messages';

export function NotFoundPage() {
  return (
    <>
      <PageHeader title={t.notFound.title} subtitle={t.notFound.body} />
      <Link className="btn" to="/">
        {t.notFound.home}
      </Link>
    </>
  );
}
