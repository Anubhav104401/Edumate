/*
 * useLoad: the standard way a page fetches data.
 *
 *   const { data, error, loading, reload } = useLoad(() => api.attendance.mine(), []);
 *
 * It calls the function when the page opens (and again whenever something in `deps` changes),
 * remembers the answer in `data`, the problem in `error`, and whether it is still waiting in `loading`.
 */
import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '../api/http';

export interface LoadState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
  setData: (value: T) => void;
}

export function useLoad<T>(loader: () => Promise<T>, deps: unknown[], enabled = true): LoadState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [tick, setTick] = useState(0);

  // A new `load` function is made only when something in `deps` changes; that is what triggers a new fetch.
  const load = useCallback(loader, deps);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false; // ignore an old answer that arrives after the page moved on
    setLoading(true);
    setError(null);
    load()
      .then((value) => {
        if (!cancelled) setData(value);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load, tick, enabled]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { data, error, loading, reload, setData };
}
