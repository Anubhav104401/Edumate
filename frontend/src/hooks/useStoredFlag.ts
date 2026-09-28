/*
 * A true/false value that this browser remembers between visits (in localStorage),
 * for small personal preferences such as "keep the side menu collapsed".
 *
 *   const [collapsed, setCollapsed] = useStoredFlag('edumate.sidebar');
 *
 * If the browser refuses storage (a private window), it still works; it just forgets on reload.
 */
import { useCallback, useState } from 'react';

export function useStoredFlag(key: string): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState<boolean>(() => {
    try {
      return localStorage.getItem(key) === 'true';
    } catch {
      return false;
    }
  });

  const update = useCallback(
    (next: boolean) => {
      setValue(next);
      try {
        localStorage.setItem(key, String(next));
      } catch {
        // not remembered, but the change still applies now
      }
    },
    [key],
  );

  return [value, update];
}
