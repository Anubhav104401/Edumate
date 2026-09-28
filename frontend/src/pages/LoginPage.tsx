/*
 * The sign-in screen: http://localhost:5173/login
 */
import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { errorMessage } from '../api/http';
import { useAuth } from '../auth/AuthContext';
import { ErrorBanner } from '../components/ui';
import { DEMO_PASSWORD, DEMO_USERNAMES, SHOW_DEMO_ACCOUNTS } from '../config';
import { t } from '../i18n/messages';

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Where to go after login: the page the user originally asked for, or the dashboard.
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  if (user) {
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault(); // stop the browser from reloading the page
    if (!username.trim() || !password) {
      setError(t.login.missingFields);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await login(username.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(errorMessage(err)); // e.g. "Invalid username or password." from the backend
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="sidebar-brand" style={{ color: 'var(--color-primary)', padding: 0, marginBottom: 16 }}>
          <img src="/favicon.svg" alt="" />
          <span>{t.app.name}</span>
        </div>
        <h1>{t.login.title}</h1>
        <p className="muted">{t.login.subtitle}</p>
        {error && <ErrorBanner message={error} />}
        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="username">{t.login.username}</label>
            <input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>
          <div className="field">
            <label htmlFor="password">{t.login.password}</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn" disabled={busy}>
            {busy ? t.login.submitting : t.login.submit}
          </button>
        </form>

        {SHOW_DEMO_ACCOUNTS && (
          <div className="demo-accounts">
            <strong>{t.login.demoTitle}</strong>
            <p>{t.login.demoHint(DEMO_PASSWORD)}</p>
            <ul>
              {DEMO_USERNAMES.map((demo) => (
                <li key={demo}>
                  <button
                    type="button"
                    onClick={() => {
                      setUsername(demo);
                      setPassword(DEMO_PASSWORD);
                    }}
                  >
                    {demo}
                  </button>{' '}
                  – {t.login.demoAccounts[demo]}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
