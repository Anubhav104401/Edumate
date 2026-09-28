/*
 * A gate in front of pages.
 * - Not logged in?          -> go to the login page (and come back here afterwards).
 * - Logged in, wrong role?  -> show "You do not have access to this page."
 * The backend enforces the same rules again (RoleMatrix); this gate only avoids
 * showing people pages whose data they would not be allowed to load anyway.
 */
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import type { Role } from '../api/types';
import { Alert, Loading } from '../components/ui';
import { t } from '../i18n/messages';
import { useAuth } from './AuthContext';

export function RequireAuth({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return <Loading />;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Alert tone="bad">{t.errors.forbiddenPage}</Alert>;
  }
  return <>{children}</>;
}
