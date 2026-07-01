import type { z } from "zod";

/**
 * @description Wraps a socket.io event handler with runtime Zod validation.
 * Data arriving over the network (from the other peer, or a malicious actor
 * spoofing socket.io traffic) is `unknown` until proven otherwise - this
 * wrapper rejects and logs any payload that doesn't match the expected shape
 * instead of letting it flow into application state.
 *
 * @param schema  - Zod schema describing the expected payload shape
 * @param handler - business logic to run once the payload is validated
 * @returns a socket.io-compatible listener accepting `unknown` data
 *
 * @example
 * socket.on("room_joined", withValidation(roomJoinedSchema, onRoomJoined));
 */
export function withValidation<T extends z.ZodTypeAny>(
  schema: T,
  handler: (data: z.infer<T>) => void
): (data: unknown) => void {
  return (data: unknown) => {
    const result = schema.safeParse(data);
    if (!result.success) {
      console.warn("[socket] Rejected malformed payload:", result.error.flatten());
      return;
    }
    handler(result.data);
  };
}
