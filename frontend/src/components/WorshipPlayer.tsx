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
  isLiveStream?: boolean;
  liveStreamUrl?: string;
}

const WorshipPlayer: React.FC<WorshipPlayerProps> = ({
  videoId,
  syncState,
  onPlaybackControl,
  canControl,
  isLiveStream = false,
  liveStreamUrl,
}) => {
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerIdRef = useRef<string>(`youtube-player-${Math.random().toString(36).substr(2, 9)}`);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [showCastHelp, setShowCastHelp] = useState(false);
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

    // Destroy existing player if any
    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch (e) {
        console.warn('Error destroying player:', e);
      }
    }

    // For live streams, use YouTube's built-in controls for better live stream support
    const playerVars = isLiveStream ? {
      autoplay: 1, // Auto-play for live streams
      controls: 1, // Use YouTube controls for live streams (better live functionality)
      disablekb: 0,
      fs: 1,
      modestbranding: 1,
      rel: 0,
      iv_load_policy: 3,
      playsinline: 1,
      origin: window.location.origin,
    } : {
      autoplay: 0,
      controls: 0, // Use custom controls for regular videos
      disablekb: 1,
      fs: 0,
      modestbranding: 1,
      rel: 0,
      iv_load_policy: 3,
      playsinline: 1,
      origin: window.location.origin,
    };

    playerRef.current = new window.YT.Player(playerIdRef.current, {
      height: '100%',
      width: '100%',
      videoId: '', // Start empty - syncState will load the video to avoid race conditions
      playerVars,
      events: {
        onReady: handlePlayerReady,
        onStateChange: handlePlayerStateChange,
        onError: handlePlayerError,
      },
    });
  };

  const handlePlayerError = (event: any) => {
    console.error('YouTube Player Error:', event.data);
    // Error codes: 2 = invalid parameter, 5 = HTML5 player error,
    // 100 = video not found, 101/150 = not allowed to be played in embedded players
  };

  const handlePlayerReady = (event: any) => {
    console.log('YouTube player ready');
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

  // Handle sync state changes (syncState controls all video loading to avoid race conditions)
  useEffect(() => {
    if (!syncState || !isReady || !playerRef.current) return;

    // Clear any pending sync
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }

    const executeSync = () => {
      console.log('Executing sync:', syncState.action, 'videoId:', syncState.videoId);
      switch (syncState.action) {
        case PlaybackAction.PLAY:
          if (syncState.videoId) {
            // Load the video and explicitly start playback
            playerRef.current.loadVideoById({
              videoId: syncState.videoId,
              startSeconds: syncState.seekPosition || 0,
            });
            // Explicitly call playVideo to ensure playback starts
            playerRef.current.playVideo();
          } else if (syncState.seekPosition !== undefined) {
            playerRef.current.seekTo(syncState.seekPosition, true);
            playerRef.current.playVideo();
          } else {
            playerRef.current.playVideo();
          }
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
    <div className={`worship-player ${isLiveStream ? 'live-stream-player' : ''}`}>
      {/* Live Stream Indicator */}
      {isLiveStream && videoId && (
        <div className="live-stream-banner">
          <span className="live-indicator">
            <span className="live-dot"></span>
            LIVE
          </span>
          <span className="live-text">Watching live stream together</span>
        </div>
      )}

      {/* Video Container */}
      <div className="player-video-container">
        {!videoId ? (
          <div className="player-placeholder">
            <div className="placeholder-content">
              <span className="placeholder-icon">{isLiveStream ? '📺' : '🎵'}</span>
              <h3>{isLiveStream ? 'Live stream not started' : 'No song playing'}</h3>
              <p>{isLiveStream ? 'The live event will start soon' : 'Add songs to the queue to start worship'}</p>
            </div>
          </div>
        ) : (
          <div ref={playerContainerRef} id={playerIdRef.current} className="player-iframe" />
        )}
      </div>

      {/* Custom Controls - Only show for non-live streams */}
      {videoId && !isLiveStream && (
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

      {/* Live Stream Volume Control - Minimal controls for live streams */}
      {videoId && isLiveStream && (
        <div className="player-controls live-controls">
          <div className="controls-row">
            <div className="controls-left">
              <div className="live-badge">
                <span className="live-dot"></span>
                LIVE
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
        </div>
      )}

      {/* Cast to TV Button */}
      {videoId && (
        <button
          className="cast-help-btn"
          onClick={() => setShowCastHelp(true)}
          title="Cast to TV"
        >
          📺 Cast to TV
        </button>
      )}

      {/* Cast Help Modal */}
      {showCastHelp && (
        <div className="cast-help-overlay" onClick={() => setShowCastHelp(false)}>
          <div className="cast-help-modal" onClick={(e) => e.stopPropagation()}>
            <button className="cast-help-close" onClick={() => setShowCastHelp(false)}>
              &times;
            </button>
            <h3>📺 Cast to Your TV</h3>
            <p className="cast-help-intro">
              Watch worship on the big screen! Use your device's built-in casting feature:
            </p>

            <div className="cast-instructions">
              <div className="cast-device">
                <h4>iPhone / iPad</h4>
                <ol>
                  <li>Swipe down from top-right corner to open Control Center</li>
                  <li>Tap "Screen Mirroring"</li>
                  <li>Select your Apple TV or AirPlay-compatible TV</li>
                </ol>
              </div>

              <div className="cast-device">
                <h4>Android</h4>
                <ol>
                  <li>Swipe down from top of screen to open Quick Settings</li>
                  <li>Look for "Cast", "Smart View", or "Screen Cast"</li>
                  <li>Select your Chromecast or Smart TV</li>
                </ol>
              </div>

              <div className="cast-device">
                <h4>Desktop Chrome</h4>
                <ol>
                  <li>Click the three-dot menu in the top right</li>
                  <li>Select "Cast..."</li>
                  <li>Choose your Chromecast device</li>
                </ol>
              </div>
            </div>

            <p className="cast-help-note">
              Tip: For best results, connect your device to the same WiFi network as your TV.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorshipPlayer;
