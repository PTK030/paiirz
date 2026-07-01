import { useRef, useEffect } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { playNotificationSound, type SoundType } from "../utils/sound";

export interface UseNotificationSoundReturn {
  soundsEnabled: boolean;
  setSoundsEnabled: (v: boolean) => void;
  /** Play a notification sound if sounds are enabled. */
  play: (type: SoundType) => void;
}

/**
 * Manages sound preferences and exposes a stable `play()` function.
 * Preferences are persisted to localStorage.
 */
export function useNotificationSound(): UseNotificationSoundReturn {
  const [soundsEnabled, setSoundsEnabled] = useLocalStorage<boolean>(
    "sounds_enabled",
    true
  );

  // Ref mirror so that async/closure callers always read the latest value
  // without needing to be included in dependency arrays.
  const soundsEnabledRef = useRef(soundsEnabled);
  useEffect(() => {
    soundsEnabledRef.current = soundsEnabled;
  }, [soundsEnabled]);

  const play = (type: SoundType) => {
    playNotificationSound(type, soundsEnabledRef.current);
  };

  return { soundsEnabled, setSoundsEnabled, play };
}
