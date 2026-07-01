import { describe, it, expect } from "vitest";
import { generateRoomCode, getUserCountText } from "../../utils/roomCode";

describe("generateRoomCode", () => {
  it("generates a 6-character string", () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(6);
  });

  it("uses only uppercase alphanumeric characters (no ambiguous chars)", () => {
    // Run multiple times to increase confidence
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode();
      expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    }
  });

  it("generates unique codes", () => {
    const codes = new Set(Array.from({ length: 100 }, generateRoomCode));
    // Extremely unlikely to have collisions in 100 codes
    expect(codes.size).toBeGreaterThan(90);
  });
});

describe("getUserCountText", () => {
  it("returns singular for 1 user", () => {
    expect(getUserCountText(1)).toBe("1 osoba aktualnie");
  });

  it("returns 'osoby' for 2-4 users", () => {
    expect(getUserCountText(2)).toBe("2 osoby aktualnie");
    expect(getUserCountText(3)).toBe("3 osoby aktualnie");
    expect(getUserCountText(4)).toBe("4 osoby aktualnie");
  });

  it("returns 'osób' for 5+ users", () => {
    expect(getUserCountText(5)).toBe("5 osób aktualnie");
    expect(getUserCountText(10)).toBe("10 osób aktualnie");
    expect(getUserCountText(100)).toBe("100 osób aktualnie");
  });

  it("handles 0 users", () => {
    expect(getUserCountText(0)).toBe("0 osób aktualnie");
  });
});
