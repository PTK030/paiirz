import { useState, useCallback } from "react";

/**
 * Typed localStorage hook.
 * Reads the initial value from localStorage on mount; persists writes automatically.
 *
 * @param key      - localStorage key
 * @param initial  - default value when the key is absent
 */
export function useLocalStorage<T>(
  key: string,
  initial: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [stored, setStored] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return initial;
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStored((prev) => {
        const next =
          typeof value === "function"
            ? (value as (prev: T) => T)(prev)
            : value;
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // quota exceeded or private mode - degrade gracefully
        }
        return next;
      });
    },
    [key]
  );

  return [stored, setValue];
}
