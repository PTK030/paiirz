import React, { useEffect, useRef, useState } from "react";
import { BsPlayFill, BsPauseFill } from "react-icons/bs";

interface VoicePlayerProps {
  audioUrl: string;
  isMyMessage: boolean;
}

const waveHeights = [20, 44, 28, 60, 24, 70, 48, 30, 56, 36, 80, 50, 40, 64, 24, 36, 56, 30, 44, 20];

export const VoicePlayer: React.FC<VoicePlayerProps> = ({ audioUrl }) => {
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

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      
    >
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        
      >
        {isPlaying ? <BsPauseFill  /> : <BsPlayFill  />}
      </button>

      {/* Waveform Seeker */}
      <div >
        <div >
          {waveHeights.map((_, idx) => {
            return (
              <div
                key={idx}
                onClick={() => handleSeek(idx)}
              />
            );
          })}
        </div>

        {/* Timers */}
        <div >
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration || 0)}</span>
        </div>
      </div>
    </div>
  );
};
