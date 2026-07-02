// ─── Icebreaker ───────────────────────────────────────────────────────────────

/** Server-authoritative state of an icebreaker mini-game attached to a message. */
export interface IcebreakerData {
  type: "this_or_that" | "truth_or_dare";
  question: string;
  options?: string[];
  votes: Record<string, string | number>;
  status: "pending" | "revealed" | "proposed" | "declined" | "quit";
  result?: string;
  voter_sid?: string;
  round?: number;
  turn_sid?: string;
  accepted_users?: string[];
  ready_for_next?: string[];
  is_custom?: boolean;
}

// ─── Message ──────────────────────────────────────────────────────────────────

/** A single chat message as rendered locally (already decrypted, if applicable). */
export interface Message {
  id: string;
  sid: string;
  message?: string;
  image?: string;
  video?: string;
  audio?: string;
  vanishing?: boolean;
  viewOnce?: boolean;
  reactions: Record<string, string>;
  isUnsent?: boolean;
  /** E2EE envelope - each encrypted field needs its own unique AES-GCM IV. */
  e2e?: MessageE2EE;
  icebreaker?: IcebreakerData;
}

export interface MessageE2EE {
  /** Legacy single-field envelope, accepted during rolling client upgrades. */
  iv?: string;
  messageIv?: string;
  imageIv?: string;
  videoIv?: string;
  audioIv?: string;
}

// ─── Session Stats ────────────────────────────────────────────────────────────

/** Raw counters tracked for the current chat session (see {@link useSessionStats}). */
export interface SessionStats {
  startTime: number | null;
  endTime: number | null;
  disconnectedBy: "me" | "stranger" | "blocked" | null;
  sentTextCount: number;
  sentImageCount: number;
  sentAudioCount: number;
  sentWordCount: number;
  receivedTextCount: number;
  receivedImageCount: number;
  receivedAudioCount: number;
}

export const INITIAL_SESSION_STATS: SessionStats = {
  startTime: null,
  endTime: null,
  disconnectedBy: null,
  sentTextCount: 0,
  sentImageCount: 0,
  sentAudioCount: 0,
  sentWordCount: 0,
  receivedTextCount: 0,
  receivedImageCount: 0,
  receivedAudioCount: 0,
};
