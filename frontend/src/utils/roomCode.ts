/** Unambiguous characters - excludes O/0, I/1, l to prevent confusion. */
const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 6;

/**
 * @description Generates a cryptographically random private-room code, using
 * only unambiguous characters (no O/0, I/1, l) to reduce read/type errors.
 * @returns A {@link ROOM_CODE_LENGTH}-character room code.
 */
export function generateRoomCode(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(ROOM_CODE_LENGTH)))
    .map((b) => ROOM_CODE_CHARS[b % ROOM_CODE_CHARS.length])
    .join("");
}

/**
 * @description Formats the live user counter with correct Polish plural
 * forms (1 → "osoba", 2-4 → "osoby", 5+ → "osób").
 * @param count - number of currently connected users
 * @returns A ready-to-render status string, e.g. "3 osoby aktualnie".
 */
export function getUserCountText(count: number): string {
  if (count === 1) return "1 osoba aktualnie";
  if (count > 1 && count < 5) return `${count} osoby aktualnie`;
  return `${count} osób aktualnie`;
}
