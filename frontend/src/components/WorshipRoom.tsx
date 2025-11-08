import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { worshipAPI } from '../services/worshipApi';
import websocketService from '../services/websocketService';
import {
  WorshipRoom as WorshipRoomType,
  WorshipQueueEntry,
  WorshipRoomParticipant,
  PlaybackStatus,
  PlaybackAction,
  ParticipantRole,
  canControlPlayback as canControl,
} from '../types/Worship';
import WorshipPlayer from './WorshipPlayer';
import WorshipQueue from './WorshipQueue';
import './WorshipRoom.css';

const WorshipRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [room, setRoom] = useState<WorshipRoomType | null>(null);
  const [queue, setQueue] = useState<WorshipQueueEntry[]>([]);
  const [currentSong, setCurrentSong] = useState<WorshipQueueEntry | null>(null);
  const [participants, setParticipants] = useState<WorshipRoomParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [userRole, setUserRole] = useState<ParticipantRole>(ParticipantRole.LISTENER);

  // Sync state for coordinated playback
  const [syncState, setSyncState] = useState<{
    action: PlaybackAction;
    videoId: string;
    videoTitle?: string;
    seekPosition?: number;
    scheduledPlayTime?: number;
    timestamp: number;
  } | null>(null);

  useEffect(() => {
    if (!roomId) {
      navigate('/worship');
      return;
    }

    loadRoomData();
    setupWebSocketSubscriptions();

    // Send heartbeat every 30 seconds
    const heartbeatInterval = setInterval(() => {
      websocketService.sendWorshipHeartbeat(roomId);
    }, 30000);

    // Send presence on mount
    websocketService.sendWorshipPresence(roomId, 'online');

    return () => {
      clearInterval(heartbeatInterval);
      websocketService.sendWorshipPresence(roomId, 'offline');
    };
  }, [roomId, navigate]);

  const loadRoomData = async () => {
    if (!roomId) return;

    try {
      setLoading(true);
      setError(null);

      const [roomResponse, queueResponse, participantsResponse, currentlyPlayingResponse] = await Promise.all([
        worshipAPI.getRoomById(roomId),
        worshipAPI.getQueue(roomId),
        worshipAPI.getParticipants(roomId),
        worshipAPI.getCurrentlyPlaying(roomId),
      ]);

      setRoom(roomResponse.data);
      setQueue(queueResponse.data);
      setParticipants(participantsResponse.data);

      if (currentlyPlayingResponse.data && 'id' in currentlyPlayingResponse.data) {
        setCurrentSong(currentlyPlayingResponse.data as WorshipQueueEntry);
      }

      // Determine user role from room response
      if (roomResponse.data.userRole) {
        setUserRole(roomResponse.data.userRole as ParticipantRole);
      }

    } catch (err: any) {
      console.error('Error loading room data:', err);
      setError(err.response?.data?.error || 'Failed to load room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocketSubscriptions = useCallback(() => {
    if (!roomId) return;

    // Subscribe to room updates
    const unsubRoom = websocketService.subscribeToWorshipRoom(roomId, handleRoomUpdate);

    // Subscribe to queue updates
    const unsubQueue = websocketService.subscribeToWorshipQueue(roomId, handleQueueUpdate);

    // Subscribe to now playing updates
    const unsubNowPlaying = websocketService.subscribeToNowPlaying(roomId, handleNowPlayingUpdate);

    // Subscribe to playback commands
    const unsubPlayback = websocketService.subscribeToPlaybackCommands(roomId, handlePlaybackCommand);

    // Subscribe to sync requests
    const unsubSync = websocketService.subscribeToWorshipSync(handleSyncData);

    // Request sync on mount
    websocketService.requestWorshipSync(roomId);

    return () => {
      unsubRoom();
      unsubQueue();
      unsubNowPlaying();
      unsubPlayback();
      unsubSync();
    };
  }, [roomId]);

  const handleRoomUpdate = (update: any) => {
    console.log('Room update:', update);
    if (update.type === 'ROOM_UPDATED' && update.room) {
      setRoom(update.room);
    } else if (update.type === 'USER_JOINED' || update.type === 'USER_LEFT') {
      loadParticipants();
    }
  };

  const handleQueueUpdate = (update: any) => {
    console.log('Queue update:', update);
    if (update.type === 'SONG_ADDED' || update.type === 'SONG_REMOVED' || update.type === 'VOTE_UPDATED') {
      loadQueue();
    }
  };

  const handleNowPlayingUpdate = (update: any) => {
    console.log('Now playing update:', update);
    if (update.type === 'NOW_PLAYING' && update.queueEntry) {
      setCurrentSong(update.queueEntry);
      setSyncState({
        action: PlaybackAction.PLAY,
        videoId: update.queueEntry.videoId,
        videoTitle: update.queueEntry.videoTitle,
        scheduledPlayTime: update.scheduledPlayTime,
        timestamp: Date.now(),
      });
    } else if (update.type === 'PLAYBACK_STOPPED') {
      setCurrentSong(null);
      setSyncState({
        action: PlaybackAction.STOP,
        videoId: '',
        timestamp: Date.now(),
      });
    } else if (update.type === 'SONG_SKIPPED') {
      // Will be followed by NOW_PLAYING or PLAYBACK_STOPPED
      console.log('Song skipped:', update.reason);
    }
  };

  const handlePlaybackCommand = (command: any) => {
    console.log('Playback command:', command);
    if (command.type === 'PLAYBACK_COMMAND') {
      setSyncState({
        action: command.action as PlaybackAction,
        videoId: command.videoId || '',
        videoTitle: command.videoTitle,
        seekPosition: command.seekPosition,
        scheduledPlayTime: command.scheduledPlayTime,
        timestamp: command.timestamp,
      });
    }
  };

  const handleSyncData = (syncData: any) => {
    console.log('Sync data received:', syncData);
    if (syncData.type === 'SYNC_STATE') {
      // Update room state from sync data
      if (room) {
        setRoom({
          ...room,
          playbackStatus: syncData.playbackStatus,
          playbackPosition: syncData.playbackPosition,
          currentVideoId: syncData.currentVideoId,
          currentVideoTitle: syncData.currentVideoTitle,
          currentVideoThumbnail: syncData.currentVideoThumbnail,
          playbackStartedAt: syncData.playbackStartedAt,
        });
      }

      // Sync playback if there's a current video
      if (syncData.currentVideoId) {
        setSyncState({
          action: syncData.playbackStatus === 'playing' ? PlaybackAction.PLAY :
                  syncData.playbackStatus === 'paused' ? PlaybackAction.PAUSE : PlaybackAction.STOP,
          videoId: syncData.currentVideoId,
          videoTitle: syncData.currentVideoTitle,
          seekPosition: syncData.playbackPosition,
          scheduledPlayTime: syncData.timestamp,
          timestamp: Date.now(),
        });
      }
    }
  };

  const loadQueue = async () => {
    if (!roomId) return;
    try {
      const response = await worshipAPI.getQueue(roomId);
      setQueue(response.data);
    } catch (err) {
      console.error('Error loading queue:', err);
    }
  };

  const loadParticipants = async () => {
    if (!roomId) return;
    try {
      const response = await worshipAPI.getParticipants(roomId);
      setParticipants(response.data);
    } catch (err) {
      console.error('Error loading participants:', err);
    }
  };

  const handlePlaybackControl = (action: PlaybackAction, seekPosition?: number) => {
    if (!roomId || !canControl(userRole)) {
      console.warn('Insufficient permissions for playback control');
      return;
    }

    const command = {
      action,
      videoId: currentSong?.videoId || '',
      videoTitle: currentSong?.videoTitle,
      videoThumbnail: currentSong?.videoThumbnailUrl,
      seekPosition,
      scheduledPlayTime: Date.now() + 2000, // 2 second buffer
    };

    websocketService.sendPlaybackCommand(roomId, command);
  };

  const handlePlayNext = async () => {
    if (!roomId) return;
    try {
      await worshipAPI.playNext(roomId);
      // Now playing update will come via WebSocket
    } catch (err: any) {
      console.error('Error playing next song:', err);
      alert(err.response?.data?.error || 'Failed to play next song');
    }
  };

  const handleSkip = async () => {
    if (!roomId) return;
    try {
      await worshipAPI.skip(roomId);
      // Skip will trigger next song via WebSocket
    } catch (err: any) {
      console.error('Error skipping song:', err);
      alert(err.response?.data?.error || 'Failed to skip song');
    }
  };

  const handleLeaveRoom = async () => {
    if (!roomId) return;
    try {
      await worshipAPI.leaveRoom(roomId);
      navigate('/worship');
    } catch (err) {
      console.error('Error leaving room:', err);
      alert('Failed to leave room');
    }
  };

  if (loading) {
    return (
      <div className="worship-room loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading worship room...</p>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="worship-room error">
        <p>{error || 'Room not found'}</p>
        <button onClick={() => navigate('/worship')} className="back-button">
          Back to Rooms
        </button>
      </div>
    );
  }

  return (
    <div className="worship-room">
      {/* Header */}
      <div className="worship-room-header">
        <div className="header-left">
          <button onClick={() => navigate('/worship')} className="back-button">
            ← Back
          </button>
          <div className="room-info">
            <h1>{room.name}</h1>
            {room.description && <p>{room.description}</p>}
          </div>
        </div>
        <div className="header-right">
          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className="participants-button"
          >
            👥 {participants.length}
          </button>
          {room.isCreator && (
            <button onClick={() => setShowSettings(!showSettings)} className="settings-button">
              ⚙️ Settings
            </button>
          )}
          <button onClick={handleLeaveRoom} className="leave-button">
            🚪 Leave
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="worship-room-content">
        {/* Left Column - Player and Queue */}
        <div className="worship-main-column">
          {/* Video Player */}
          <div className="player-container">
            <WorshipPlayer
              videoId={currentSong?.videoId || null}
              syncState={syncState}
              onPlaybackControl={handlePlaybackControl}
              canControl={canControl(userRole)}
            />
          </div>

          {/* Current Song Info */}
          {currentSong && (
            <div className="current-song-info">
              <div className="song-details">
                <h3>{currentSong.videoTitle}</h3>
                <div className="song-meta">
                  <span>Added by {currentSong.userName}</span>
                  <span>•</span>
                  <span>👍 {currentSong.upvoteCount} upvotes</span>
                  {currentSong.skipVoteCount > 0 && (
                    <>
                      <span>•</span>
                      <span>⏭️ {currentSong.skipVoteCount} skip votes</span>
                    </>
                  )}
                </div>
              </div>
              {canControl(userRole) && (
                <div className="playback-controls">
                  <button onClick={handlePlayNext} className="control-button">
                    ⏭️ Play Next
                  </button>
                  <button onClick={handleSkip} className="control-button">
                    ⏩ Skip
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Queue */}
          <WorshipQueue
            roomId={roomId || ''}
            queue={queue}
            currentSong={currentSong}
            onQueueUpdate={loadQueue}
            userRole={userRole}
          />
        </div>

        {/* Right Column - Participants (if showing) */}
        {showParticipants && (
          <div className="worship-side-column">
            <div className="participants-panel">
              <h3>Participants ({participants.length})</h3>
              <div className="participants-list">
                {participants.map((participant) => (
                  <div key={participant.id} className="participant-item">
                    <div className="participant-avatar">
                      {participant.userProfilePic ? (
                        <img src={participant.userProfilePic} alt={participant.userName} />
                      ) : (
                        <span>{participant.userName.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="participant-info">
                      <span className="participant-name">{participant.userName}</span>
                      <span className="participant-role">{participant.role}</span>
                    </div>
                    {room.currentLeaderName === participant.userName && (
                      <span className="leader-badge">👑 Leader</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorshipRoom;
