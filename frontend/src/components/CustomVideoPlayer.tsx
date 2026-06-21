import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  BsPlayFill, 
  BsPauseFill, 
  BsVolumeUpFill, 
  BsVolumeMuteFill, 
  BsFullscreen, 
  BsFullscreenExit 
} from "react-icons/bs";

interface CustomVideoPlayerProps {
  src: string;
  mode: "inline" | "lightbox";
  onPlayClick?: () => void;
  onEnded?: () => void;
}

export const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({ 
  src, 
  mode, 
  onPlayClick,
  onEnded 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const controlsTimeoutRef = useRef<number | null>(null);

  // Play/Pause handler
  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.error("Video play failed:", err);
      });
    }
  };

  // Mute handler
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    const nextMuted = !isMuted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
    if (!nextMuted && volume === 0) {
      video.volume = 0.5;
      setVolume(0.5);
    }
  };

  // Volume slider handler
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setVolume(value);
    
    const video = videoRef.current;
    if (video) {
      video.volume = value;
      const shouldMute = value === 0;
      video.muted = shouldMute;
      setIsMuted(shouldMute);
    }
  };

  // Seek timeline handler
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const newTime = parseFloat(e.target.value);
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Fullscreen handler
  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error("Error enabling full-screen mode:", err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  // Listen to fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Update duration, time and end handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => {
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
      }
    };
    const handleVideoEnd = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (onEnded) onEnded();
    };

    video.addEventListener("timeupdate", updateTime);
    video.addEventListener("loadedmetadata", updateDuration);
    video.addEventListener("durationchange", updateDuration);
    video.addEventListener("ended", handleVideoEnd);

    if (video.duration && !isNaN(video.duration)) {
      setDuration(video.duration);
    }

    return () => {
      video.removeEventListener("timeupdate", updateTime);
      video.removeEventListener("loadedmetadata", updateDuration);
      video.removeEventListener("durationchange", updateDuration);
      video.removeEventListener("ended", handleVideoEnd);
    };
  }, [src, onEnded]);

  // Controls auto-hide trigger (only in lightbox mode)
  const resetControlsTimeout = useCallback(() => {
    if (mode === "inline") return;
    
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }

    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 2500);
  }, [mode, isPlaying]);

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        window.clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, resetControlsTimeout]);

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  if (mode === "inline") {
    return (
      <div 
        onClick={onPlayClick}
        className="relative max-w-full max-h-72 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-850 flex items-center justify-center cursor-pointer group"
      >
        <video 
          ref={videoRef}
          src={src}
          className="max-w-full max-h-72 object-contain hover:scale-[1.01] transition-transform duration-200 select-none"
          muted
          playsInline
        />
        {/* Play overlay button */}
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex items-center justify-center">
          <div className="w-12 h-12 rounded-lg bg-zinc-900/90 border border-zinc-800 flex items-center justify-center text-zinc-100 text-xl shadow-md transform group-hover:scale-105 group-active:scale-95 transition-transform duration-150">
            <BsPlayFill className="ml-0.5" />
          </div>
        </div>
      </div>
    );
  }

  // Lightbox Mode
  return (
    <div 
      ref={containerRef}
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onClick={togglePlay}
      className={`relative flex items-center justify-center bg-zinc-950/20 overflow-hidden select-none transition-all duration-150 ${
        isFullscreen ? "w-screen h-screen" : "max-w-[95vw] max-h-[80vh] rounded-lg border border-zinc-800 shadow-2xl"
      }`}
    >
      <video
        ref={videoRef}
        src={src}
        autoPlay
        playsInline
        className={`${isFullscreen ? "w-screen h-screen" : "max-w-full max-h-[72vh]"} object-contain`}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Custom Controls Bar */}
      <div 
        onClick={(e) => e.stopPropagation()} // Stop togglePlay click
        className={`absolute bottom-0 left-0 right-0 p-4 bg-zinc-900/95 border-t border-zinc-800/80 flex flex-col gap-3 transition-opacity duration-150 z-20 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Timeline Slider */}
        <div className="flex items-center gap-3 w-full group/timeline">
          <span className="text-[10px] font-semibold text-zinc-400 font-mono select-none">
            {formatTime(currentTime)}
          </span>
          
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer bg-zinc-800 accent-zinc-100 hover:accent-white transition-all focus:outline-none"
            style={{
              background: `linear-gradient(to right, #f4f4f5 0%, #f4f4f5 ${duration ? (currentTime / duration) * 100 : 0}%, rgba(24, 24, 27, 0.5) ${duration ? (currentTime / duration) * 100 : 0}%, rgba(24, 24, 27, 0.5) 100%)`
            }}
          />

          <span className="text-[10px] font-semibold text-zinc-400 font-mono select-none">
            {formatTime(duration)}
          </span>
        </div>

        {/* Buttons Controls */}
        <div className="flex items-center justify-between w-full font-mono">
          <div className="flex items-center gap-4">
            {/* Play/Pause Button */}
            <button
              onClick={togglePlay}
              className="text-zinc-350 hover:text-zinc-100 transition-colors p-1.5 rounded-lg hover:bg-zinc-800/60 active:scale-95 cursor-pointer text-lg shrink-0 outline-none"
              title={isPlaying ? "Pauza" : "Odtwórz"}
            >
              {isPlaying ? <BsPauseFill /> : <BsPlayFill />}
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-1.5 group/volume">
              <button
                onClick={toggleMute}
                className="text-zinc-350 hover:text-zinc-100 transition-colors p-1.5 rounded-lg hover:bg-zinc-800/60 active:scale-95 cursor-pointer text-base shrink-0 outline-none"
                title={isMuted ? "Wyłącz wyciszenie" : "Wycisz"}
              >
                {isMuted || volume === 0 ? <BsVolumeMuteFill /> : <BsVolumeUpFill />}
              </button>
              
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 sm:w-20 h-1 rounded-lg appearance-none cursor-pointer bg-zinc-800 accent-zinc-100 group-hover/volume:bg-zinc-700 transition-all focus:outline-none"
                style={{
                  background: `linear-gradient(to right, #f4f4f5 0%, #f4f4f5 ${isMuted ? 0 : volume * 100}%, rgba(24, 24, 27, 0.5) ${isMuted ? 0 : volume * 100}%, rgba(24, 24, 27, 0.5) 100%)`
                }}
              />
            </div>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="text-zinc-350 hover:text-zinc-100 transition-colors p-1.5 rounded-lg hover:bg-zinc-800/60 active:scale-95 cursor-pointer text-base shrink-0 outline-none"
            title={isFullscreen ? "Wyjdź z pełnego ekranu" : "Pełny ekran"}
          >
            {isFullscreen ? <BsFullscreenExit /> : <BsFullscreen />}
          </button>
        </div>
      </div>
    </div>
  );
};
