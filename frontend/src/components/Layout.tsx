/*
 * The frame around every page after login: dark menu on the left, a white bar at the top
 * with the user's name and "Log out", and the current page in the middle (<Outlet />).
 */
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useUser, useAuth } from '../auth/AuthContext';
import { t } from '../i18n/messages';
import { MENU } from '../navigation';
import { ErrorBoundary } from './ErrorBoundary';

export function Layout() {
  const user = useUser();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout(t.topbar.loggedOut);
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <nav className="sidebar" aria-label="Main menu">
        <div className="sidebar-brand">
          <img src="/favicon.svg" alt="" />
          <span>{t.app.name}</span>
        </div>
        {MENU[user.role].map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'}>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="main">
        <header className="topbar">
          <span className="muted small">{t.app.tagline}</span>
          <div className="topbar-user">
            <div>
              <div>
                <strong>{user.fullName}</strong>
              </div>
              <div className="muted small">
                {t.roles[user.role]} · {t.topbar.campus(user.campusCode)}
              </div>
            </div>
            <button type="button" className="btn btn-secondary btn-small" onClick={handleLogout}>
              {t.topbar.logout}
            </button>
          </div>
        </header>
        <main className="content">
          <ErrorBoundary resetKey={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
