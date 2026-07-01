/** Unambiguous characters - excludes O/0, I/1, l to prevent confusion. */
const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 6;

/**
 * Generate a cryptographically random room code.
 * Uses only unambiguous characters (no O/0, I/1, l).
 */
export function generateRoomCode(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(ROOM_CODE_LENGTH)))
    .map((b) => ROOM_CODE_CHARS[b % ROOM_CODE_CHARS.length])
    .join("");
}

/**
 * Pluralised Polish user count string.
 * 1 → "1 osoba aktualnie"
 * 2-4 → "N osoby aktualnie"
 * 5+ → "N osób aktualnie"
 */
export function getUserCountText(count: number): string {
  if (count === 1) return "1 osoba aktualnie";
  if (count > 1 && count < 5) return `${count} osoby aktualnie`;
  return `${count} osób aktualnie`;
}
