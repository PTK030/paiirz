import { useState } from "react";
import { z } from "zod";

import { useLocalStorage } from "./useLocalStorage";

/** Gender filter value used for both "my gender" and "target gender" preferences. */
export type Gender = "female" | "male" | "any";

// ── Runtime validation for values persisted in localStorage ─────────────────
const genderSchema = z.enum(["female", "male", "any"]);
const stringPreferenceSchema = z.string();
const coordinateSchema = z.number().nullable();

/** Return type of {@link usePreferences} - matchmaking filter state and setters. */
export interface MatchmakingPreferences {
  myGender: Gender;
  setMyGender: (v: Gender) => void;
  targetGender: Gender;
  setTargetGender: (v: Gender) => void;
  myAge: string;
  setMyAge: (v: string) => void;
  ageMin: string;
  setAgeMin: (v: string) => void;
  ageMax: string;
  setAgeMax: (v: string) => void;
  userLat: number | null;
  setUserLat: (v: number | null) => void;
  userLon: number | null;
  setUserLon: (v: number | null) => void;
  locationCity: string;
  setLocationCity: (v: string) => void;
  locationLoading: boolean;
  setLocationLoading: (v: boolean) => void;
  locationError: string | null;
  setLocationError: (v: string | null) => void;
  myRadius: string;
  setMyRadius: (v: string) => void;
  peerId: string;
}

/**
 * @description Reads the persistent anonymous peer id from `localStorage`,
 * generating and storing a new one on first use. Falls back to a fresh
 * (non-persisted) id if `localStorage` is unavailable (e.g. private mode).
 * @returns A stable UUID identifying this browser for the lifetime of the app.
 */
function getOrCreatePeerId(): string {
  try {
    const existing = localStorage.getItem("peer_id");
    if (existing) return existing;
    const newId = crypto.randomUUID();
    localStorage.setItem("peer_id", newId);
    return newId;
  } catch {
    return crypto.randomUUID();
  }
}

/**
 * @description Manages all matchmaking preferences (gender filters, age range,
 * location/radius) for the chat setup screen. Persistent fields are backed by
 * `useLocalStorage` (validated with Zod), while location-lookup loading/error
 * state is transient and reset on every reload.
 * @returns The current preference values together with their setters and the
 * stable anonymous `peerId` for this browser.
 */
export function usePreferences(): MatchmakingPreferences {
  const [myGender, setMyGender] = useLocalStorage<Gender>("pref_my_gender", "any", genderSchema);
  const [targetGender, setTargetGender] = useLocalStorage<Gender>(
    "pref_target_gender",
    "any",
    genderSchema
  );
  const [myAge, setMyAge] = useLocalStorage<string>("pref_my_age", "", stringPreferenceSchema);
  const [ageMin, setAgeMin] = useLocalStorage<string>("pref_age_min", "", stringPreferenceSchema);
  const [ageMax, setAgeMax] = useLocalStorage<string>("pref_age_max", "", stringPreferenceSchema);
  const [userLat, setUserLat] = useLocalStorage<number | null>("pref_lat", null, coordinateSchema);
  const [userLon, setUserLon] = useLocalStorage<number | null>("pref_lon", null, coordinateSchema);
  const [locationCity, setLocationCity] = useLocalStorage<string>(
    "pref_location_city",
    "",
    stringPreferenceSchema
  );
  const [myRadius, setMyRadius] = useLocalStorage<string>(
    "pref_my_radius",
    "any",
    stringPreferenceSchema
  );

  // Transient UI state - not persisted
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Stable peer ID - generated once, persisted forever
  const [peerId] = useState<string>(getOrCreatePeerId);

  return {
    myGender,
    setMyGender,
    targetGender,
    setTargetGender,
    myAge,
    setMyAge,
    ageMin,
    setAgeMin,
    ageMax,
    setAgeMax,
    userLat,
    setUserLat,
    userLon,
    setUserLon,
    locationCity,
    setLocationCity,
    locationLoading,
    setLocationLoading,
    locationError,
    setLocationError,
    myRadius,
    setMyRadius,
    peerId,
  };
}
