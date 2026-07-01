import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { usePreferences } from "../../hooks/usePreferences";

describe("usePreferences", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults gender/radius filters to 'any' and clears text/coordinate fields", () => {
    const { result } = renderHook(() => usePreferences());
    expect(result.current.myGender).toBe("any");
    expect(result.current.targetGender).toBe("any");
    expect(result.current.myRadius).toBe("any");
    expect(result.current.myAge).toBe("");
    expect(result.current.userLat).toBeNull();
    expect(result.current.userLon).toBeNull();
  });

  it("persists gender/age/location changes across remounts", () => {
    const { result, unmount } = renderHook(() => usePreferences());
    act(() => {
      result.current.setMyGender("female");
      result.current.setTargetGender("male");
      result.current.setMyAge("28");
      result.current.setAgeMin("20");
      result.current.setAgeMax("35");
      result.current.setUserLat(52.2297);
      result.current.setUserLon(21.0122);
      result.current.setLocationCity("Warszawa");
      result.current.setMyRadius("50");
    });
    unmount();

    const { result: reloaded } = renderHook(() => usePreferences());
    expect(reloaded.current.myGender).toBe("female");
    expect(reloaded.current.targetGender).toBe("male");
    expect(reloaded.current.myAge).toBe("28");
    expect(reloaded.current.ageMin).toBe("20");
    expect(reloaded.current.ageMax).toBe("35");
    expect(reloaded.current.userLat).toBe(52.2297);
    expect(reloaded.current.userLon).toBe(21.0122);
    expect(reloaded.current.locationCity).toBe("Warszawa");
    expect(reloaded.current.myRadius).toBe("50");
  });

  it("rejects a corrupted gender value from localStorage and falls back to 'any'", () => {
    localStorage.setItem("pref_my_gender", JSON.stringify("not-a-gender"));
    const { result } = renderHook(() => usePreferences());
    expect(result.current.myGender).toBe("any");
  });

  it("keeps location loading/error state transient (not persisted)", () => {
    const { result, unmount } = renderHook(() => usePreferences());
    act(() => {
      result.current.setLocationLoading(true);
      result.current.setLocationError("Nie udało się pobrać lokalizacji.");
    });
    expect(result.current.locationLoading).toBe(true);
    expect(result.current.locationError).toBe("Nie udało się pobrać lokalizacji.");
    unmount();

    const { result: reloaded } = renderHook(() => usePreferences());
    expect(reloaded.current.locationLoading).toBe(false);
    expect(reloaded.current.locationError).toBeNull();
  });

  it("generates and persists a stable peerId across remounts", () => {
    const { result, unmount } = renderHook(() => usePreferences());
    const firstId = result.current.peerId;
    expect(firstId).toBeTruthy();
    unmount();

    const { result: reloaded } = renderHook(() => usePreferences());
    expect(reloaded.current.peerId).toBe(firstId);
  });

  it("falls back to a fresh, non-persisted peerId when localStorage throws", () => {
    const originalGetItem = localStorage.getItem.bind(localStorage);
    localStorage.getItem = vi.fn().mockImplementation(() => {
      throw new DOMException("SecurityError");
    });

    const { result } = renderHook(() => usePreferences());
    expect(result.current.peerId).toBeTruthy();

    localStorage.getItem = originalGetItem;
  });
});
