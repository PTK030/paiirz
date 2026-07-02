/**
 * Lightweight application sound design built on the Web Audio API.
 *
 * A single AudioContext is reused for the lifetime of the page. This avoids
 * leaking browser audio resources and makes short, overlapping UI cues cheap.
 */

export type SoundType =
  | "send"
  | "receive"
  | "match"
  | "leave"
  | "invite"
  | "game_start"
  | "block"
  | "menu_open"
  | "media_selected"
  | "recording_start"
  | "recording_send"
  | "recording_cancel"
  | "call_connected"
  | "call_end"
  | "mic_mute"
  | "mic_unmute"
  | "camera_off"
  | "camera_on"
  | "vanish_on"
  | "vanish_off";

export type LoopSoundType = "incoming_ring" | "outgoing_ring";

type AudioContextCtor = typeof AudioContext;
type OscillatorKind = OscillatorType;

interface Note {
  frequency: number;
  duration: number;
  delay?: number;
  volume?: number;
  wave?: OscillatorKind;
  endFrequency?: number;
}

let sharedContext: AudioContext | null = null;
const activeLoops = new Map<LoopSoundType, number>();

function getAudioContextClass(): AudioContextCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const globalAudio = globalThis as typeof globalThis & {
    webkitAudioContext?: AudioContextCtor;
  };
  return globalAudio.AudioContext ?? globalAudio.webkitAudioContext;
}

function getAudioContext(): AudioContext | null {
  if (sharedContext && sharedContext.state !== "closed") return sharedContext;
  const AudioContextClass = getAudioContextClass();
  if (!AudioContextClass) return null;
  sharedContext = new AudioContextClass();
  return sharedContext;
}

function scheduleNote(ctx: AudioContext, note: Note): void {
  const start = ctx.currentTime + (note.delay ?? 0);
  const end = start + note.duration;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = note.wave ?? "sine";
  oscillator.frequency.setValueAtTime(note.frequency, start);
  if (note.endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(note.endFrequency, end);
  }
  gain.gain.setValueAtTime(note.volume ?? 0.075, start);
  gain.gain.exponentialRampToValueAtTime(0.001, end);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(end);
}

const soundPatterns: Record<SoundType, Note[]> = {
  send: [{ frequency: 800, endFrequency: 600, duration: 0.08, volume: 0.06 }],
  receive: [
    { frequency: 523.25, duration: 0.12, volume: 0.09 },
    { frequency: 659.25, duration: 0.2, delay: 0.09, volume: 0.09 },
  ],
  match: [261.63, 329.63, 392, 523.25].map((frequency, index) => ({
    frequency,
    duration: 0.3,
    delay: index * 0.08,
    volume: 0.065,
    wave: "triangle" as const,
  })),
  leave: [
    { frequency: 196, duration: 0.35, volume: 0.045, wave: "sawtooth" },
    { frequency: 155.56, duration: 0.35, delay: 0.12, volume: 0.045, wave: "sawtooth" },
  ],
  invite: [
    { frequency: 880, duration: 0.1, volume: 0.08 },
    { frequency: 1318.51, duration: 0.2, delay: 0.08, volume: 0.08 },
  ],
  game_start: [523.25, 783.99, 1046.5].map((frequency, index) => ({
    frequency,
    duration: 0.16,
    delay: index * 0.06,
    volume: 0.035,
    wave: "square" as const,
  })),
  block: [{ frequency: 110, duration: 0.4, volume: 0.09, wave: "sawtooth" }],
  menu_open: [{ frequency: 620, endFrequency: 760, duration: 0.055, volume: 0.025 }],
  media_selected: [
    { frequency: 440, duration: 0.08, volume: 0.045 },
    { frequency: 660, duration: 0.12, delay: 0.06, volume: 0.045 },
  ],
  recording_start: [{ frequency: 880, duration: 0.1, volume: 0.055 }],
  recording_send: [
    { frequency: 520, duration: 0.08, volume: 0.045 },
    { frequency: 780, duration: 0.12, delay: 0.06, volume: 0.045 },
  ],
  recording_cancel: [{ frequency: 240, endFrequency: 150, duration: 0.16, volume: 0.045 }],
  call_connected: [
    { frequency: 440, duration: 0.1, volume: 0.06 },
    { frequency: 660, duration: 0.18, delay: 0.08, volume: 0.06 },
  ],
  call_end: [
    { frequency: 420, duration: 0.1, volume: 0.055 },
    { frequency: 260, duration: 0.18, delay: 0.09, volume: 0.055 },
  ],
  mic_mute: [{ frequency: 300, endFrequency: 190, duration: 0.12, volume: 0.045 }],
  mic_unmute: [{ frequency: 360, endFrequency: 560, duration: 0.12, volume: 0.045 }],
  camera_off: [{ frequency: 460, endFrequency: 250, duration: 0.14, volume: 0.045 }],
  camera_on: [{ frequency: 330, endFrequency: 660, duration: 0.14, volume: 0.045 }],
  vanish_on: [
    { frequency: 520, duration: 0.09, volume: 0.04 },
    { frequency: 780, duration: 0.15, delay: 0.07, volume: 0.04 },
  ],
  vanish_off: [{ frequency: 520, endFrequency: 280, duration: 0.16, volume: 0.04 }],
};

const loopPatterns: Record<LoopSoundType, { notes: Note[]; interval: number }> = {
  incoming_ring: {
    notes: [
      { frequency: 659.25, duration: 0.22, volume: 0.075 },
      { frequency: 783.99, duration: 0.22, delay: 0.28, volume: 0.075 },
    ],
    interval: 1800,
  },
  outgoing_ring: {
    notes: [
      { frequency: 440, duration: 0.15, volume: 0.055 },
      { frequency: 523.25, duration: 0.25, delay: 0.18, volume: 0.055 },
    ],
    interval: 2200,
  },
};

function playNotes(notes: Note[]): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    notes.forEach((note) => scheduleNote(ctx, note));
  } catch (error) {
    console.error("Failed to play sound:", error);
  }
}

/** Unlocks/resumes browser audio from a user gesture without producing sound. */
export function unlockSoundEngine(): void {
  try {
    const ctx = getAudioContext();
    if (ctx?.state === "suspended") void ctx.resume().catch(() => {});
  } catch {
    // Audio is progressive enhancement; unsupported/blocked audio stays silent.
  }
}

export function playNotificationSound(type: SoundType, soundsEnabled: boolean): void {
  if (!soundsEnabled) return;
  playNotes(soundPatterns[type]);
}

export function startNotificationLoop(type: LoopSoundType, soundsEnabled: boolean): void {
  stopNotificationLoop(type);
  if (!soundsEnabled) return;

  const pattern = loopPatterns[type];
  playNotes(pattern.notes);
  activeLoops.set(
    type,
    window.setInterval(() => playNotes(pattern.notes), pattern.interval)
  );
}

export function stopNotificationLoop(type?: LoopSoundType): void {
  if (type) {
    const timer = activeLoops.get(type);
    if (timer !== undefined) window.clearInterval(timer);
    activeLoops.delete(type);
    return;
  }
  activeLoops.forEach((timer) => window.clearInterval(timer));
  activeLoops.clear();
}

/** Stops loops and releases browser audio resources, useful on app teardown. */
export function disposeSoundEngine(): void {
  stopNotificationLoop();
  const context = sharedContext;
  sharedContext = null;
  if (context && context.state !== "closed") void context.close().catch(() => {});
}
