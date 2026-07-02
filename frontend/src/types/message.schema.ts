import { z } from "zod";

// Python's `None` is encoded as JSON `null`. Accept it at the wire boundary
// and normalise it to the `undefined` representation used by the UI.
const optionalString = z
  .string()
  .nullish()
  .transform((value) => value ?? undefined);
const optionalBoolean = z
  .boolean()
  .nullish()
  .transform((value) => value ?? undefined);

/**
 * @description Runtime schema for the E2EE icebreaker game payload embedded in messages.
 * Mirrors `IcebreakerData` in `message.ts`.
 */
export const icebreakerDataSchema = z.object({
  type: z.enum(["this_or_that", "truth_or_dare"]),
  question: z.string(),
  options: z
    .array(z.string())
    .nullish()
    .transform((value) => value ?? undefined),
  votes: z.record(z.string(), z.union([z.string(), z.number()])),
  status: z.enum(["pending", "revealed", "proposed", "declined", "quit"]),
  result: optionalString,
  voter_sid: optionalString,
  round: z
    .number()
    .nullish()
    .transform((value) => value ?? undefined),
  turn_sid: optionalString,
  accepted_users: z
    .array(z.string())
    .nullish()
    .transform((value) => value ?? undefined),
  ready_for_next: z
    .array(z.string())
    .nullish()
    .transform((value) => value ?? undefined),
  is_custom: optionalBoolean,
});

const messageE2EESchema = z
  .object({
    // `iv` keeps compatibility with messages from the previous protocol.
    iv: optionalString,
    messageIv: optionalString,
    imageIv: optionalString,
    videoIv: optionalString,
    audioIv: optionalString,
  })
  .refine(
    (value) =>
      Boolean(value.iv || value.messageIv || value.imageIv || value.videoIv || value.audioIv),
    "At least one E2EE IV is required"
  );

/**
 * @description Runtime schema for a chat message received from the socket.
 * Mirrors `Message` in `message.ts`. Used to validate WIRE data before it is
 * ever rendered, decrypted, or stored - never trust the network.
 */
export const messageSchema = z.object({
  id: z.string(),
  sid: z.string(),
  message: optionalString,
  image: optionalString,
  video: optionalString,
  audio: optionalString,
  vanishing: optionalBoolean,
  viewOnce: optionalBoolean,
  reactions: z.record(z.string(), z.string()),
  isUnsent: optionalBoolean,
  e2e: messageE2EESchema.nullish().transform((value) => value ?? undefined),
  icebreaker: icebreakerDataSchema.nullish().transform((value) => value ?? undefined),
});
