import type React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  BsPlayFill,
  BsPauseFill,
  BsVolumeUpFill,
  BsVolumeMuteFill,
  BsFullscreen,
  BsFullscreenExit,
} from "react-icons/bs";

interface CustomVideoPlayerProps {
  src: string;
  /** `"inline"` renders a muted autoplay-off thumbnail with a play overlay (chat bubble); `"lightbox"` renders full playback controls. */
  mode: "inline" | "lightbox";
  /** Called when the inline thumbnail is clicked (used to open the lightbox). */
  onPlayClick?: () => void;
  /** Called when playback reaches the end. */
  onEnded?: () => void;
}

/**
 * @description Custom-controlled video player used for both the inline chat
 * bubble thumbnail and the full-screen lightbox playback. Owns play/pause,
 * volume, seek, and fullscreen state directly against the underlying
 * `<video>` element rather than relying on native browser controls.
 */
export const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({
  src,
  mode,
  onPlayClick,
  onEnded,
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
      video
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
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
    // Un-muting from a volume slider dragged all the way to 0 would otherwise
    // "unmute" into silence with no visible way to raise the volume back up
    // (the slider itself is already at 0) - snapping to a mid-level default
    // guarantees the un-mute action is actually audible.
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
      container
        .requestFullscreen()
        .then(() => {
          setIsFullscreen(true);
        })
        .catch((err) => {
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

  // Controls auto-hide trigger (only in lightbox mode). It's a no-op in
  // "inline" mode because the inline thumbnail never renders the controls
  // bar at all (see the early `mode === "inline"` return below) - calling it
  // there would just be dead work, so the guard short-circuits instead.
  const resetControlsTimeout = useCallback(() => {
    if (mode === "inline") return;

    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }

    // 2.5s balances "long enough to read the timeline" against "short enough
    // that controls don't permanently obscure the video"; only auto-hides
    // while playing - a paused video keeps controls visible indefinitely
    // since the user is presumably mid-interaction (scrubbing, deciding).
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
        className="relative max-w-full max-h-72 rounded-[1.2rem] overflow-hidden bg-zinc-950 border border-zinc-800/80 flex items-center justify-center cursor-pointer group"
      >
        <video
          ref={videoRef}
          src={src}
          className="max-w-full max-h-72 object-contain group-hover:scale-[1.01] transition-transform duration-200 select-none"
          muted
          playsInline
        />
        {/* Play overlay button */}
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-zinc-900/90 border border-zinc-800/80 flex items-center justify-center text-white text-xl shadow-lg transform group-hover:scale-105 group-active:scale-95 transition-transform duration-150">
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
      className={`relative flex items-center justify-center bg-zinc-950/40 overflow-hidden select-none transition-all duration-150 ${
        isFullscreen
          ? "w-screen h-screen"
          : "max-w-[95vw] max-h-[80vh] rounded-2xl border border-zinc-800/80 shadow-2xl"
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
        className={`absolute bottom-0 left-0 right-0 p-4 bg-zinc-900/90 backdrop-blur-xl border-t border-zinc-800/80 flex flex-col gap-3 transition-opacity duration-150 z-20 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Timeline Slider */}
        <div className="flex items-center gap-3 w-full">
          <span className="text-[10px] font-mono font-semibold text-zinc-400 select-none">
            {formatTime(currentTime)}
          </span>

          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer bg-zinc-800 accent-indigo-500 transition-all focus:outline-none"
            style={{
              background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${duration ? (currentTime / duration) * 100 : 0}%, rgba(63, 63, 70, 0.6) ${duration ? (currentTime / duration) * 100 : 0}%, rgba(63, 63, 70, 0.6) 100%)`,
            }}
          />

          <span className="text-[10px] font-mono font-semibold text-zinc-400 select-none">
            {formatTime(duration)}
          </span>
        </div>

        {/* Buttons Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Play/Pause Button */}
            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-indigo-500 text-white hover:bg-indigo-400 transition-colors outline-none cursor-pointer"
              title={isPlaying ? "Pauza" : "Odtwórz"}
            >
              {isPlaying ? <BsPauseFill /> : <BsPlayFill className="ml-0.5" />}
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors outline-none cursor-pointer"
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
                className="w-16 h-1 rounded-full appearance-none cursor-pointer bg-zinc-800 accent-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors outline-none cursor-pointer"
            title={isFullscreen ? "Wyjdź z pełnego ekranu" : "Pełny ekran"}
          >
            {isFullscreen ? <BsFullscreenExit /> : <BsFullscreen />}
          </button>
        </div>
      </div>
    </div>
  );
};
