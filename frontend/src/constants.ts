/**
 * Centralized magic numbers/strings used across the chat page and its hooks.
 * Values that are genuinely local to a single hook (e.g. media size limits in
 * `useMediaUpload.ts`) stay exported from that hook instead of being
 * duplicated here - this file is for constants that describe the chat page's
 * own timing/UX rules.
 */

/** How long the mic button must be held before recording starts (ms). */
export const MIC_HOLD_THRESHOLD_MS = 350;

/** How long after the last keystroke the "typing" indicator turns off (ms). */
export const TYPING_INDICATOR_TIMEOUT_MS = 1500;

/** Minimum allowed user age for matchmaking filters. */
export const MIN_USER_AGE = 13;

/** Maximum allowed user age for matchmaking filters. */
export const MAX_USER_AGE = 99;

/** Browser geolocation request timeout (ms). */
export const GEOLOCATION_TIMEOUT_MS = 10_000;

/** How long a cached geolocation fix is considered fresh (ms). */
export const GEOLOCATION_MAX_AGE_MS = 300_000;

/** Length of a generated/entered private room code. */
export const PRIVATE_ROOM_CODE_LENGTH = 6;

/** Minimum characters required before a private room code can be submitted. */
export const PRIVATE_ROOM_CODE_MIN_LENGTH = 4;
