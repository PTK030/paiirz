import { useRef, useEffect, useCallback } from "react";

import {
  playNotificationSound,
  startNotificationLoop,
  stopNotificationLoop,
  unlockSoundEngine,
  type LoopSoundType,
  type SoundType,
} from "../../utils/sound";
import { useLocalStorage } from "../utils/useLocalStorage";

export interface UseNotificationSoundReturn {
  soundsEnabled: boolean;
  setSoundsEnabled: (v: boolean) => void;
  /** Play a notification sound if sounds are enabled. */
  play: (type: SoundType) => void;
  startLoop: (type: LoopSoundType) => void;
  stopLoop: (type?: LoopSoundType) => void;
}

/**
 * @description Manages the "sounds enabled" preference (persisted to
 * localStorage) and exposes a stable `play()` function that no-ops when
 * sounds are disabled.
 * @returns The current preference, its setter, and the `play` action.
 */
export function useNotificationSound(): UseNotificationSoundReturn {
  const [soundsEnabled, setSoundsEnabled] = useLocalStorage<boolean>("sounds_enabled", true);

  // Ref mirror so that async/closure callers always read the latest value
  // without needing to be included in dependency arrays.
  const soundsEnabledRef = useRef(soundsEnabled);
  useEffect(() => {
    soundsEnabledRef.current = soundsEnabled;
  }, [soundsEnabled]);

  const play = useCallback((type: SoundType) => {
    playNotificationSound(type, soundsEnabledRef.current);
  }, []);

  const startLoop = useCallback((type: LoopSoundType) => {
    startNotificationLoop(type, soundsEnabledRef.current);
  }, []);

  const stopLoop = useCallback((type?: LoopSoundType) => {
    stopNotificationLoop(type);
  }, []);

  useEffect(() => {
    if (!soundsEnabled) stopNotificationLoop();
  }, [soundsEnabled]);

  useEffect(() => {
    const unlock = () => {
      unlockSoundEngine();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => () => stopNotificationLoop(), []);

  return { soundsEnabled, setSoundsEnabled, play, startLoop, stopLoop };
}
