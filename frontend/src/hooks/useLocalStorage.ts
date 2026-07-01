import { useState, useCallback } from "react";
import type { z } from "zod";

/**
 * @description Typed localStorage hook. Reads the initial value from
 * localStorage on mount; persists writes automatically.
 *
 * localStorage is a trust boundary too: a browser extension, a previous
 * (incompatible) app version, or a user manually poking at devtools can leave
 * behind a value that doesn't match `T`. When `schema` is provided, the
 * stored value is validated before use and silently discarded (falling back
 * to `initial`) if it doesn't match.
 *
 * @param key      - localStorage key
 * @param initial  - default value when the key is absent or invalid
 * @param schema   - optional Zod schema used to validate the persisted value
 * @returns A `[value, setValue]` tuple, mirroring `useState`.
 * @example
 * const [prefs, setPrefs] = useLocalStorage("prefs", defaultPrefs, prefsSchema);
 */
export function useLocalStorage<T>(
  key: string,
  initial: T,
  schema?: z.ZodType<T>
): [T, (value: T | ((prev: T) => T)) => void] {
  const [stored, setStored] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return initial;
      const parsed: unknown = JSON.parse(raw);
      if (!schema) return parsed as T;
      const result = schema.safeParse(parsed);
      return result.success ? result.data : initial;
    } catch {
      return initial;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStored((prev) => {
        const next = typeof value === "function" ? (value as (prev: T) => T)(prev) : value;
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
