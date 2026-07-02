import { useState, useRef, useCallback, useEffect } from "react";

export type RecordingMode = "none" | "holding" | "locked";

export interface UseRecordingReturn {
  recordingMode: RecordingMode;
  recordingTime: number;
  recordingWave: number[];
  startRecording: () => Promise<void>;
  stopRecording: (shouldSend: boolean) => void;
  setRecordingMode: (mode: RecordingMode) => void;
  /** Recorded audio as base64 data URI - set by stopRecording. */
  recordedAudio: string | null;
  /** Clear the recorded audio after it has been consumed. */
  clearRecordedAudio: () => void;
}

type AudioContextCtor = typeof AudioContext;

function getAudioContextClass(): AudioContextCtor | undefined {
  if (typeof window === "undefined") return undefined;
  return (
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
  );
}

const WAVE_BARS = 40;
/** How often `recordingTime` is incremented (ms). */
const RECORDING_TIMER_INTERVAL_MS = 1000;
/** How often the waveform buffer shifts in a new sample (ms). */
const WAVE_SAMPLE_INTERVAL_MS = 75;
/** FFT size used for volume analysis via the Web Audio API. */
const ANALYSER_FFT_SIZE = 256;
/** Average sample deviation below which audio is treated as silence (0%). */
const VOLUME_SILENCE_THRESHOLD = 1.2;
/** Average sample deviation treated as full conversational volume (100%). */
const VOLUME_SPEECH_MAX = 12.0;

/**
 * @description Manages audio recording via `MediaRecorder`, exposing live
 * waveform amplitude data (via the Web Audio API `AnalyserNode`) for
 * visualisation while recording. When `stopRecording(true)` is called, the
 * recorded blob is converted to a base64 data URI and made available via
 * `recordedAudio`.
 * @returns Recording state/waveform data and the actions to start/stop a recording.
 */
export function useRecording(): UseRecordingReturn {
  const [recordingMode, setRecordingMode] = useState<RecordingMode>("none");
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingWave, setRecordingWave] = useState<number[]>(Array(WAVE_BARS).fill(0));
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const waveIntervalRef = useRef<number | null>(null);
  const volumeRef = useRef<number>(0);

  const clearTimers = () => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (waveIntervalRef.current !== null) {
      clearInterval(waveIntervalRef.current);
      waveIntervalRef.current = null;
    }
  };

  /** @description Requests mic access and starts recording, updating the timer/waveform while active. */
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setRecordingTime(0);
      volumeRef.current = 0;
      setRecordingWave(Array(WAVE_BARS).fill(0));

      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, RECORDING_TIMER_INTERVAL_MS);

      waveIntervalRef.current = window.setInterval(() => {
        const curVol = volumeRef.current;
        setRecordingWave((prev) => [...prev.slice(1), curVol]);
      }, WAVE_SAMPLE_INTERVAL_MS);

      // Volume analysis via Web Audio API
      const AudioContextClass = getAudioContextClass();
      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        if (audioCtx.state === "suspended") {
          audioCtx.resume().catch(() => {});
        }
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = ANALYSER_FFT_SIZE;
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkVolume = () => {
          if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
            audioCtx.close().catch(() => {});
            return;
          }

          analyser.getByteTimeDomainData(dataArray);
          let sumDeviation = 0;
          for (let i = 0; i < bufferLength; i++) {
            sumDeviation += Math.abs(dataArray[i] - 128);
          }
          const averageDeviation = sumDeviation / bufferLength;

          // Non-linear scaling: silent/ambient < threshold → 0%, conversational max → 100%
          const adjusted = Math.max(0, averageDeviation - VOLUME_SILENCE_THRESHOLD);
          const volPercentage = Math.min(Math.round((adjusted / VOLUME_SPEECH_MAX) * 100), 100);

          volumeRef.current = volPercentage;
          requestAnimationFrame(checkVolume);
        };

        requestAnimationFrame(checkVolume);
      }
    } catch (err) {
      console.error("Nie udało się uzyskać dostępu do mikrofonu:", err);
      setRecordingMode("none");
      throw err; // Let the caller decide how to surface this error
    }
  }, []);

  /**
   * @description Stops the active recording. If `shouldSend` is true, the
   * recorded audio is converted to a base64 data URI and exposed via
   * `recordedAudio`; otherwise it is discarded.
   */
  const stopRecording = useCallback((shouldSend: boolean) => {
    clearTimers();

    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder || mediaRecorder.state === "inactive") return;

    if (!shouldSend) {
      mediaRecorder.stop();
      mediaRecorderRef.current = null;
      setRecordingMode("none");
      setRecordingTime(0);
      setRecordingWave(Array(WAVE_BARS).fill(0));
      return;
    }

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Audio = reader.result as string;
        setRecordedAudio(base64Audio);
      };
      reader.readAsDataURL(audioBlob);

      audioChunksRef.current = [];
      mediaRecorderRef.current = null;
      setRecordingMode("none");
      setRecordingTime(0);
      setRecordingWave(Array(WAVE_BARS).fill(0));
    };

    mediaRecorder.stop();
  }, []);

  const clearRecordedAudio = useCallback(() => {
    setRecordedAudio(null);
  }, []);

  // If this hook unmounts mid-recording (e.g. the room closes, navigation
  // away) neither `stopRecording` nor `mediaRecorder.onstop` would otherwise
  // ever run - leaving the timers ticking against an unmounted component and,
  // more importantly, leaving the microphone stream open indefinitely.
  useEffect(() => {
    return () => {
      clearTimers();
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      recorder?.stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return {
    recordingMode,
    recordingTime,
    recordingWave,
    startRecording,
    stopRecording,
    setRecordingMode,
    recordedAudio,
    clearRecordedAudio,
  };
}
