import React, { useState, useRef, useEffect } from 'react';
import { MediaFile } from '../types/Post';
import './VideoPlayer.css';

interface VideoPlayerProps {
  mediaFile: MediaFile;
  onRemove?: () => void;
  onEdit?: (editedFile: MediaFile) => void;
  editable?: boolean;
  autoplay?: boolean;
  controls?: boolean;
  size?: 'small' | 'medium' | 'large';
  showControls?: boolean;
  showInfo?: boolean;
  poster?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  mediaFile,
  onRemove,
  onEdit,
  editable = false,
  autoplay = false,
  controls = true,
  size = 'medium',
  showControls = true,
  showInfo = true,
  poster
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showCustomControls, setShowCustomControls] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedData = () => {
      setIsLoading(false);
      setDuration(video.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = () => {
      setIsLoading(false);
      setVideoError(true);
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('error', handleError);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const time = parseFloat(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const vol = parseFloat(e.target.value);
    video.volume = vol;
    setVolume(vol);
    setIsMuted(vol === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getSizeClass = () => {
    switch (size) {
      case 'small': return 'video-player-small';
      case 'large': return 'video-player-large';
      default: return 'video-player-medium';
    }
  };

  const handleVideoLoad = () => {
    setIsLoading(false);
    setVideoError(false);
  };

  const handleVideoError = () => {
    setIsLoading(false);
    setVideoError(true);
  };

  if (videoError) {
    return (
      <div className={`video-player error ${getSizeClass()}`}>
        <div className="error-content">
          <div className="error-icon">🎥</div>
          <div className="error-text">
            <div className="error-title">Video failed to load</div>
            <div className="error-details">{mediaFile.name}</div>
          </div>
          {onRemove && (
            <button
              className="remove-button"
              onClick={onRemove}
              aria-label="Remove video"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`video-player ${getSizeClass()} ${isPlaying ? 'playing' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Video Element */}
      <div className="video-container">
        <video
          ref={videoRef}
          src={mediaFile.url}
          poster={poster}
          className="video-element"
          onLoadStart={() => setIsLoading(true)}
          onLoadedData={handleVideoLoad}
          onError={handleVideoError}
          preload="metadata"
          playsInline
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="video-loading-overlay">
            <div className="loading-spinner"></div>
            <span>Loading video...</span>
          </div>
        )}

        {/* Play Button Overlay */}
        {!isPlaying && !isLoading && (
          <div className="video-play-overlay">
            <button
              className="play-button"
              onClick={togglePlay}
              aria-label="Play video"
            >
              ▶
            </button>
          </div>
        )}

        {/* Video Overlay (for controls) */}
        {showControls && isHovered && !isLoading && (
          <div className="video-overlay">
            <div className="overlay-controls">
              {editable && onEdit && (
                <button
                  className="edit-button"
                  onClick={() => onEdit(mediaFile)}
                  aria-label="Edit video"
                  title="Edit video"
                >
                  ✏️
                </button>
              )}

              {onRemove && (
                <button
                  className="remove-button"
                  onClick={onRemove}
                  aria-label="Remove video"
                  title="Remove video"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>
        )}

        {/* Custom Controls (if controls are disabled) */}
        {!controls && showCustomControls && (
          <div className="custom-controls">
            <button
              className="control-button play-pause"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? '⏸️' : '▶️'}
            </button>

            <div className="progress-container">
              <input
                type="range"
                min="0"
                max={duration}
                value={currentTime}
                onChange={handleSeek}
                className="progress-bar"
                aria-label="Seek video"
              />
              <div className="time-display">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            <button
              className="control-button mute"
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
          </div>
        )}
      </div>

      {/* Video Info */}
      {showInfo && (
        <div className="video-info">
          <div className="file-name" title={mediaFile.name}>
            {mediaFile.name.length > 20
              ? `${mediaFile.name.substring(0, 20)}...`
              : mediaFile.name}
          </div>

          <div className="file-details">
            <span className="file-size">
              {(mediaFile.size / (1024 * 1024)).toFixed(1)}MB
            </span>
            <span className="video-type">Video</span>
            {duration > 0 && (
              <span className="video-duration">
                {formatTime(duration)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
