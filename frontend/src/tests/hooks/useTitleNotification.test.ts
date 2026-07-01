import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTitleNotification } from "../../hooks/useTitleNotification";
import { APP_TITLE } from "../../utils/brand";

describe("useTitleNotification", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.title = APP_TITLE;
    // Simulate tab not focused
    vi.spyOn(document, "hasFocus").mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.title = APP_TITLE;
  });

  it("does not flash when tab is focused", () => {
    vi.spyOn(document, "hasFocus").mockReturnValue(true);
    const { result } = renderHook(() => useTitleNotification());
    act(() => result.current.triggerTitleNotification());
    vi.advanceTimersByTime(2000);
    expect(document.title).toBe(APP_TITLE);
  });

  it("flashes title when tab is not focused", () => {
    const { result } = renderHook(() => useTitleNotification());
    act(() => result.current.triggerTitleNotification());
    act(() => vi.advanceTimersByTime(1000));
    expect(document.title).toBe("💬 Nowa wiadomość");
  });

  it("does not start a second interval when already flashing", () => {
    const { result } = renderHook(() => useTitleNotification());
    act(() => result.current.triggerTitleNotification());
    act(() => result.current.triggerTitleNotification());
    // Should still work normally
    act(() => vi.advanceTimersByTime(1000));
    expect(document.title).toBe("💬 Nowa wiadomość");
  });

  it("stops flashing on window focus", () => {
    const { result } = renderHook(() => useTitleNotification());
    act(() => result.current.triggerTitleNotification());
    act(() => vi.advanceTimersByTime(1000));
    // Simulate focus event
    act(() => window.dispatchEvent(new Event("focus")));
    expect(document.title).toBe(APP_TITLE);
  });

  it("restores title on unmount", () => {
    const { result, unmount } = renderHook(() => useTitleNotification());
    act(() => result.current.triggerTitleNotification());
    act(() => vi.advanceTimersByTime(1000));
    unmount();
    expect(document.title).toBe(APP_TITLE);
  });

  it("alternates title on every interval tick", () => {
    const { result } = renderHook(() => useTitleNotification());
    act(() => result.current.triggerTitleNotification());
    // First tick: switches to notification
    act(() => vi.advanceTimersByTime(1000));
    expect(document.title).toBe("💬 Nowa wiadomość");
    // Second tick: switches back to default
    act(() => vi.advanceTimersByTime(1000));
    expect(document.title).toBe(APP_TITLE);
    // Third tick: back to notification
    act(() => vi.advanceTimersByTime(1000));
    expect(document.title).toBe("💬 Nowa wiadomość");
  });
});
