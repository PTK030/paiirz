import type { MatchmakingPreferences } from "../../hooks/usePreferences";
import type { UsePrivateRoomReturn } from "../../hooks/usePrivateRoom";

import { AdvancedFiltersCard } from "./AdvancedFiltersCard";
import { PrivateRoomCard } from "./PrivateRoomCard";
import { QuickStartCard } from "./QuickStartCard";

export interface SetupPanelProps {
  prefs: MatchmakingPreferences;
  privateRoom: UsePrivateRoomReturn;
  /** Starts matchmaking with gender filters forced to "any". */
  onQuickStart: () => void;
  /** Starts matchmaking using the current filter values. */
  onSearchWithFilters: () => void;
  /** Requests browser geolocation and reverse-geocodes it into `prefs.locationCity`. */
  onDetectLocation: () => void;
}

/**
 * @description Pre-match setup screen: quick start, private room, and
 * advanced matchmaking filters. Purely presentational - composes the three
 * setup cards, no business logic of its own.
 */
export function SetupPanel({
  prefs,
  privateRoom,
  onQuickStart,
  onSearchWithFilters,
  onDetectLocation,
}: SetupPanelProps) {
  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-5 py-4">
      <div className="text-center mb-2">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-indigo-300">
          Jak chcesz porozmawiać?
        </h2>
        <p className="text-sm text-zinc-500 mt-1">
          Wybierz tryb lub skonfiguruj filtry przed startem
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="flex flex-col gap-5">
          <QuickStartCard onQuickStart={onQuickStart} />
          <PrivateRoomCard privateRoom={privateRoom} />
        </div>

        <AdvancedFiltersCard
          prefs={prefs}
          onDetectLocation={onDetectLocation}
          onSearch={onSearchWithFilters}
        />
      </div>
    </div>
  );
}
