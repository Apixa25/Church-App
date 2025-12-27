import React, { useState, useEffect, useCallback } from 'react';
import { worshipAPI } from '../services/worshipApi';
import { WorshipPlaylist, WorshipPlaylistEntry, WorshipPlaylistEntryRequest } from '../types/Worship';
import LoadingSpinner from './LoadingSpinner';
import './PlaylistEditor.css';

interface PlaylistEditorProps {
  playlistId?: string;
  onClose: () => void;
  onSave?: (playlist: WorshipPlaylist) => void;
}

interface VideoSearchResult {
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  duration?: number;
}

const PlaylistEditor: React.FC<PlaylistEditorProps> = ({
  playlistId,
  onClose,
  onSave,
}) => {
  const [playlist, setPlaylist] = useState<WorshipPlaylist | null>(null);
  const [entries, setEntries] = useState<WorshipPlaylistEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  // Add video state
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [addingVideo, setAddingVideo] = useState(false);

  // Load existing playlist
  useEffect(() => {
    if (playlistId) {
      loadPlaylist();
    }
  }, [playlistId]);

  const loadPlaylist = async () => {
    if (!playlistId) return;

    try {
      setLoading(true);
      const [playlistRes, entriesRes] = await Promise.all([
        worshipAPI.getPlaylist(playlistId),
        worshipAPI.getPlaylistEntries(playlistId),
      ]);

      setPlaylist(playlistRes.data);
      setEntries(entriesRes.data);
      setName(playlistRes.data.name);
      setDescription(playlistRes.data.description || '');
      setIsPublic(playlistRes.data.isPublic);
    } catch (err) {
      console.error('Error loading playlist:', err);
      setError('Failed to load playlist');
    } finally {
      setLoading(false);
    }
  };

  // Extract video ID from YouTube URL
  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
      /youtube\.com\/live\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  };

  // Generate YouTube thumbnail
  const getThumbnail = (videoId: string): string => {
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  };

  const handleAddVideo = async () => {
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      alert('Please enter a valid YouTube URL');
      return;
    }

    if (!playlistId) {
      // If no playlist exists yet, we need to create it first
      alert('Please save the playlist first before adding videos');
      return;
    }

    try {
      setAddingVideo(true);

      const entryData: WorshipPlaylistEntryRequest = {
        videoId,
        videoTitle: videoTitle || `Video ${videoId}`,
        videoThumbnail: getThumbnail(videoId),
        position: entries.length,
      };

      const response = await worshipAPI.addPlaylistEntry(playlistId, entryData);
      setEntries([...entries, response.data]);
      setVideoUrl('');
      setVideoTitle('');
    } catch (err) {
      console.error('Error adding video:', err);
      alert('Failed to add video. Please try again.');
    } finally {
      setAddingVideo(false);
    }
  };

  const handleRemoveEntry = async (entryId: string) => {
    try {
      await worshipAPI.removePlaylistEntry(entryId);
      setEntries(entries.filter(e => e.id !== entryId));
    } catch (err) {
      console.error('Error removing entry:', err);
      alert('Failed to remove video. Please try again.');
    }
  };

  const handleMoveEntry = async (entryId: string, direction: 'up' | 'down') => {
    const index = entries.findIndex(e => e.id === entryId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= entries.length) return;

    try {
      await worshipAPI.updateEntryPosition(entryId, newIndex);

      // Reorder locally
      const newEntries = [...entries];
      const [removed] = newEntries.splice(index, 1);
      newEntries.splice(newIndex, 0, removed);
      setEntries(newEntries);
    } catch (err) {
      console.error('Error moving entry:', err);
      alert('Failed to move video. Please try again.');
    }
  };

  const handleSavePlaylist = async () => {
    if (!name.trim()) {
      alert('Please enter a playlist name');
      return;
    }

    try {
      setSaving(true);

      const playlistData = {
        name: name.trim(),
        description: description.trim(),
        isPublic,
      };

      let savedPlaylist: WorshipPlaylist;

      if (playlistId) {
        const response = await worshipAPI.updatePlaylist(playlistId, playlistData);
        savedPlaylist = response.data;
      } else {
        const response = await worshipAPI.createPlaylist(playlistData);
        savedPlaylist = response.data;
      }

      if (onSave) {
        onSave(savedPlaylist);
      }

      onClose();
    } catch (err) {
      console.error('Error saving playlist:', err);
      alert('Failed to save playlist. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="playlist-editor-overlay">
        <div className="playlist-editor-modal">
          <LoadingSpinner type="multi-ring" size="medium" text="Loading playlist..." />
        </div>
      </div>
    );
  }

  return (
    <div className="playlist-editor-overlay" onClick={onClose}>
      <div className="playlist-editor-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          &times;
        </button>

        <h2>{playlistId ? 'Edit Playlist' : 'Create Playlist'}</h2>

        {error && (
          <div className="error-message">{error}</div>
        )}

        <div className="playlist-form">
          {/* Playlist Details */}
          <div className="form-section">
            <h3>Playlist Details</h3>

            <div className="form-group">
              <label htmlFor="playlist-name">Name *</label>
              <input
                id="playlist-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter playlist name..."
                maxLength={100}
              />
            </div>

            <div className="form-group">
              <label htmlFor="playlist-description">Description</label>
              <textarea
                id="playlist-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your playlist..."
                rows={3}
                maxLength={500}
              />
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                <span>Make this playlist public</span>
              </label>
            </div>
          </div>

          {/* Add Video Section */}
          {playlistId && (
            <div className="form-section">
              <h3>Add Video</h3>

              <div className="add-video-form">
                <div className="form-group">
                  <label htmlFor="video-url">YouTube URL</label>
                  <input
                    id="video-url"
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="video-title">Video Title (optional)</label>
                  <input
                    id="video-title"
                    type="text"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    placeholder="Enter a custom title..."
                    maxLength={200}
                  />
                </div>

                <button
                  type="button"
                  className="add-video-btn"
                  onClick={handleAddVideo}
                  disabled={addingVideo || !videoUrl}
                >
                  {addingVideo ? 'Adding...' : 'Add Video'}
                </button>
              </div>
            </div>
          )}

          {/* Playlist Entries */}
          {playlistId && (
            <div className="form-section">
              <h3>Videos ({entries.length})</h3>

              {entries.length === 0 ? (
                <div className="empty-playlist">
                  <p>No videos in this playlist yet.</p>
                  <p>Add videos using the form above.</p>
                </div>
              ) : (
                <div className="playlist-entries">
                  {entries.map((entry, index) => (
                    <div key={entry.id} className="playlist-entry">
                      <span className="entry-position">{index + 1}</span>

                      <div className="entry-thumbnail">
                        {entry.videoThumbnail ? (
                          <img src={entry.videoThumbnail} alt={entry.videoTitle} />
                        ) : (
                          <div className="thumbnail-placeholder">🎵</div>
                        )}
                      </div>

                      <div className="entry-info">
                        <span className="entry-title">{entry.videoTitle}</span>
                        <span className="entry-duration">{formatDuration(entry.videoDuration)}</span>
                      </div>

                      <div className="entry-actions">
                        <button
                          className="move-btn"
                          onClick={() => handleMoveEntry(entry.id, 'up')}
                          disabled={index === 0}
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          className="move-btn"
                          onClick={() => handleMoveEntry(entry.id, 'down')}
                          disabled={index === entries.length - 1}
                          title="Move down"
                        >
                          ↓
                        </button>
                        <button
                          className="remove-btn"
                          onClick={() => handleRemoveEntry(entry.id)}
                          title="Remove"
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="cancel-button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="save-button"
            onClick={handleSavePlaylist}
            disabled={saving || !name.trim()}
          >
            {saving ? 'Saving...' : playlistId ? 'Save Changes' : 'Create Playlist'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlaylistEditor;
