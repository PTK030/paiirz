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
  const [, setShowControls] = useState(true);
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
        
      >
        <video 
          ref={videoRef}
          src={src}
          
          muted
          playsInline
        />
        {/* Play overlay button */}
        <div >
          <div >
            <BsPlayFill  />
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
      
    >
      <video
        ref={videoRef}
        src={src}
        autoPlay
        playsInline
        
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Custom Controls Bar */}
      <div 
        onClick={(e) => e.stopPropagation()} // Stop togglePlay click
        
      >
        {/* Timeline Slider */}
        <div >
          <span >
            {formatTime(currentTime)}
          </span>
          
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            
            
          />

          <span >
            {formatTime(duration)}
          </span>
        </div>

        {/* Buttons Controls */}
        <div >
          <div >
            {/* Play/Pause Button */}
            <button
              onClick={togglePlay}
              
              title={isPlaying ? "Pauza" : "Odtwórz"}
            >
              {isPlaying ? <BsPauseFill /> : <BsPlayFill />}
            </button>

            {/* Volume Control */}
            <div >
              <button
                onClick={toggleMute}
                
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
                
                
              />
            </div>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            
            title={isFullscreen ? "Wyjdź z pełnego ekranu" : "Pełny ekran"}
          >
            {isFullscreen ? <BsFullscreenExit /> : <BsFullscreen />}
          </button>
        </div>
      </div>
    </div>
  );
};
