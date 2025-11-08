import React, { useEffect, useRef, useState } from 'react';
import { PlaybackAction } from '../types/Worship';
import './WorshipPlayer.css';

// YouTube IFrame API types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface WorshipPlayerProps {
  videoId: string | null;
  syncState: {
    action: PlaybackAction;
    videoId: string;
    videoTitle?: string;
    seekPosition?: number;
    scheduledPlayTime?: number;
    timestamp: number;
  } | null;
  onPlaybackControl?: (action: PlaybackAction, seekPosition?: number) => void;
  canControl: boolean;
}

const WorshipPlayer: React.FC<WorshipPlayerProps> = ({
  videoId,
  syncState,
  onPlaybackControl,
  canControl,
}) => {
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize YouTube IFrame API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = initializePlayer;
    } else {
      initializePlayer();
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  const initializePlayer = () => {
    if (!playerContainerRef.current) return;

    playerRef.current = new window.YT.Player(playerContainerRef.current, {
      height: '100%',
      width: '100%',
      videoId: videoId || '',
      playerVars: {
        autoplay: 0,
        controls: 0, // Hide default controls, we'll use custom
        disablekb: 1,
        fs: 1,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
      },
      events: {
        onReady: handlePlayerReady,
        onStateChange: handlePlayerStateChange,
      },
    });
  };

  const handlePlayerReady = (event: any) => {
    setIsReady(true);
    event.target.setVolume(volume);

    // Update duration
    const dur = event.target.getDuration();
    setDuration(dur);

    // Start time update interval
    const interval = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        const time = playerRef.current.getCurrentTime();
        setCurrentTime(time);
      }
    }, 1000);

    return () => clearInterval(interval);
  };

  const handlePlayerStateChange = (event: any) => {
    const playerState = event.data;
    // YT.PlayerState.PLAYING = 1, PAUSED = 2, ENDED = 0
    setIsPlaying(playerState === window.YT.PlayerState.PLAYING);

    if (playerState === window.YT.PlayerState.ENDED) {
      setIsPlaying(false);
    }
  };

  // Handle video changes
  useEffect(() => {
    if (isReady && playerRef.current && videoId) {
      playerRef.current.loadVideoById(videoId);
    }
  }, [videoId, isReady]);

  // Handle sync state changes
  useEffect(() => {
    if (!syncState || !isReady || !playerRef.current) return;

    // Clear any pending sync
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }

    const executeSync = () => {
      switch (syncState.action) {
        case PlaybackAction.PLAY:
          if (syncState.videoId && syncState.videoId !== videoId) {
            playerRef.current.loadVideoById(syncState.videoId);
          }
          if (syncState.seekPosition !== undefined) {
            playerRef.current.seekTo(syncState.seekPosition, true);
          }
          playerRef.current.playVideo();
          break;

        case PlaybackAction.PAUSE:
          playerRef.current.pauseVideo();
          if (syncState.seekPosition !== undefined) {
            playerRef.current.seekTo(syncState.seekPosition, true);
          }
          break;

        case PlaybackAction.RESUME:
          playerRef.current.playVideo();
          break;

        case PlaybackAction.STOP:
          playerRef.current.stopVideo();
          break;

        case PlaybackAction.SEEK:
          if (syncState.seekPosition !== undefined) {
            playerRef.current.seekTo(syncState.seekPosition, true);
          }
          break;

        case PlaybackAction.SKIP:
          // Skip will trigger new PLAY command from server
          break;
      }
    };

    // Calculate delay for scheduled playback
    if (syncState.scheduledPlayTime) {
      const delay = syncState.scheduledPlayTime - Date.now();
      if (delay > 0) {
        syncTimeoutRef.current = setTimeout(executeSync, delay);
      } else {
        executeSync();
      }
    } else {
      executeSync();
    }
  }, [syncState, isReady]);

  // Control handlers
  const handlePlay = () => {
    if (canControl && onPlaybackControl) {
      onPlaybackControl(PlaybackAction.PLAY);
    }
  };

  const handlePause = () => {
    if (canControl && onPlaybackControl) {
      onPlaybackControl(PlaybackAction.PAUSE);
    }
  };

  const handleSeek = (time: number) => {
    if (canControl && onPlaybackControl) {
      onPlaybackControl(PlaybackAction.SEEK, time);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (playerRef.current) {
      playerRef.current.setVolume(newVolume);
    }
  };

  const handleMuteToggle = () => {
    if (playerRef.current) {
      if (isMuted) {
        playerRef.current.unMute();
      } else {
        playerRef.current.mute();
      }
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="worship-player">
      {/* Video Container */}
      <div className="player-video-container">
        {!videoId ? (
          <div className="player-placeholder">
            <div className="placeholder-content">
              <span className="placeholder-icon">🎵</span>
              <h3>No song playing</h3>
              <p>Add songs to the queue to start worship</p>
            </div>
          </div>
        ) : (
          <div ref={playerContainerRef} className="player-iframe" />
        )}
      </div>

      {/* Custom Controls */}
      {videoId && (
        <div className="player-controls">
          {/* Playback Controls */}
          <div className="controls-row">
            <div className="controls-left">
              {canControl ? (
                <button
                  onClick={isPlaying ? handlePause : handlePlay}
                  className="control-btn play-pause"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? '⏸️' : '▶️'}
                </button>
              ) : (
                <div className="playback-status">
                  {isPlaying ? '▶️ Playing' : '⏸️ Paused'}
                </div>
              )}

              <div className="time-display">
                <span>{formatTime(currentTime)}</span>
                <span>/</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="controls-right">
              {/* Volume Control */}
              <div className="volume-control">
                <button
                  onClick={handleMuteToggle}
                  className="control-btn volume-btn"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? '🔇' : volume > 50 ? '🔊' : volume > 0 ? '🔉' : '🔈'}
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                  className="volume-slider"
                  title="Volume"
                />
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="progress-bar-container">
            <input
              type="range"
              min="0"
              max={duration}
              value={currentTime}
              onChange={(e) => canControl && handleSeek(parseFloat(e.target.value))}
              className="progress-bar"
              disabled={!canControl}
              title="Seek"
            />
            <div
              className="progress-fill"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>

          {!canControl && (
            <div className="control-notice">
              Only the worship leader and moderators can control playback
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WorshipPlayer;
