/*
 * A gate in front of pages.
 * - Still checking a saved login?  -> a small pulsing logo while we ask the backend.
 * - Not logged in?                 -> the welcome page (for the bare address "/") or the login page
 *                                     (for any other page, and come back to it afterwards).
 * - Logged in, wrong role?         -> show "You do not have access to this page."
 * The backend enforces the same rules again (RoleMatrix); this gate only avoids
 * showing people pages whose data they would not be allowed to load anyway.
 */
import { GraduationCap, ShieldX } from 'lucide-react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import type { Role } from '../api/types';
import { EmptyState } from '../components/ui';
import { t } from '../i18n/messages';
import { useAuth } from './AuthContext';

export function RequireAuth({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="splash" aria-busy="true">
        <span className="brand-mark">
          <GraduationCap size={26} />
        </span>
        <span className="sr-only">{t.common.loading}</span>
      </div>
    );
  }
  if (!user) {
    const target = location.pathname === '/' ? '/welcome' : '/login';
    return <Navigate to={target} replace state={{ from: location.pathname }} />;
  }
  if (roles && !roles.includes(user.role)) {
    return <EmptyState icon={ShieldX} text={t.errors.forbiddenPage} />;
  }
  return <>{children}</>;
}
