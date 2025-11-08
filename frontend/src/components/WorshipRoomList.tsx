import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { worshipAPI } from '../services/worshipApi';
import { WorshipRoom, PlaybackStatus } from '../types/Worship';
import websocketService from '../services/websocketService';
import './WorshipRoomList.css';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'myRooms' | 'public' | 'playing' | 'create'>('playing');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    description: '',
    imageUrl: '',
    isPrivate: false,
    maxParticipants: 50,
    skipThreshold: 0.5,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [createLoading, setCreateLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadRooms();

    // Subscribe to room list updates
    const cleanup = websocketService.subscribeToWorshipRoom('global', handleRoomUpdate);

    return () => {
      cleanup();
    };
  }, []);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const [myRooms, availableRooms, currentlyPlaying] = await Promise.all([
        worshipAPI.getUserRooms(),
        worshipAPI.getPublicRooms(),
        worshipAPI.getCurrentlyPlayingRooms(),
      ]);
      setRooms(myRooms.data);
      setPublicRooms(availableRooms.data);
      setPlayingRooms(currentlyPlaying.data);
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        alert('Image size must be less than 10MB');
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

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      let imageUrl = createFormData.imageUrl;

      // Upload image if file is selected
      if (imageFile) {
        const uploadedUrl = await worshipAPI.uploadRoomImage(imageFile);
        imageUrl = uploadedUrl;
      }

      const response = await worshipAPI.createRoom({
        ...createFormData,
        imageUrl,
      });

      setShowCreateModal(false);
      setCreateFormData({
        name: '',
        description: '',
        imageUrl: '',
        isPrivate: false,
        maxParticipants: 50,
        skipThreshold: 0.5,
      });
      setImageFile(null);
      setImagePreview('');
      loadRooms();
      // Navigate to newly created room
      navigate(`/worship/${response.data.id}`);
    } catch (err) {
      console.error('Error creating room:', err);
      alert('Failed to create room. Please try again.');
    } finally {
      setCreateLoading(false);
    }
  };

  const renderRoom = (room: WorshipRoom, isJoinable: boolean = false) => (
    <div
      key={room.id}
      className={`worship-room-item ${selectedRoomId === room.id ? 'selected' : ''} ${isJoinable ? 'joinable' : ''}`}
      onClick={() => !isJoinable && handleRoomClick(room)}
    >
      <div className="room-thumbnail">
        {room.imageUrl ? (
          <img src={room.imageUrl} alt={room.name} />
        ) : (
          <div className="room-thumbnail-placeholder">
            {room.playbackStatus === PlaybackStatus.PLAYING ? '🎵' : '🎶'}
          </div>
        )}
        {room.playbackStatus === PlaybackStatus.PLAYING && (
          <div className="playing-indicator">
            <span className="pulse-dot"></span>
            <span className="pulse-text">LIVE</span>
          </div>
        )}
      </div>

      <div className="room-content">
        <div className="room-header">
          <h3>{room.name}</h3>
          {room.isPrivate && <span className="privacy-badge">🔒 Private</span>}
        </div>

        {room.description && <p className="room-description">{room.description}</p>}

        <div className="room-meta">
          <span className="room-status">
            {getStatusIcon(room.playbackStatus)} {formatPlaybackStatus(room.playbackStatus)}
          </span>
          <span className="room-participants">
            👥 {formatParticipantCount(room.participantCount)}
          </span>
          {room.maxParticipants && (
            <span className="room-capacity">
              / {room.maxParticipants}
            </span>
          )}
        </div>

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

        {isJoinable && (
          <div className="room-actions">
            <button
              onClick={(e) => handleJoinRoom(room.id, e)}
              className="join-room-button"
            >
              Join Room
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderCreateModal = () => (
    <div className="create-room-modal-overlay" onClick={() => setShowCreateModal(false)}>
      <div className="create-room-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={() => setShowCreateModal(false)}>
          ✕
        </button>
        <h2>Create Worship Room</h2>
        <form onSubmit={handleCreateRoom}>
          <div className="form-group">
            <label htmlFor="room-name">Room Name *</label>
            <input
              id="room-name"
              type="text"
              value={createFormData.name}
              onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
              placeholder="Sunday Worship, Youth Night, etc."
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

          <div className="modal-actions">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="cancel-button"
            >
              Cancel
            </button>
            <button type="submit" className="submit-button" disabled={createLoading}>
              {createLoading ? 'Creating...' : 'Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="worship-room-list loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading worship rooms...</p>
        </div>
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
            onClick={() => setActiveView('myRooms')}
            className={`nav-btn ${activeView === 'myRooms' ? 'active' : ''}`}
          >
            🎶 My Rooms
          </button>
          <button
            onClick={() => setActiveView('public')}
            className={`nav-btn ${activeView === 'public' ? 'active' : ''}`}
          >
            🌍 Public Rooms
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className={`nav-btn create-btn`}
          >
            ➕ Create Room
          </button>
        </div>
      </div>

      {activeView === 'playing' ? (
        <div className="rooms-section">
          <h3>Currently Playing</h3>
          {playingRooms.length === 0 ? (
            <div className="empty-state">
              <p>🎵 No rooms are currently playing</p>
              <p>Start a worship session or join a public room!</p>
              <button onClick={() => setActiveView('public')} className="primary-button">
                Browse Public Rooms
              </button>
            </div>
          ) : (
            <div className="rooms-grid">
              {playingRooms.map((room) => renderRoom(room))}
            </div>
          )}
        </div>
      ) : activeView === 'myRooms' ? (
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
      ) : (
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
              {publicRooms.map((room) => renderRoom(room, !room.isParticipant))}
            </div>
          )}
        </div>
      )}

      {showCreateModal && renderCreateModal()}
    </div>
  );
};

export default WorshipRoomList;
