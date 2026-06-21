import React, { useEffect, useRef, useState } from "react";
import { BsPlayFill, BsPauseFill } from "react-icons/bs";

interface VoicePlayerProps {
  audioUrl: string;
  isMyMessage: boolean;
}

const waveHeights = [20, 44, 28, 60, 24, 70, 48, 30, 56, 36, 80, 50, 40, 64, 24, 36, 56, 30, 44, 20];

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
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
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

  const progress = duration ? currentTime / duration : 0;
  const activeBarIndex = Math.floor(progress * waveHeights.length);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="flex items-center gap-3 p-2 rounded-lg border border-zinc-800 bg-zinc-950/20 w-60 sm:w-64 select-none font-mono"
    >
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer border shrink-0 outline-none ${
          isMyMessage 
            ? "bg-zinc-100 text-zinc-950 border-zinc-200 hover:bg-white" 
            : "bg-zinc-800 text-zinc-100 border-zinc-700 hover:bg-zinc-700"
        }`}
      >
        {isPlaying ? <BsPauseFill className="text-base" /> : <BsPlayFill className="text-base ml-0.5" />}
      </button>

      {/* Waveform Seeker */}
      <div className="flex flex-col flex-1 gap-1">
        <div className="flex items-end gap-[3px] h-8">
          {waveHeights.map((height, idx) => {
            const isActive = idx <= activeBarIndex && currentTime > 0;
            return (
              <div
                key={idx}
                onClick={() => handleSeek(idx)}
                style={{ height: `${height}%` }}
                className={`w-[3px] rounded-full cursor-pointer transition-colors duration-150 ${
                  isActive
                    ? isMyMessage ? "bg-zinc-100" : "bg-zinc-300"
                    : isMyMessage ? "bg-zinc-100/20" : "bg-zinc-800"
                }`}
              />
            );
          })}
        </div>

        {/* Timers */}
        <div className="flex justify-between text-[8px] font-semibold uppercase tracking-wider text-zinc-500">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration || 0)}</span>
        </div>
      </div>
    </div>
  );
};
