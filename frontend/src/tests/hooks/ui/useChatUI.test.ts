import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { useChatUI } from "../../hooks/useChatUI";

/** Builds a DOM element belonging (or not) to one of the menu containers. */
function clickOn(className: string | null) {
  const el = document.createElement("div");
  if (className) el.className = className;
  document.body.appendChild(el);
  el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  document.body.removeChild(el);
}

describe("useChatUI", () => {
  it("starts with all menus closed", () => {
    const { result } = renderHook(() => useChatUI());
    expect(result.current.gamesMenuOpen).toBe(false);
    expect(result.current.contactMenuOpen).toBe(false);
    expect(result.current.actionsMenuOpen).toBe(false);
  });

  it("opens and closes each menu independently via its setter", () => {
    const { result } = renderHook(() => useChatUI());
    act(() => result.current.setGamesMenuOpen(true));
    expect(result.current.gamesMenuOpen).toBe(true);
    expect(result.current.contactMenuOpen).toBe(false);

    act(() => result.current.setContactMenuOpen(true));
    expect(result.current.contactMenuOpen).toBe(true);

    act(() => result.current.setActionsMenuOpen(true));
    expect(result.current.actionsMenuOpen).toBe(true);
  });

  it("supports the functional updater form", () => {
    const { result } = renderHook(() => useChatUI());
    act(() => result.current.setGamesMenuOpen((prev) => !prev));
    expect(result.current.gamesMenuOpen).toBe(true);
    act(() => result.current.setGamesMenuOpen((prev) => !prev));
    expect(result.current.gamesMenuOpen).toBe(false);
  });

  it("closes an open menu when clicking outside its container", () => {
    const { result } = renderHook(() => useChatUI());
    act(() => result.current.setGamesMenuOpen(true));
    expect(result.current.gamesMenuOpen).toBe(true);

    act(() => clickOn(null));
    expect(result.current.gamesMenuOpen).toBe(false);
  });

  it("keeps a menu open when clicking inside its own container", () => {
    const { result } = renderHook(() => useChatUI());
    act(() => result.current.setContactMenuOpen(true));

    act(() => clickOn("contact-exchange-container"));
    expect(result.current.contactMenuOpen).toBe(true);
  });

  it("does not close a menu when clicking inside a different menu's container", () => {
    const { result } = renderHook(() => useChatUI());
    act(() => result.current.setGamesMenuOpen(true));

    act(() => clickOn("actions-menu-container"));
    expect(result.current.gamesMenuOpen).toBe(false);
  });

  it("removes the outside-click listener on unmount", () => {
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const { unmount } = renderHook(() => useChatUI());
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("click", expect.any(Function));
    removeSpy.mockRestore();
  });
});
