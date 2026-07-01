import { useRef, useEffect, useCallback } from "react";
import { APP_TITLE } from "../utils/brand";

const DEFAULT_TITLE = APP_TITLE;
const NOTIFICATION_TITLE = "💬 Nowa wiadomość";

/**
 * Flashes the browser tab title when a new message arrives and the tab is
 * not focused. Stops flashing as soon as the user focuses the tab.
 */
export function useTitleNotification(): {
  triggerTitleNotification: () => void;
} {
  const intervalRef = useRef<number | null>(null);

  // Clear the flashing interval and restore the original title
  const stopFlashing = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    document.title = DEFAULT_TITLE;
  }, []);

  useEffect(() => {
    const handleFocus = () => stopFlashing();
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
      stopFlashing();
    };
  }, [stopFlashing]);

  const triggerTitleNotification = useCallback(() => {
    if (document.hasFocus()) return;
    if (intervalRef.current !== null) return; // already flashing

    let isDefault = true;
    intervalRef.current = window.setInterval(() => {
      document.title = isDefault ? NOTIFICATION_TITLE : DEFAULT_TITLE;
      isDefault = !isDefault;
    }, 1000);
  }, []);

  return { triggerTitleNotification };
}
