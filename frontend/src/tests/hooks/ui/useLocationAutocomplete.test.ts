import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { useLocationAutocomplete } from "../../hooks/useLocationAutocomplete";

function mockNominatimResponse(results: unknown[]) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(results),
  } as Response;
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("useLocationAutocomplete", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockNominatimResponse([])));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("does not search below the 2-character minimum", async () => {
    const { result } = renderHook(({ query }) => useLocationAutocomplete(query), {
      initialProps: { query: "w" },
    });
    await advance(500);
    expect(fetch).not.toHaveBeenCalled();
    expect(result.current.suggestions).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("debounces requests and fetches after 300ms of no changes", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockNominatimResponse([
        {
          place_id: 1,
          lat: "52.2297",
          lon: "21.0122",
          address: { city: "Warszawa", state: "mazowieckie" },
        },
      ])
    );

    const { result, rerender } = renderHook(({ query }) => useLocationAutocomplete(query), {
      initialProps: { query: "wa" },
    });

    await advance(200);
    rerender({ query: "war" });
    await advance(200);
    expect(fetch).not.toHaveBeenCalled();

    await advance(300);
    await waitFor(() => expect(result.current.suggestions).toHaveLength(1));

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.current.suggestions[0]).toEqual({
      id: "1",
      name: "Warszawa",
      state: "mazowieckie",
      lat: 52.2297,
      lon: 21.0122,
    });
  });

  it("deduplicates suggestions with the same name and voivodeship", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockNominatimResponse([
        {
          place_id: 1,
          lat: "50.06",
          lon: "19.94",
          address: { city: "Kraków", state: "małopolskie" },
        },
        {
          place_id: 2,
          lat: "50.07",
          lon: "19.95",
          address: { town: "Kraków", state: "małopolskie" },
        },
      ])
    );

    const { result } = renderHook(() => useLocationAutocomplete("krak"));
    await advance(300);
    await waitFor(() => expect(result.current.suggestions).toHaveLength(1));
  });

  it("skips results with no usable place name", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockNominatimResponse([{ place_id: 1, lat: "1", lon: "1", address: {} }])
    );

    const { result } = renderHook(() => useLocationAutocomplete("xyz"));
    await advance(300);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.suggestions).toEqual([]);
  });

  it("clears suggestions and stops loading on a non-abort fetch error", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useLocationAutocomplete("wa"));
    await advance(300);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.suggestions).toEqual([]);
  });

  it("resets to empty when the query is cleared", async () => {
    const { result, rerender } = renderHook(({ query }) => useLocationAutocomplete(query), {
      initialProps: { query: "warsz" },
    });
    await advance(300);
    rerender({ query: "" });
    expect(result.current.suggestions).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });
});
