import "@testing-library/jest-dom";

// Node.js 22 ships an experimental localStorage that returns undefined unless
// --localstorage-file is specified. This prevents happy-dom from injecting its
// own implementation because the property already exists on globalThis.
// We detect the broken state and install a working in-memory shim instead.
try {
  // If localStorage is undefined or throws on access, the shim is needed.
  localStorage.setItem("__vitest_probe__", "1");
  localStorage.removeItem("__vitest_probe__");
} catch {
  const createShim = () => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string): string | null => (key in store ? store[key] : null),
      setItem: (key: string, value: string): void => {
        store[key] = String(value);
      },
      removeItem: (key: string): void => {
        delete store[key];
      },
      clear: (): void => {
        store = {};
      },
      get length(): number {
        return Object.keys(store).length;
      },
      key: (index: number): string | null => Object.keys(store)[index] ?? null,
    };
  };

  Object.defineProperty(globalThis, "localStorage", {
    value: createShim(),
    writable: true,
    configurable: true,
  });

  Object.defineProperty(globalThis, "sessionStorage", {
    value: createShim(),
    writable: true,
    configurable: true,
  });
}
