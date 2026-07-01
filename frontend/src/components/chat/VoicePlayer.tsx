import type React from "react";
import { useEffect, useRef, useState } from "react";
import { BsPlayFill, BsPauseFill } from "react-icons/bs";

interface VoicePlayerProps {
  audioUrl: string;
  isMyMessage: boolean;
}

/** Relative bar heights forming the static waveform visual (px, before scaling). */
const waveHeights = [
  20, 44, 28, 60, 24, 70, 48, 30, 56, 36, 80, 50, 40, 64, 24, 36, 56, 30, 44, 20,
];

/**
 * @description Renders a voice message as a play/pause button with a
 * clickable waveform seeker and elapsed/total time. Wraps a plain
 * `<audio>` element and drives its own play state from the element's events.
 */
export const VoicePlayer: React.FC<VoicePlayerProps> = ({ audioUrl, isMyMessage }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("durationchange", updateDuration);
    audio.addEventListener("ended", handleEnded);

    if (audio.duration && !isNaN(audio.duration)) {
      setDuration(audio.duration);
    }

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("durationchange", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.error("Playback failed:", err);
        });
    }
  };

  const handleSeek = (index: number) => {
    const audio = audioRef.current;
    if (!audio || duration === 0) return;
    const clickRatio = index / waveHeights.length;
    audio.currentTime = clickRatio * duration;
    setCurrentTime(audio.currentTime);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const playedRatio = duration > 0 ? currentTime / duration : 0;
  const playedBars = Math.round(playedRatio * waveHeights.length);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="flex items-center gap-3 p-3 min-w-[220px] sm:min-w-[260px]"
    >
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors outline-none cursor-pointer ${
          isMyMessage
            ? "bg-indigo-500 text-white hover:bg-indigo-400"
            : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
        }`}
        title={isPlaying ? "Pauza" : "Odtwórz"}
      >
        {isPlaying ? <BsPauseFill size={16} /> : <BsPlayFill size={16} className="ml-0.5" />}
      </button>

      {/* Waveform Seeker */}
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="flex items-end gap-[3px] h-8 cursor-pointer">
          {waveHeights.map((height, idx) => {
            const played = idx < playedBars;
            return (
              <div
                // eslint-disable-next-line react/no-array-index-key -- fixed-length static array, index is a stable bar identity
                key={idx}
                onClick={() => handleSeek(idx)}
                style={{ height: `${Math.round((height / 80) * 100)}%` }}
                className={`flex-1 rounded-full transition-colors ${
                  played
                    ? isMyMessage
                      ? "bg-indigo-100"
                      : "bg-zinc-200"
                    : isMyMessage
                      ? "bg-indigo-300/30"
                      : "bg-zinc-600/60"
                }`}
              />
            );
          })}
        </div>

        {/* Timers */}
        <div
          className={`flex justify-between text-[10px] font-mono select-none ${
            isMyMessage ? "text-indigo-100/70" : "text-zinc-500"
          }`}
        >
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration || 0)}</span>
        </div>
      </div>
    </div>
  );
};
