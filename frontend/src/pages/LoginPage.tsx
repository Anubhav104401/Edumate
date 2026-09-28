/*
 * The sign-in screen: http://localhost:5173/login
 *
 * Left half (large screens only): a living picture of the product. A drifting aurora, a headline,
 * and glass preview cards that float with the mouse.
 * Right half: the form. It shows a password eye, warns about Caps Lock, and (in development only)
 * offers every demo account as a searchable grid: click to fill the form, double-click to sign in.
 */
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  CircleCheck,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  LoaderCircle,
  Search,
  ShieldCheck,
  TriangleAlert,
  UserRound,
} from 'lucide-react';
import { useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { errorMessage } from '../api/http';
import { useAuth } from '../auth/AuthContext';
import { Ring } from '../components/charts';
import { ThemeToggle } from '../components/Topbar';
import { ErrorBanner, IconTile } from '../components/ui';
import { DEMO_PASSWORD, DEMO_ROLES, DEMO_USERNAMES, SHOW_DEMO_ACCOUNTS } from '../config';
import { t } from '../i18n/messages';
import { Float, usePointer } from '../motion/Parallax';
import { EASE_OUT } from '../motion/presets';
import { Stagger, StaggerItem } from '../motion/Reveal';
import { ROLE_ICONS } from '../navigation';

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Where to go after login: the page the user originally asked for, or the dashboard.
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  if (user) {
    return <Navigate to={from} replace />;
  }

  async function signIn(name: string, secret: string) {
    if (!name.trim() || !secret) {
      setError(t.login.missingFields);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await login(name.trim(), secret);
      navigate(from, { replace: true });
    } catch (err) {
      setError(errorMessage(err)); // e.g. "Invalid username or password." from the backend
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault(); // stop the browser from reloading the page
    void signIn(username, password);
  }

  /** Caps Lock turns a correct password into a wrong one, so we say when it is on. */
  const watchCaps = (event: KeyboardEvent<HTMLInputElement>) => setCapsLock(event.getModifierState('CapsLock'));

  return (
    <div className="auth">
      <Showcase />

      <main className="auth-panel">
        <div className="auth-top">
          <Link to="/welcome" className="auth-back">
            <ArrowLeft size={16} /> {t.login.about}
          </Link>
          <ThemeToggle />
        </div>

        <motion.div
          className="auth-form-wrap"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE_OUT }}
        >
          <span className="brand-mark" aria-hidden="true">
            <GraduationCap size={20} />
          </span>
          <h1>{t.login.welcome}</h1>
          <p>{t.login.subtitle}</p>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <ErrorBanner message={error} />
              </motion.div>
            )}
          </AnimatePresence>

          <form className="auth-form" onSubmit={handleSubmit} noValidate aria-label={t.login.title}>
            <div className="field">
              <label htmlFor="username">{t.login.username}</label>
              <div className="input-icon">
                <UserRound size={18} />
                <input
                  id="username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="password">{t.login.password}</label>
              <div className="input-icon">
                <KeyRound size={18} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={watchCaps}
                  onKeyUp={watchCaps}
                  aria-describedby={capsLock ? 'caps-warning' : undefined}
                />
                <button
                  type="button"
                  className="icon-btn plain input-action"
                  aria-label={showPassword ? t.login.hidePassword : t.login.showPassword}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {capsLock && (
                <span className="caps" id="caps-warning">
                  <TriangleAlert size={14} /> {t.login.capsLock}
                </span>
              )}
            </div>
            <button type="submit" className="btn btn-lg btn-block" disabled={busy}>
              {busy ? (
                <>
                  <LoaderCircle size={18} className="spin" /> {t.login.submitting}
                </>
              ) : (
                <>
                  {t.login.submit} <ArrowRight size={18} className="arrow" />
                </>
              )}
            </button>
          </form>

          {SHOW_DEMO_ACCOUNTS && (
            <DemoAccounts
              selected={username}
              onPick={(name) => {
                setUsername(name);
                setPassword(DEMO_PASSWORD);
                setError(null);
              }}
              onSignIn={(name) => void signIn(name, DEMO_PASSWORD)}
            />
          )}
        </motion.div>
      </main>
    </div>
  );
}

/** The left half: headline and floating preview cards on a drifting aurora. Decoration only. */
function Showcase() {
  const pointer = usePointer();
  return (
    <aside className="auth-visual noise" onPointerMove={pointer.onPointerMove} onPointerLeave={pointer.onPointerLeave}>
      <div className="aurora" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="grid-lines" aria-hidden="true" />

      <Link to="/welcome" className="sidebar-brand" style={{ padding: 0 }}>
        <span className="brand-mark">
          <GraduationCap size={20} />
        </span>
        <span>{t.app.name}</span>
      </Link>

      <div>
        <motion.div
          className="auth-copy"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.1 }}
        >
          <span className="glow-pill">
            <span className="dot">
              <ShieldCheck size={12} />
            </span>
            {t.login.heroEyebrow}
          </span>
          <h1>
            {t.login.heroTitleA} <span className="serif text-gradient">{t.login.heroTitleAccent}</span>
          </h1>
          <p>{t.login.heroBody}</p>
        </motion.div>

        <div className="auth-cards" aria-hidden="true">
          <Float pointer={pointer} depth={-30} className="float-card" style={{ left: 0, top: 10 }}>
            <Ring percent={75} size={56} stroke={6} tone="good" delay={0.4}>
              <strong style={{ fontSize: 13 }}>75%</strong>
            </Ring>
            <div>
              <strong>{t.preview.attendance}</strong>
              <span>{t.attendance.status.OK}</span>
            </div>
          </Float>
          <Float pointer={pointer} depth={40} className="float-card" style={{ left: '46%', top: 0 }}>
            <IconTile icon={CircleCheck} tone="good" />
            <div>
              <strong>{t.preview.paid}</strong>
              <span>{t.preview.paidHint}</span>
            </div>
          </Float>
          <Float pointer={pointer} depth={20} className="float-card" style={{ left: '12%', top: 150 }}>
            <IconTile icon={ShieldCheck} tone="accent" />
            <div>
              <strong>{t.preview.approved}</strong>
              <span>{t.preview.approvedHint}</span>
            </div>
          </Float>
          <Float pointer={pointer} depth={-16} className="float-card" style={{ left: '58%', top: 120 }}>
            <div>
              <span>{t.preview.sgpa}</span>
              <strong className="text-gradient" style={{ fontSize: 28 }}>
                8.63
              </strong>
            </div>
          </Float>
        </div>
      </div>

      <div className="auth-secure">
        <ShieldCheck size={16} /> {t.login.secure}
      </div>
    </aside>
  );
}

/** The demo accounts (development builds only): search, click to fill, double-click to sign in. */
function DemoAccounts({
  selected,
  onPick,
  onSignIn,
}: {
  selected: string;
  onPick: (username: string) => void;
  onSignIn: (username: string) => void;
}) {
  const [filter, setFilter] = useState('');
  const shown = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return DEMO_USERNAMES.filter((name) =>
      [name, t.login.demoAccounts[name], t.roles[DEMO_ROLES[name]]].some((text) => text.toLowerCase().includes(needle)),
    );
  }, [filter]);

  return (
    <section className="demo" aria-label={t.login.demoTitle}>
      <div className="demo-head">
        <strong>{t.login.demoTitle}</strong>
        <span className="chip mono">{DEMO_PASSWORD}</span>
      </div>
      <p>
        {t.login.demoHint(DEMO_PASSWORD)} {t.login.demoInstant}
      </p>
      <div className="input-icon">
        <Search size={16} />
        <input
          type="search"
          placeholder={t.login.demoSearch}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label={t.login.demoSearch}
        />
      </div>
      <Stagger className="demo-grid" gap={0.025} delay={0.3} key={filter === '' ? 'all' : 'filtered'}>
        {shown.map((name) => {
          const Icon = ROLE_ICONS[DEMO_ROLES[name]];
          return (
            <StaggerItem key={name}>
              <button
                type="button"
                className="demo-account"
                aria-pressed={selected === name}
                onClick={() => onPick(name)}
                onDoubleClick={() => onSignIn(name)}
              >
                <IconTile icon={Icon} size="sm" />
                <div>
                  <strong>{name}</strong>
                  <span>{t.login.demoAccounts[name]}</span>
                </div>
              </button>
            </StaggerItem>
          );
        })}
      </Stagger>
    </section>
  );
}
