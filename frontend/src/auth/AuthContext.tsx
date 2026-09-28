/*
 * Remembers who is logged in and gives every page access to that person through useAuth().
 *
 * Login:  POST /api/auth/login -> the backend returns a token and the user's details.
 *         The token is saved (sessionStorage) and sent with every later request.
 * Reload: if a token is already saved, GET /api/auth/me asks the backend who it belongs to.
 * Logout: the token is thrown away. Nothing needs to be told to the backend, because the
 *         backend keeps no session: the token simply stops being sent.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../api/endpoints';
import { getToken, setToken, setUnauthorizedHandler } from '../api/http';
import type { Me } from '../api/types';
import { useToast } from '../components/Toast';
import { t } from '../i18n/messages';

interface AuthState {
  user: Me | null;
  ready: boolean;
  login: (username: string, password: string) => Promise<Me>;
  logout: (message?: string) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  const toast = useToast();

  const logout = useCallback(
    (message?: string) => {
      setToken(null);
      setUser(null);
      if (message) {
        toast.info(message);
      }
    },
    [toast],
  );

  // When any request answers 401 (token expired or tampered with), log out and say why.
  useEffect(() => {
    setUnauthorizedHandler(() => logout(t.errors.sessionExpired));
  }, [logout]);

  // On first load, restore the session if a token survived a page refresh.
  useEffect(() => {
    if (!getToken()) {
      setReady(true);
      return;
    }
    api.auth
      .me()
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const response = await api.auth.login(username, password);
    setToken(response.token);
    setUser(response.user);
    return response.user;
  }, []);

  const value = useMemo(() => ({ user, ready, login, logout }), [user, ready, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const state = useContext(AuthContext);
  if (!state) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return state;
}

/** The logged-in user, for pages that can only be reached after login. */
export function useUser(): Me {
  const { user } = useAuth();
  if (!user) {
    throw new Error('useUser called on a page without a logged-in user');
  }
  return user;
}
