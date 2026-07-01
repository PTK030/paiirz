import { MIN_USER_AGE, MAX_USER_AGE } from "../../constants";
import type { MatchmakingPreferences } from "../../hooks/usePreferences";
import { DualRangeSlider } from "../ui/DualRangeSlider";

import { LocationAutocomplete } from "./LocationAutocomplete";

export interface AdvancedFiltersCardProps {
  prefs: MatchmakingPreferences;
  /** Requests browser geolocation and reverse-geocodes it into `prefs.locationCity`. */
  onDetectLocation: () => void;
  /** Starts matchmaking using the current filter values. */
  onSearch: () => void;
}

/**
 * @description Setup-screen card for matchmaking filters: gender, age range,
 * and location (GPS or manual city + radius). Purely presentational - all
 * values and setters come from `usePreferences`.
 */
export function AdvancedFiltersCard({
  prefs,
  onDetectLocation,
  onSearch,
}: AdvancedFiltersCardProps) {
  return (
    <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-6 shadow-lg flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center shrink-0">
          <svg
            className="w-4 h-4 text-cyan-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
            />
          </svg>
        </div>
        <div>
          <h3 className="font-bold text-white text-sm">Filtry zaawansowane</h3>
          <p className="text-xs text-zinc-500">Dopasuj rozmówcę do swoich preferencji</p>
        </div>
      </div>

      {/* Privacy notice */}
      <div className="flex items-start gap-2 bg-zinc-900/50 border border-zinc-800/60 rounded-xl px-3 py-2.5">
        <svg
          className="w-3.5 h-3.5 shrink-0 mt-0.5 text-zinc-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <p className="text-[10px] text-zinc-500 leading-relaxed">
          Filtry są widoczne{" "}
          <span className="text-zinc-400 font-medium">wyłącznie dla algorytmu dopasowania</span> -
          nie są udostępniane innym użytkownikom.
        </p>
      </div>

      {/* Gender selectors */}
      <div className="flex flex-col sm:flex-row gap-4">
        {(["myGender", "targetGender"] as const).map((field) => (
          <div key={field} className="flex-1 flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              {field === "myGender" ? "Twoja płeć" : "Szukasz"}
            </label>
            <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/60">
              {(["female", "male", "any"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() =>
                    field === "myGender" ? prefs.setMyGender(g) : prefs.setTargetGender(g)
                  }
                  className={`flex-1 py-2 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                    (field === "myGender" ? prefs.myGender : prefs.targetGender) === g
                      ? field === "myGender"
                        ? "bg-indigo-500/25 text-indigo-300 border border-indigo-500/30"
                        : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      : "text-zinc-400 hover:text-zinc-200 border border-transparent"
                  }`}
                >
                  {g === "female"
                    ? field === "myGender"
                      ? "Kobieta"
                      : "Kobiet"
                    : g === "male"
                      ? field === "myGender"
                        ? "Mężczyzna"
                        : "Mężczyzn"
                      : field === "myGender"
                        ? "Inna"
                        : "Dowolna"}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Age */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Wiek</label>
        <div className="grid grid-cols-3 gap-3 items-end">
          <div className="flex flex-col gap-1 col-span-1">
            <span className="text-[10px] text-zinc-600">Twój wiek</span>
            <input
              type="number"
              min={MIN_USER_AGE}
              max={MAX_USER_AGE}
              value={prefs.myAge}
              onChange={(e) => {
                const v = e.target.value;
                // Allow intermediate states while typing (e.g. "1" before "18").
                if (!/^\d{0,2}$/.test(v)) return;
                prefs.setMyAge(v);
              }}
              onBlur={() => {
                if (!prefs.myAge) return;
                const parsed = parseInt(prefs.myAge, 10);
                if (Number.isNaN(parsed)) {
                  prefs.setMyAge("");
                  return;
                }
                const clamped = Math.min(MAX_USER_AGE, Math.max(MIN_USER_AGE, parsed));
                prefs.setMyAge(String(clamped));
              }}
              placeholder="-"
              className="w-full appearance-none bg-zinc-900/80 border border-zinc-800/80 rounded-xl px-3 py-2.5 text-white placeholder-zinc-600 outline-none focus:outline-none focus-visible:outline-none focus:border-zinc-700/90 focus:ring-2 focus:ring-white/15 focus:ring-offset-0 transition-colors duration-200 text-sm text-center [-webkit-tap-highlight-color:transparent]"
            />
          </div>

          <div className="flex flex-col gap-1 col-span-2">
            <div className="flex justify-between items-center text-[10px] text-zinc-600">
              <span>Szukaj od do</span>
              <span className="text-zinc-400 font-medium">
                {prefs.ageMin || MIN_USER_AGE} - {prefs.ageMax || MAX_USER_AGE} lat
              </span>
            </div>
            <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl px-4 py-2.5 h-[42px] flex items-center">
              <DualRangeSlider
                min={MIN_USER_AGE}
                max={MAX_USER_AGE}
                value={[
                  parseInt(prefs.ageMin as string) || MIN_USER_AGE,
                  parseInt(prefs.ageMax as string) || MAX_USER_AGE,
                ]}
                onChange={([min, max]) => {
                  prefs.setAgeMin(min.toString());
                  prefs.setAgeMax(max.toString());
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
          Lokalizacja
        </label>
        <div className="flex gap-2 items-start">
          <button
            onClick={onDetectLocation}
            disabled={prefs.locationLoading}
            className="flex items-center justify-center gap-2 px-3 h-[42px] rounded-xl bg-zinc-900/80 border border-zinc-800/80 text-xs font-semibold text-zinc-400 hover:text-white hover:border-indigo-500/40 hover:bg-indigo-500/10 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {prefs.locationLoading ? (
              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            )}
            <span className="hidden sm:inline">
              {prefs.userLat ? "Aktualizuj GPS" : "Wykryj GPS"}
            </span>
            <span className="sm:hidden">GPS</span>
          </button>
          <div className="flex-1 flex flex-col gap-1">
            <LocationAutocomplete
              value={prefs.locationCity}
              onChange={(text) => {
                prefs.setLocationCity(text);
                if (!text.trim()) {
                  prefs.setUserLat(null);
                  prefs.setUserLon(null);
                }
              }}
              onSelect={(suggestion) => {
                prefs.setLocationCity(suggestion.name);
                prefs.setUserLat(suggestion.lat);
                prefs.setUserLon(suggestion.lon);
                prefs.setLocationError(null);
              }}
              onClear={() => {
                prefs.setUserLat(null);
                prefs.setUserLon(null);
              }}
              placeholder={prefs.userLat ? "Miasto (z GPS)" : "Wpisz miasto lub użyj GPS"}
            />
            {prefs.userLat && (
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                GPS aktywny ({prefs.userLat.toFixed(3)}, {prefs.userLon?.toFixed(3)})
              </span>
            )}
            {prefs.locationError && (
              <span className="text-[10px] text-red-400">{prefs.locationError}</span>
            )}
          </div>
        </div>

        {prefs.userLat && (
          <div className="relative">
            <select
              value={prefs.myRadius}
              onChange={(e) => prefs.setMyRadius(e.target.value)}
              className="w-full appearance-none bg-zinc-900/80 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:outline-none focus-visible:outline-none focus:border-zinc-700/90 focus:ring-2 focus:ring-white/15 focus:ring-offset-0 transition-colors duration-200 cursor-pointer [-webkit-tap-highlight-color:transparent]"
            >
              <option value="any">Dowolny promień</option>
              <option value="10">do 10 km</option>
              <option value="25">do 25 km</option>
              <option value="50">do 50 km</option>
              <option value="100">do 100 km</option>
              <option value="200">do 200 km</option>
            </select>
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-zinc-500">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 mt-auto">
        <button
          onClick={onSearch}
          className="w-full bg-zinc-100 hover:bg-white text-zinc-950 font-bold py-3.5 px-6 rounded-xl transition-all cursor-pointer text-sm tracking-wide hover:scale-[1.01] active:scale-[0.98] outline-none shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2 group"
        >
          <span>Szukaj z filtrami</span>
          <svg
            className="w-4 h-4 transition-transform group-hover:translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
        <p className="mt-1 px-1 text-[10px] text-zinc-600 text-center leading-relaxed">
          Rozpoczynając rozmowę, akceptujesz{" "}
          <a
            href="/regulamin"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-500 underline underline-offset-2 hover:text-zinc-300 transition-colors"
          >
            Regulamin serwisu
          </a>
          .
        </p>
      </div>
    </div>
  );
}
