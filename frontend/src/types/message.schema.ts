import { z } from "zod";

/**
 * @description Runtime schema for the E2EE icebreaker game payload embedded in messages.
 * Mirrors `IcebreakerData` in `message.ts`.
 */
export const icebreakerDataSchema = z.object({
  type: z.enum(["this_or_that", "truth_or_dare"]),
  question: z.string(),
  options: z.array(z.string()).optional(),
  votes: z.record(z.string(), z.union([z.string(), z.number()])),
  status: z.enum(["pending", "revealed", "proposed", "declined"]),
  result: z.string().optional(),
  voter_sid: z.string().optional(),
  round: z.number().optional(),
  turn_sid: z.string().optional(),
  accepted_users: z.array(z.string()).optional(),
  ready_for_next: z.array(z.string()).optional(),
});

/**
 * @description Runtime schema for a chat message received from the socket.
 * Mirrors `Message` in `message.ts`. Used to validate WIRE data before it is
 * ever rendered, decrypted, or stored - never trust the network.
 */
export const messageSchema = z.object({
  id: z.string(),
  sid: z.string(),
  message: z.string().optional(),
  image: z.string().optional(),
  video: z.string().optional(),
  audio: z.string().optional(),
  vanishing: z.boolean().optional(),
  viewOnce: z.boolean().optional(),
  reactions: z.record(z.string(), z.string()),
  isUnsent: z.boolean().optional(),
  e2e: z.object({ iv: z.string() }).optional(),
  icebreaker: icebreakerDataSchema.optional(),
});
