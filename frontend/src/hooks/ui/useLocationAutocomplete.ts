/**
 * useLocationAutocomplete
 *
 * Fetches Polish city suggestions from the Nominatim OpenStreetMap API.
 * Results are debounced (300 ms) and deduplicated by name + voivodeship.
 * Stale requests are cancelled via AbortController.
 *
 * Follows the same UX pattern as OLX / Otomoto:
 *  - minimum 2 characters to trigger a request
 *  - max 7 results
 *  - each result carries coordinates ready for matchmaking
 */

import { useState, useEffect } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────

/** A single suggestion returned by the autocomplete. */
export interface LocationSuggestion {
  /** Nominatim place_id used as a stable React key. */
  id: string;
  /** Polish city / town / village name. */
  name: string;
  /** Voivodeship (województwo). */
  state: string;
  lat: number;
  lon: number;
}

// ─── Internal Nominatim types ──────────────────────────────────────────────────

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  state?: string;
}

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  address?: NominatimAddress;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";
const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;
const MAX_RESULTS = 7;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function buildSearchUrl(query: string): string {
  const params = new URLSearchParams({
    q: query,
    countrycodes: "pl",
    limit: String(MAX_RESULTS),
    format: "json",
    addressdetails: "1",
    "accept-language": "pl",
  });
  return `${NOMINATIM_BASE}?${params}`;
}

function toSuggestion(item: NominatimResult): LocationSuggestion | null {
  const addr = item.address ?? {};
  const name = addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? null;
  if (!name) return null;

  return {
    id: String(item.place_id),
    name,
    state: addr.state ?? "",
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
  };
}

function deduplicateByNameAndState(items: LocationSuggestion[]): LocationSuggestion[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.name}|${item.state}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export interface UseLocationAutocompleteResult {
  suggestions: LocationSuggestion[];
  isLoading: boolean;
}

/**
 * @description Returns debounced, deduplicated autocomplete suggestions for
 * Polish cities as the user types, cancelling stale in-flight requests.
 * @param query - Raw text typed by the user (not debounced externally).
 * @returns The current suggestion list and whether a request is in flight.
 */
export function useLocationAutocomplete(query: string): UseLocationAutocompleteResult {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(buildSearchUrl(trimmed), {
          signal: controller.signal,
          headers: { "User-Agent": "paiirz/1.0" },
        });

        if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);

        const data: NominatimResult[] = await res.json();

        const mapped = data.map(toSuggestion).filter((s): s is LocationSuggestion => s !== null);

        setSuggestions(deduplicateByNameAndState(mapped));
      } catch (err) {
        // Ignore abort errors (user typed more characters or component unmounted)
        if ((err as Error).name !== "AbortError") {
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return { suggestions, isLoading };
}
