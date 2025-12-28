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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userRole, setUserRole] = useState<ParticipantRole>(ParticipantRole.LISTENER);

  // Settings form state
  const [settingsName, setSettingsName] = useState('');
  const [settingsDescription, setSettingsDescription] = useState('');
  const [settingsIsPrivate, setSettingsIsPrivate] = useState(false);
  const [settingsMaxParticipants, setSettingsMaxParticipants] = useState<number | undefined>(undefined);
  const [settingsSkipThreshold, setSettingsSkipThreshold] = useState(50);
  const [savingSettings, setSavingSettings] = useState(false);

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

    let cleanupWebSocket: (() => void) | undefined;
    let heartbeatInterval: NodeJS.Timeout | undefined;

    const initializeRoom = async () => {
      // Load room data first
      await loadRoomData();

      // Ensure WebSocket is connected before subscribing
      try {
        await websocketService.connect();
        cleanupWebSocket = setupWebSocketSubscriptions();

        // Send heartbeat every 30 seconds
        heartbeatInterval = setInterval(() => {
          try {
            websocketService.sendWorshipHeartbeat(roomId);
          } catch (err) {
            console.warn('Failed to send heartbeat:', err);
          }
        }, 30000);

        // Send presence on mount
        try {
          websocketService.sendWorshipPresence(roomId, 'online');
        } catch (err) {
          console.warn('Failed to send presence:', err);
        }
      } catch (err) {
        console.error('Failed to connect WebSocket:', err);
      }
    };

    initializeRoom();

    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      if (cleanupWebSocket) {
        cleanupWebSocket();
      }
      try {
        websocketService.sendWorshipPresence(roomId, 'offline');
      } catch (err) {
        console.warn('Failed to send offline presence:', err);
      }
    };
  }, [roomId, navigate]);

  const loadRoomData = async () => {
    if (!roomId) return;

    try {
      setLoading(true);
      setError(null);

      // First, join the room to become a participant
      await worshipAPI.joinRoom(roomId);

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
    if (update.type === 'SONG_ADDED' || update.type === 'SONG_REMOVED') {
      loadQueue();
    } else if (update.type === 'VOTE_UPDATED' && update.queueEntry) {
      const updatedEntry = update.queueEntry as WorshipQueueEntry;

      // Update queue entries
      setQueue((prevQueue) =>
        prevQueue.map((entry) =>
          entry.id === updatedEntry.id
            ? {
                ...entry,
                upvoteCount: updatedEntry.upvoteCount ?? entry.upvoteCount,
                skipVoteCount: updatedEntry.skipVoteCount ?? entry.skipVoteCount,
                userHasUpvoted: updatedEntry.userHasUpvoted ?? entry.userHasUpvoted,
                userHasVotedSkip: updatedEntry.userHasVotedSkip ?? entry.userHasVotedSkip,
              }
            : entry
        )
      );

      // Also update currentSong if this is the currently playing entry
      setCurrentSong((prevSong) => {
        if (prevSong && prevSong.id === updatedEntry.id) {
          return {
            ...prevSong,
            upvoteCount: updatedEntry.upvoteCount ?? prevSong.upvoteCount,
            skipVoteCount: updatedEntry.skipVoteCount ?? prevSong.skipVoteCount,
            userHasUpvoted: updatedEntry.userHasUpvoted ?? prevSong.userHasUpvoted,
            userHasVotedSkip: updatedEntry.userHasVotedSkip ?? prevSong.userHasVotedSkip,
          };
        }
        return prevSong;
      });
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
      const [queueResponse, currentlyPlayingResponse] = await Promise.all([
        worshipAPI.getQueue(roomId),
        worshipAPI.getCurrentlyPlaying(roomId),
      ]);

      setQueue(queueResponse.data);

      // Also update current song to reflect vote changes
      if (currentlyPlayingResponse.data && 'id' in currentlyPlayingResponse.data) {
        setCurrentSong(currentlyPlayingResponse.data as WorshipQueueEntry);
      }
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

  const handleDeleteRoom = async () => {
    if (!roomId) return;
    try {
      await worshipAPI.deleteRoom(roomId);
      setShowDeleteConfirm(false);
      navigate('/worship');
    } catch (err: any) {
      console.error('Error deleting room:', err);
      alert(err.response?.data?.error || 'Failed to delete room. You may not have permission.');
      setShowDeleteConfirm(false);
    }
  };

  const openSettings = () => {
    if (room) {
      setSettingsName(room.name);
      setSettingsDescription(room.description || '');
      setSettingsIsPrivate(room.isPrivate);
      setSettingsMaxParticipants(room.maxParticipants);
      setSettingsSkipThreshold(room.skipThreshold || 50);
    }
    setShowSettings(true);
  };

  const handleSaveSettings = async () => {
    if (!roomId) return;
    try {
      setSavingSettings(true);
      const response = await worshipAPI.updateRoom(roomId, {
        name: settingsName,
        description: settingsDescription,
        isPrivate: settingsIsPrivate,
        maxParticipants: settingsMaxParticipants,
        skipThreshold: settingsSkipThreshold,
      });
      setRoom(response.data);
      setShowSettings(false);
    } catch (err: any) {
      console.error('Error saving settings:', err);
      alert(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
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
          {room.canEdit && (
            <button onClick={openSettings} className="settings-button" title="Room Settings">
              ⚙️
            </button>
          )}
          {room.canDelete && (
            <>
              <button onClick={() => setShowDeleteConfirm(true)} className="delete-button">
                🗑️ Delete Room
              </button>
            </>
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

          {/* No Song Playing - Show Start Button */}
          {!currentSong && queue.length > 0 && canControl(userRole) && (
            <div className="no-song-playing">
              <p className="no-song-text">No song playing yet</p>
              <button onClick={handlePlayNext} className="start-playing-button">
                ▶️ Start Playing
              </button>
            </div>
          )}

          {/* Queue */}
          <WorshipQueue
            roomId={roomId || ''}
            queue={queue}
            currentSong={currentSong}
            onQueueUpdate={(updatedEntry) => {
              if (updatedEntry) {
                setQueue((prevQueue) =>
                  prevQueue.map((entry) =>
                    entry.id === updatedEntry.id
                      ? {
                          ...entry,
                          upvoteCount: updatedEntry.upvoteCount ?? entry.upvoteCount,
                          skipVoteCount: updatedEntry.skipVoteCount ?? entry.skipVoteCount,
                          userHasUpvoted: updatedEntry.userHasUpvoted ?? entry.userHasUpvoted,
                          userHasVotedSkip: updatedEntry.userHasVotedSkip ?? entry.userHasVotedSkip,
                        }
                      : entry
                  )
                );
                return;
              }
              loadQueue();
            }}
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Worship Room?</h2>
            </div>
            <div className="modal-body">
              <p className="warning-text">
                Are you sure you want to delete "{room.name}"?
              </p>
              <p className="warning-subtext">
                This action cannot be undone. All participants will be removed and the room's queue will be lost.
              </p>
            </div>
            <div className="modal-actions">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="cancel-button"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRoom}
                className="confirm-delete-button"
              >
                Delete Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Room Settings</h2>
              <button className="modal-close-btn" onClick={() => setShowSettings(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="settings-name">Room Name</label>
                <input
                  id="settings-name"
                  type="text"
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  placeholder="Enter room name..."
                  maxLength={100}
                />
              </div>

              <div className="form-group">
                <label htmlFor="settings-description">Description</label>
                <textarea
                  id="settings-description"
                  value={settingsDescription}
                  onChange={(e) => setSettingsDescription(e.target.value)}
                  placeholder="Describe your room..."
                  rows={3}
                  maxLength={500}
                />
              </div>

              <div className="form-group">
                <label htmlFor="settings-skip-threshold">Skip Vote Threshold (%)</label>
                <input
                  id="settings-skip-threshold"
                  type="number"
                  min={10}
                  max={100}
                  value={settingsSkipThreshold}
                  onChange={(e) => setSettingsSkipThreshold(parseInt(e.target.value) || 50)}
                />
                <p className="field-hint">Percentage of participants needed to skip a song</p>
              </div>

              <div className="form-group">
                <label htmlFor="settings-max-participants">Max Participants (optional)</label>
                <input
                  id="settings-max-participants"
                  type="number"
                  min={2}
                  max={1000}
                  value={settingsMaxParticipants || ''}
                  onChange={(e) => setSettingsMaxParticipants(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="No limit"
                />
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={settingsIsPrivate}
                    onChange={(e) => setSettingsIsPrivate(e.target.checked)}
                  />
                  <span>Private Room</span>
                </label>
                <p className="field-hint">Private rooms are only visible to invited members</p>
              </div>
            </div>
            <div className="modal-actions">
              <button
                onClick={() => setShowSettings(false)}
                className="cancel-button"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                className="save-button"
                disabled={savingSettings || !settingsName.trim()}
              >
                {savingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorshipRoom;
