import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLocalStorage } from "../../hooks/useLocalStorage";

describe("useLocalStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns the default value when key is not set", () => {
    const { result } = renderHook(() => useLocalStorage("test-key", "default"));
    expect(result.current[0]).toBe("default");
  });

  it("reads an existing value from localStorage", () => {
    localStorage.setItem("test-key", JSON.stringify("stored"));
    const { result } = renderHook(() => useLocalStorage("test-key", "default"));
    expect(result.current[0]).toBe("stored");
  });

  it("stores a new value to localStorage", () => {
    const { result } = renderHook(() => useLocalStorage("test-key", "default"));
    act(() => {
      result.current[1]("new-value");
    });
    expect(result.current[0]).toBe("new-value");
    expect(JSON.parse(localStorage.getItem("test-key")!)).toBe("new-value");
  });

  it("supports object values", () => {
    const { result } = renderHook(() =>
      useLocalStorage<{ x: number }>("obj-key", { x: 0 })
    );
    act(() => {
      result.current[1]({ x: 42 });
    });
    expect(result.current[0]).toEqual({ x: 42 });
  });

  it("supports functional updater", () => {
    const { result } = renderHook(() => useLocalStorage("num-key", 0));
    act(() => {
      result.current[1]((prev) => prev + 1);
    });
    expect(result.current[0]).toBe(1);
  });

  it("handles corrupted localStorage gracefully", () => {
    localStorage.setItem("bad-key", "not valid json{{{{");
    const { result } = renderHook(() => useLocalStorage("bad-key", "fallback"));
    expect(result.current[0]).toBe("fallback");
  });

  it("stores boolean values correctly", () => {
    const { result } = renderHook(() => useLocalStorage("bool-key", true));
    act(() => {
      result.current[1](false);
    });
    expect(result.current[0]).toBe(false);
    expect(JSON.parse(localStorage.getItem("bool-key")!)).toBe(false);
  });

  it("stores null correctly", () => {
    const { result } = renderHook(() =>
      useLocalStorage<string | null>("null-key", null)
    );
    expect(result.current[0]).toBeNull();
  });

  it("degrades gracefully when localStorage.setItem throws", () => {
    const originalSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = vi.fn().mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });

    const { result } = renderHook(() => useLocalStorage("quota-key", "initial"));
    // State should still update even if persistence fails
    act(() => {
      result.current[1]("new-value");
    });
    expect(result.current[0]).toBe("new-value");

    localStorage.setItem = originalSetItem;
  });
});
