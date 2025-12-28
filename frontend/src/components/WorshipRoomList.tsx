import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { worshipAPI } from '../services/worshipApi';
import { WorshipRoom, PlaybackStatus, RoomType, WorshipPlaylist, formatScheduledTime, isScheduledSoon, extractYouTubeVideoId } from '../types/Worship';
import websocketService from '../services/websocketService';
import LoadingSpinner from './LoadingSpinner';
import './WorshipRoomList.css';

// Type for songs being added to a template
interface TemplateSong {
  videoId: string;
  videoTitle: string;
  videoDuration?: number;
  videoThumbnailUrl?: string;
}

interface WorshipRoomListProps {
  onRoomSelect?: (room: WorshipRoom) => void;
  selectedRoomId?: string;
}

const formatParticipantCount = (count: number): string => {
  return count === 1 ? '1 person' : `${count} people`;
};

const formatPlaybackStatus = (status: PlaybackStatus): string => {
  const statusMap: Record<PlaybackStatus, string> = {
    [PlaybackStatus.PLAYING]: 'Now Playing',
    [PlaybackStatus.PAUSED]: 'Paused',
    [PlaybackStatus.STOPPED]: 'Stopped',
  };
  return statusMap[status];
};

const getStatusIcon = (status: PlaybackStatus): string => {
  const iconMap: Record<PlaybackStatus, string> = {
    [PlaybackStatus.PLAYING]: '▶️',
    [PlaybackStatus.PAUSED]: '⏸️',
    [PlaybackStatus.STOPPED]: '⏹️',
  };
  return iconMap[status];
};

const WorshipRoomList: React.FC<WorshipRoomListProps> = ({ onRoomSelect, selectedRoomId }) => {
  const [rooms, setRooms] = useState<WorshipRoom[]>([]);
  const [publicRooms, setPublicRooms] = useState<WorshipRoom[]>([]);
  const [playingRooms, setPlayingRooms] = useState<WorshipRoom[]>([]);
  const [templateRooms, setTemplateRooms] = useState<WorshipRoom[]>([]);
  const [liveEventRooms, setLiveEventRooms] = useState<WorshipRoom[]>([]);
  const [playlists, setPlaylists] = useState<WorshipPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'playing' | 'myRooms' | 'public' | 'playlists' | 'liveEvents'>('playing');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    description: '',
    imageUrl: '',
    isPrivate: false,
    maxParticipants: 50,
    skipThreshold: 0.5,
    roomType: RoomType.LIVE as RoomType,
    liveStreamUrl: '',
    scheduledStartTime: '',
    autoStartEnabled: false,
    autoCloseEnabled: false,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [createLoading, setCreateLoading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [startingRoomId, setStartingRoomId] = useState<string | null>(null);
  // Template song states
  const [templateSongs, setTemplateSongs] = useState<TemplateSong[]>([]);
  const [templateSongUrl, setTemplateSongUrl] = useState('');
  const [addingSong, setAddingSong] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadRooms();

    // Subscribe to room list updates with error handling
    let cleanup: (() => void) | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    const setupWebSocket = async () => {
      try {
        // Wait for WebSocket connection first
        await websocketService.connect();
        cleanup = websocketService.subscribeToWorshipRoom('global', handleRoomUpdate);
      } catch (err) {
        console.warn('WebSocket not connected yet for worship rooms:', err);
        // Polling fallback - refresh room list periodically if WebSocket isn't available
        pollInterval = setInterval(() => {
          loadRooms();
        }, 30000); // Refresh every 30 seconds
      }
    };

    setupWebSocket();

    return () => {
      if (cleanup) {
        cleanup();
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, []);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const [myRooms, availableRooms, currentlyPlaying, templates, liveEvents, publicPlaylists] = await Promise.all([
        worshipAPI.getUserRooms(),
        worshipAPI.getPublicRooms(),
        worshipAPI.getCurrentlyPlayingRooms(),
        worshipAPI.getTemplateRooms(),
        worshipAPI.getLiveEventRooms(),
        worshipAPI.getPublicPlaylists(),
      ]);
      setRooms(myRooms.data);
      setPublicRooms(availableRooms.data);
      setPlayingRooms(currentlyPlaying.data);
      setTemplateRooms(templates.data);
      setLiveEventRooms(liveEvents.data);
      setPlaylists(publicPlaylists.data);
    } catch (err) {
      setError('Failed to load worship rooms');
      console.error('Error loading rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoomUpdate = (update: any) => {
    if (update.type === 'ROOM_CREATED' || update.type === 'ROOM_UPDATED' || update.type === 'ROOM_DELETED') {
      loadRooms();
    }
  };

  const handleRoomClick = (room: WorshipRoom) => {
    if (onRoomSelect) {
      onRoomSelect(room);
    } else {
      navigate(`/worship/${room.id}`);
    }
  };

  const handleJoinRoom = async (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await worshipAPI.joinRoom(roomId);
      loadRooms();
      // Navigate to room after joining
      navigate(`/worship/${roomId}`);
    } catch (err) {
      console.error('Error joining room:', err);
      alert('Failed to join room. Please try again.');
    }
  };

  const handleStartTemplate = async (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setStartingRoomId(roomId);
      const response = await worshipAPI.startTemplateRoom(roomId);
      // Navigate to the newly created live room
      navigate(`/worship/${response.data.id}`);
    } catch (err) {
      console.error('Error starting template room:', err);
      alert('Failed to start worship session. Please try again.');
    } finally {
      setStartingRoomId(null);
    }
  };

  const handleStartLiveEvent = async (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setStartingRoomId(roomId);
      await worshipAPI.startLiveEvent(roomId);
      loadRooms();
      // Navigate to the live event room
      navigate(`/worship/${roomId}`);
    } catch (err) {
      console.error('Error starting live event:', err);
      alert('Failed to start live event. Please try again.');
    } finally {
      setStartingRoomId(null);
    }
  };

  const handleEndLiveEvent = async (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm('Are you sure you want to end this live event?');
    if (!confirmed) return;

    try {
      setStartingRoomId(roomId);
      await worshipAPI.endLiveEvent(roomId);
      loadRooms();
    } catch (err) {
      console.error('Error ending live event:', err);
      alert('Failed to end live event. Please try again.');
    } finally {
      setStartingRoomId(null);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Validate file size (100MB max)
      if (file.size > 100 * 1024 * 1024) {
        alert('Image size must be less than 100MB');
        return;
      }

      setImageFile(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
    setCreateFormData({ ...createFormData, imageUrl: '' });
  };
  const handleDeleteRoom = async (roomId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();

    const confirmed = window.confirm('Are you sure you want to delete this worship room? This action cannot be undone.');
    if (!confirmed) {
      return;
    }

    try {
      setDeleteLoadingId(roomId);
      await worshipAPI.deleteRoom(roomId);
      loadRooms();
    } catch (err) {
      console.error('Error deleting room:', err);
      alert('Failed to delete room. Please try again.');
    } finally {
      setDeleteLoadingId(null);
    }
  };


  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      let imageUrl = createFormData.imageUrl;

      // Upload image if file is selected
      if (imageFile) {
        const uploadedUrl = await worshipAPI.uploadRoomImage(imageFile);
        console.log('Image uploaded successfully, URL:', uploadedUrl);
        imageUrl = uploadedUrl;
      }

      // Prepare room data based on room type
      const roomData: any = {
        name: createFormData.name,
        description: createFormData.description,
        imageUrl,
        isPrivate: createFormData.isPrivate,
        maxParticipants: createFormData.maxParticipants,
        skipThreshold: createFormData.skipThreshold,
        roomType: createFormData.roomType,
      };

      console.log('Creating room with data:', roomData);

      // Add live event specific fields
      if (createFormData.roomType === RoomType.LIVE_EVENT) {
        roomData.liveStreamUrl = createFormData.liveStreamUrl;
        roomData.autoStartEnabled = createFormData.autoStartEnabled;
        roomData.autoCloseEnabled = createFormData.autoCloseEnabled;
        if (createFormData.scheduledStartTime) {
          roomData.scheduledStartTime = createFormData.scheduledStartTime;
        }
      }

      // Add template specific fields
      if (createFormData.roomType === RoomType.TEMPLATE) {
        roomData.isTemplate = true;
        roomData.allowUserStart = true;

        // If songs were added, create a playlist first
        if (templateSongs.length > 0) {
          console.log('Creating playlist for template with', templateSongs.length, 'songs');

          // Create the playlist
          const playlistResponse = await worshipAPI.createPlaylist({
            name: createFormData.name,
            description: createFormData.description || `Playlist for ${createFormData.name}`,
            imageUrl,
            isPublic: !createFormData.isPrivate,
          });

          const playlistId = playlistResponse.data.id;
          console.log('Playlist created:', playlistId);

          // Add each song to the playlist
          for (let i = 0; i < templateSongs.length; i++) {
            const song = templateSongs[i];
            await worshipAPI.addPlaylistEntry(playlistId, {
              videoId: song.videoId,
              videoTitle: song.videoTitle,
              videoDuration: song.videoDuration,
              videoThumbnailUrl: song.videoThumbnailUrl,
              position: (i + 1) * 10000, // Same position scheme as queue
            });
          }
          console.log('All songs added to playlist');

          // Link the playlist to the template room
          roomData.playlistId = playlistId;
        }
      }

      const response = await worshipAPI.createRoom(roomData);
      console.log('Room created, response:', response.data);

      setShowCreateModal(false);
      resetCreateForm();
      loadRooms();
      // Navigate to newly created room (for live rooms) or stay on list (for templates/events)
      if (createFormData.roomType === RoomType.LIVE) {
        navigate(`/worship/${response.data.id}`);
      }
    } catch (err) {
      console.error('Error creating room:', err);
      alert('Failed to create room. Please try again.');
    } finally {
      setCreateLoading(false);
    }
  };

  const resetCreateForm = () => {
    setCreateFormData({
      name: '',
      description: '',
      imageUrl: '',
      isPrivate: false,
      maxParticipants: 50,
      skipThreshold: 0.5,
      roomType: RoomType.LIVE,
      liveStreamUrl: '',
      scheduledStartTime: '',
      autoStartEnabled: false,
      autoCloseEnabled: false,
    });
    setImageFile(null);
    setImagePreview('');
    setTemplateSongs([]);
    setTemplateSongUrl('');
  };

  // Fetch YouTube video title using oEmbed API (no API key required)
  const fetchYouTubeTitle = async (videoId: string): Promise<string> => {
    try {
      const response = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );
      if (response.ok) {
        const data = await response.json();
        return data.title || `YouTube Video ${videoId}`;
      }
    } catch (err) {
      console.warn('Failed to fetch YouTube title:', err);
    }
    return `YouTube Video ${videoId}`;
  };

  // Add song to template playlist
  const handleAddTemplateSong = async () => {
    if (!templateSongUrl.trim()) return;

    const videoId = extractYouTubeVideoId(templateSongUrl);
    if (!videoId) {
      alert('Invalid YouTube URL. Please enter a valid YouTube video link.');
      return;
    }

    // Check if already added
    if (templateSongs.some(s => s.videoId === videoId)) {
      alert('This song is already in the playlist.');
      return;
    }

    setAddingSong(true);
    try {
      // Fetch video title using oEmbed API
      const videoTitle = await fetchYouTubeTitle(videoId);
      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

      setTemplateSongs([...templateSongs, {
        videoId,
        videoTitle,
        videoThumbnailUrl: thumbnailUrl,
      }]);
      setTemplateSongUrl('');
    } catch (err) {
      console.error('Error fetching video info:', err);
      // Fall back to just adding with video ID
      setTemplateSongs([...templateSongs, {
        videoId,
        videoTitle: `YouTube Video (${videoId})`,
        videoThumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      }]);
      setTemplateSongUrl('');
    } finally {
      setAddingSong(false);
    }
  };

  // Remove song from template playlist
  const handleRemoveTemplateSong = (index: number) => {
    setTemplateSongs(templateSongs.filter((_, i) => i !== index));
  };

  // Format duration for display
  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRoomTypeIcon = (roomType?: RoomType): string => {
    switch (roomType) {
      case RoomType.TEMPLATE: return '📋';
      case RoomType.LIVE_EVENT: return '📺';
      default: return '🎵';
    }
  };

  const getRoomTypeBadge = (room: WorshipRoom) => {
    if (room.roomType === RoomType.TEMPLATE) {
      return <span className="room-type-badge template-badge">Playlist</span>;
    }
    if (room.roomType === RoomType.LIVE_EVENT) {
      if (room.isLiveStreamActive) {
        return <span className="room-type-badge live-event-badge live">Live Stream</span>;
      }
      if (room.scheduledStartTime && isScheduledSoon(room.scheduledStartTime)) {
        return <span className="room-type-badge live-event-badge scheduled">Starting Soon</span>;
      }
      return <span className="room-type-badge live-event-badge">Scheduled Event</span>;
    }
    return null;
  };

  const renderRoom = (room: WorshipRoom, options: { isJoinable?: boolean; showStartButton?: boolean; isTemplate?: boolean; isLiveEvent?: boolean } = {}) => {
    const { isJoinable = false, showStartButton = false, isTemplate = false, isLiveEvent = false } = options;

    return (
      <div
        key={room.id}
        className={`worship-room-item ${selectedRoomId === room.id ? 'selected' : ''} ${isJoinable || showStartButton ? 'joinable' : ''} ${isTemplate ? 'template-room' : ''} ${isLiveEvent ? 'live-event-room' : ''}`}
        onClick={() => !isJoinable && !showStartButton && handleRoomClick(room)}
      >
        <div className="room-thumbnail">
          {room.imageUrl ? (
            <img
              src={room.imageUrl}
              alt={room.name}
              onError={(e) => {
                console.error('Image failed to load:', room.imageUrl);
                // Hide the broken image and show placeholder
                e.currentTarget.style.display = 'none';
                const placeholder = e.currentTarget.parentElement?.querySelector('.room-thumbnail-placeholder');
                if (placeholder) {
                  (placeholder as HTMLElement).style.display = 'flex';
                }
              }}
            />
          ) : null}
          <div className="room-thumbnail-placeholder" style={{ display: room.imageUrl ? 'none' : 'flex' }}>
            {getRoomTypeIcon(room.roomType)}
          </div>
          {room.playbackStatus === PlaybackStatus.PLAYING && (
            <div className="playing-indicator">
              <span className="pulse-dot"></span>
              <span className="pulse-text">LIVE</span>
            </div>
          )}
          {room.roomType === RoomType.LIVE_EVENT && room.isLiveStreamActive && (
            <div className="playing-indicator stream-indicator">
              <span className="pulse-dot"></span>
              <span className="pulse-text">STREAMING</span>
            </div>
          )}
        </div>

        <div className="room-content">
          <div className="room-header">
            <h3>{room.name}</h3>
            <div className="room-badges">
              {getRoomTypeBadge(room)}
              {room.isPrivate && <span className="privacy-badge">🔒 Private</span>}
            </div>
            {room.canDelete && (
              <button
                className="manage-room-button"
                onClick={(e) => handleDeleteRoom(room.id, e)}
                disabled={deleteLoadingId === room.id}
                title="Delete room"
              >
                {deleteLoadingId === room.id ? 'Deleting...' : '🗑️'}
              </button>
            )}
          </div>

          {room.description && <p className="room-description">{room.description}</p>}

          <div className="room-meta">
            {room.roomType !== RoomType.TEMPLATE && (
              <span className="room-status">
                {getStatusIcon(room.playbackStatus)} {formatPlaybackStatus(room.playbackStatus)}
              </span>
            )}
            <span className="room-participants">
              👥 {formatParticipantCount(room.participantCount)}
            </span>
            {room.maxParticipants && (
              <span className="room-capacity">
                / {room.maxParticipants}
              </span>
            )}
          </div>

          {/* Scheduled time for live events */}
          {room.roomType === RoomType.LIVE_EVENT && room.scheduledStartTime && !room.isLiveStreamActive && (
            <div className="scheduled-time">
              <span className="schedule-icon">🗓️</span>
              <span className="schedule-text">{formatScheduledTime(room.scheduledStartTime)}</span>
            </div>
          )}

          {/* Playlist info for templates */}
          {room.roomType === RoomType.TEMPLATE && room.playlistName && (
            <div className="playlist-info">
              <span className="playlist-icon">📋</span>
              <span className="playlist-name">{room.playlistName}</span>
              {room.playlistVideoCount && (
                <span className="video-count">{room.playlistVideoCount} videos</span>
              )}
            </div>
          )}

          {room.currentVideoTitle && (
            <div className="current-song">
              <div className="current-song-thumbnail">
                {room.currentVideoThumbnail ? (
                  <img src={room.currentVideoThumbnail} alt={room.currentVideoTitle} />
                ) : (
                  <span>🎵</span>
                )}
              </div>
              <div className="current-song-info">
                <span className="now-playing-label">Now Playing</span>
                <span className="current-song-title">{room.currentVideoTitle}</span>
              </div>
            </div>
          )}

          {/* Standard join button */}
          {isJoinable && !isTemplate && !isLiveEvent && (
            <div className="room-actions">
              <button
                onClick={(e) => handleJoinRoom(room.id, e)}
                className="join-room-button"
              >
                Join Room
              </button>
            </div>
          )}

          {/* Playlist room actions */}
          {isTemplate && (
            <div className="room-actions template-actions">
              <button
                onClick={(e) => handleStartTemplate(room.id, e)}
                className="start-template-button"
                disabled={startingRoomId === room.id}
              >
                {startingRoomId === room.id ? 'Starting...' : '▶ Play'}
              </button>
            </div>
          )}

          {/* Live event actions */}
          {isLiveEvent && (
            <div className="room-actions live-event-actions">
              {!room.isLiveStreamActive ? (
                <button
                  onClick={(e) => handleStartLiveEvent(room.id, e)}
                  className="start-live-event-button"
                  disabled={startingRoomId === room.id}
                >
                  {startingRoomId === room.id ? 'Starting...' : 'Go Live'}
                </button>
              ) : (
                <>
                  <button
                    onClick={(e) => handleJoinRoom(room.id, e)}
                    className="join-room-button"
                  >
                    Watch Live
                  </button>
                  {room.canDelete && (
                    <button
                      onClick={(e) => handleEndLiveEvent(room.id, e)}
                      className="end-live-event-button"
                      disabled={startingRoomId === room.id}
                    >
                      {startingRoomId === room.id ? 'Ending...' : 'End Stream'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCreateModal = () => (
    <div className="create-room-modal-overlay" onClick={() => setShowCreateModal(false)}>
      <div className="create-room-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={() => setShowCreateModal(false)}>
          ✕
        </button>
        <h2>Create Worship Room</h2>
        <form onSubmit={handleCreateRoom}>
          {/* Room Type Selection */}
          <div className="form-group">
            <label>Room Type</label>
            <div className="room-type-selector">
              <button
                type="button"
                className={`room-type-option ${createFormData.roomType === RoomType.LIVE ? 'active' : ''}`}
                onClick={() => setCreateFormData({ ...createFormData, roomType: RoomType.LIVE })}
              >
                <span className="room-type-icon">🎵</span>
                <span className="room-type-label">Live Room</span>
                <span className="room-type-desc">DJ-style room like plug.dj</span>
              </button>
              <button
                type="button"
                className={`room-type-option ${createFormData.roomType === RoomType.TEMPLATE ? 'active' : ''}`}
                onClick={() => setCreateFormData({ ...createFormData, roomType: RoomType.TEMPLATE })}
              >
                <span className="room-type-icon">📋</span>
                <span className="room-type-label">Playlist</span>
                <span className="room-type-desc">Build a playlist to worship together</span>
              </button>
              <button
                type="button"
                className={`room-type-option ${createFormData.roomType === RoomType.LIVE_EVENT ? 'active' : ''}`}
                onClick={() => setCreateFormData({ ...createFormData, roomType: RoomType.LIVE_EVENT })}
              >
                <span className="room-type-icon">📺</span>
                <span className="room-type-label">Live Event</span>
                <span className="room-type-desc">YouTube live stream with scheduling</span>
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="room-name">Room Name *</label>
            <input
              id="room-name"
              type="text"
              value={createFormData.name}
              onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
              placeholder={
                createFormData.roomType === RoomType.LIVE_EVENT
                  ? "Sunday Morning Service, Easter Worship, etc."
                  : createFormData.roomType === RoomType.TEMPLATE
                  ? "Morning Devotional Playlist, Youth Worship Mix, etc."
                  : "Sunday Worship, Youth Night, etc."
              }
              required
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label htmlFor="room-description">Description</label>
            <textarea
              id="room-description"
              value={createFormData.description}
              onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
              placeholder="Describe your worship room..."
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Live Event specific fields */}
          {createFormData.roomType === RoomType.LIVE_EVENT && (
            <>
              <div className="form-group">
                <label htmlFor="live-stream-url">YouTube Live Stream URL *</label>
                <input
                  id="live-stream-url"
                  type="url"
                  value={createFormData.liveStreamUrl}
                  onChange={(e) => setCreateFormData({ ...createFormData, liveStreamUrl: e.target.value })}
                  placeholder="https://youtube.com/live/VIDEO_ID or https://www.youtube.com/watch?v=VIDEO_ID"
                  required
                />
                <small>Paste the URL of your YouTube live stream</small>
              </div>

              <div className="form-group">
                <label htmlFor="scheduled-start">Scheduled Start Time</label>
                <input
                  id="scheduled-start"
                  type="datetime-local"
                  value={createFormData.scheduledStartTime}
                  onChange={(e) => setCreateFormData({ ...createFormData, scheduledStartTime: e.target.value })}
                />
                <small>When should this live event start?</small>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={createFormData.autoStartEnabled}
                    onChange={(e) => setCreateFormData({ ...createFormData, autoStartEnabled: e.target.checked })}
                  />
                  <span>Auto-start at scheduled time</span>
                </label>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={createFormData.autoCloseEnabled}
                    onChange={(e) => setCreateFormData({ ...createFormData, autoCloseEnabled: e.target.checked })}
                  />
                  <span>Auto-close when stream ends</span>
                </label>
              </div>
            </>
          )}

          {/* Template Playlist Songs */}
          {createFormData.roomType === RoomType.TEMPLATE && (
            <div className="form-group template-songs-section">
              <label>Songs</label>
              <p className="section-hint">Add songs to your playlist. Anyone can press play and worship together!</p>

              {/* Added songs list */}
              {templateSongs.length > 0 && (
                <div className="template-songs-list">
                  {templateSongs.map((song, index) => (
                    <div key={song.videoId} className="template-song-item">
                      <div className="template-song-thumbnail">
                        {song.videoThumbnailUrl ? (
                          <img src={song.videoThumbnailUrl} alt={song.videoTitle} />
                        ) : (
                          <span>🎵</span>
                        )}
                      </div>
                      <div className="template-song-info">
                        <span className="template-song-title">{song.videoTitle}</span>
                        {song.videoDuration && (
                          <span className="template-song-duration">{formatDuration(song.videoDuration)}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="remove-song-button"
                        onClick={() => handleRemoveTemplateSong(index)}
                        title="Remove song"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add song input */}
              <div className="add-song-input-group">
                <input
                  type="text"
                  value={templateSongUrl}
                  onChange={(e) => setTemplateSongUrl(e.target.value)}
                  placeholder="Paste YouTube URL..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTemplateSong();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddTemplateSong}
                  disabled={addingSong || !templateSongUrl.trim()}
                  className="add-song-btn"
                >
                  {addingSong ? 'Adding...' : '+ Add Song'}
                </button>
              </div>

              {templateSongs.length === 0 && (
                <p className="empty-playlist-hint">No songs added yet. Add at least one song to create your playlist.</p>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="room-image">Room Image</label>
            {imagePreview ? (
              <div className="image-preview-container">
                <img src={imagePreview} alt="Room preview" className="room-image-preview" />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="remove-image-button"
                >
                  Remove Image
                </button>
              </div>
            ) : (
              <div className="image-upload-container">
                <input
                  id="room-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  style={{ display: 'none' }}
                />
                <label htmlFor="room-image" className="upload-label">
                  <div className="upload-icon">📷</div>
                  <div className="upload-text">Click to upload an image</div>
                  <div className="upload-hint">PNG, JPG, GIF up to 10MB</div>
                </label>
              </div>
            )}
          </div>

          {/* Advanced options - hide for playlists to keep it simple */}
          {createFormData.roomType !== RoomType.TEMPLATE && (
            <>
              <div className="form-group">
                <label htmlFor="max-participants">Max Participants</label>
                <input
                  id="max-participants"
                  type="number"
                  value={createFormData.maxParticipants}
                  onChange={(e) => setCreateFormData({ ...createFormData, maxParticipants: parseInt(e.target.value) })}
                  min={2}
                  max={500}
                />
              </div>

              {/* Skip threshold only for live rooms */}
              {createFormData.roomType !== RoomType.LIVE_EVENT && (
                <div className="form-group">
                  <label htmlFor="skip-threshold">Skip Threshold (0.0 - 1.0)</label>
                  <input
                    id="skip-threshold"
                    type="number"
                    step="0.1"
                    value={createFormData.skipThreshold}
                    onChange={(e) => setCreateFormData({ ...createFormData, skipThreshold: parseFloat(e.target.value) })}
                    min={0}
                    max={1}
                  />
                  <small>Percentage of votes needed to skip a song (0.5 = 50%)</small>
                </div>
              )}

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={createFormData.isPrivate}
                    onChange={(e) => setCreateFormData({ ...createFormData, isPrivate: e.target.checked })}
                  />
                  <span>Make this room private</span>
                </label>
              </div>
            </>
          )}

          <div className="modal-actions">
            <button
              type="button"
              onClick={() => { setShowCreateModal(false); resetCreateForm(); }}
              className="cancel-button"
            >
              Cancel
            </button>
            <button type="submit" className="submit-button" disabled={createLoading}>
              {createLoading ? 'Creating...' :
                createFormData.roomType === RoomType.TEMPLATE ? 'Create Template' :
                createFormData.roomType === RoomType.LIVE_EVENT ? 'Schedule Event' :
                'Create Room'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="worship-room-list loading">
        <LoadingSpinner type="multi-ring" size="medium" text="Loading worship rooms..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="worship-room-list error">
        <p>{error}</p>
        <button onClick={loadRooms} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="worship-room-list">
      <div className="worship-room-list-header">
        <div className="header-left">
          <button onClick={() => navigate('/dashboard')} className="back-home-button">
            🏠 Back Home
          </button>
          <h2>🎵 Worship Rooms</h2>
        </div>
        <div className="header-actions">
          <button
            onClick={() => setActiveView('playing')}
            className={`nav-btn ${activeView === 'playing' ? 'active' : ''}`}
          >
            ▶️ Now Playing
          </button>
          <button
            onClick={() => setActiveView('playlists')}
            className={`nav-btn ${activeView === 'playlists' ? 'active' : ''}`}
          >
            📋 Playlists
          </button>
          <button
            onClick={() => setActiveView('liveEvents')}
            className={`nav-btn ${activeView === 'liveEvents' ? 'active' : ''}`}
          >
            📺 Live Events
          </button>
          <button
            onClick={() => setActiveView('myRooms')}
            className={`nav-btn ${activeView === 'myRooms' ? 'active' : ''}`}
          >
            🎶 My Rooms
          </button>
          <button
            onClick={() => setActiveView('public')}
            className={`nav-btn ${activeView === 'public' ? 'active' : ''}`}
          >
            🌍 Public
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className={`nav-btn create-btn`}
          >
            ➕ Create
          </button>
        </div>
      </div>

      {activeView === 'playing' && (
        <div className="rooms-section">
          <h3>Currently Playing</h3>
          {playingRooms.length === 0 ? (
            <div className="empty-state">
              <p>🎵 No rooms are currently playing</p>
              <p>Start a worship session or join a public room!</p>
              <div className="empty-state-actions">
                <button onClick={() => setActiveView('playlists')} className="primary-button">
                  Browse Playlists
                </button>
                <button onClick={() => setActiveView('public')} className="secondary-button">
                  Browse Public Rooms
                </button>
              </div>
            </div>
          ) : (
            <div className="rooms-grid">
              {playingRooms.map((room) => renderRoom(room, { isJoinable: !room.isParticipant }))}
            </div>
          )}
        </div>
      )}

      {activeView === 'playlists' && (
        <div className="rooms-section">
          <h3>Playlists</h3>
          <p className="section-description">Press play on a playlist to start worshipping together!</p>
          {templateRooms.length === 0 ? (
            <div className="empty-state">
              <p>📋 No playlists available yet</p>
              <p>Create a playlist for everyone to enjoy!</p>
              <button onClick={() => setShowCreateModal(true)} className="primary-button">
                Create Playlist
              </button>
            </div>
          ) : (
            <div className="rooms-grid">
              {templateRooms.map((room) => renderRoom(room, { isTemplate: true }))}
            </div>
          )}
        </div>
      )}

      {activeView === 'liveEvents' && (
        <div className="rooms-section">
          <h3>Live Events</h3>
          <p className="section-description">Watch YouTube live streams together with your church community.</p>
          {liveEventRooms.length === 0 ? (
            <div className="empty-state">
              <p>📺 No live events scheduled</p>
              <p>Schedule a YouTube live stream for your congregation!</p>
              <button onClick={() => setShowCreateModal(true)} className="primary-button">
                Schedule Live Event
              </button>
            </div>
          ) : (
            <div className="rooms-grid">
              {liveEventRooms.map((room) => renderRoom(room, { isLiveEvent: true }))}
            </div>
          )}
        </div>
      )}

      {activeView === 'myRooms' && (
        <div className="rooms-section">
          <h3>My Rooms</h3>
          {rooms.length === 0 ? (
            <div className="empty-state">
              <p>👋 You haven't joined any worship rooms yet</p>
              <p>Join a public room or create your own!</p>
              <div className="empty-state-actions">
                <button onClick={() => setActiveView('public')} className="primary-button">
                  Browse Public Rooms
                </button>
                <button onClick={() => setShowCreateModal(true)} className="secondary-button">
                  Create Room
                </button>
              </div>
            </div>
          ) : (
            <div className="rooms-grid">
              {rooms.map((room) => renderRoom(room))}
            </div>
          )}
        </div>
      )}

      {activeView === 'public' && (
        <div className="rooms-section">
          <h3>Public Rooms</h3>
          {publicRooms.length === 0 ? (
            <div className="empty-state">
              <p>🌟 No public rooms available</p>
              <p>Be the first to create a worship room!</p>
              <button onClick={() => setShowCreateModal(true)} className="primary-button">
                Create Room
              </button>
            </div>
          ) : (
            <div className="rooms-grid">
              {publicRooms.map((room) => renderRoom(room, { isJoinable: !room.isParticipant }))}
            </div>
          )}
        </div>
      )}

      {showCreateModal && renderCreateModal()}
    </div>
  );
};

export default WorshipRoomList;
