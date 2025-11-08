import React, { useState } from 'react';
import { worshipAPI } from '../services/worshipApi';
import {
  WorshipQueueEntry,
  VoteType,
  ParticipantRole,
  canAddToQueue,
  canVote,
  extractYouTubeVideoId,
} from '../types/Worship';
import './WorshipQueue.css';

interface WorshipQueueProps {
  roomId: string;
  queue: WorshipQueueEntry[];
  currentSong: WorshipQueueEntry | null;
  onQueueUpdate: () => void;
  userRole: ParticipantRole;
}

const WorshipQueue: React.FC<WorshipQueueProps> = ({
  roomId,
  queue,
  currentSong,
  onQueueUpdate,
  userRole,
}) => {
  const [showAddSong, setShowAddSong] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);

    try {
      const videoId = extractYouTubeVideoId(youtubeUrl);
      if (!videoId) {
        alert('Invalid YouTube URL. Please enter a valid YouTube video link.');
        return;
      }

      // Fetch video metadata from YouTube (in a real app, this would use YouTube Data API)
      // For now, we'll use a placeholder
      const videoTitle = `YouTube Video ${videoId}`;
      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

      const songData: any = {
        videoId,
        videoTitle,
        videoThumbnailUrl: thumbnailUrl,
      };
      // Don't include videoDuration if we don't have it - backend validation requires it to be positive if present

      console.log('Adding song to queue:', { roomId, songData });
      await worshipAPI.addToQueue(roomId, songData);

      setYoutubeUrl('');
      setShowAddSong(false);
      onQueueUpdate();
    } catch (err: any) {
      console.error('Error adding song:', err);
      console.error('Error response:', err.response?.data);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Failed to add song to queue';
      alert(errorMessage);
    } finally {
      setAddLoading(false);
    }
  };

  const handleVote = async (queueEntryId: string, voteType: VoteType) => {
    try {
      await worshipAPI.vote({
        queueEntryId,
        voteType,
      });
      onQueueUpdate();
    } catch (err: any) {
      console.error('Error voting:', err);
      alert(err.response?.data?.error || 'Failed to vote');
    }
  };

  const handleRemoveSong = async (queueEntryId: string) => {
    if (!window.confirm('Are you sure you want to remove this song from the queue?')) {
      return;
    }

    try {
      await worshipAPI.removeFromQueue(queueEntryId);
      onQueueUpdate();
    } catch (err: any) {
      console.error('Error removing song:', err);
      alert(err.response?.data?.error || 'Failed to remove song');
    }
  };

  const filteredQueue = queue.filter((entry) =>
    entry.videoTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.userName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="worship-queue">
      <div className="queue-header">
        <h3>Queue ({queue.length})</h3>
        <div className="queue-actions">
          {canAddToQueue(userRole) && (
            <button
              onClick={() => setShowAddSong(!showAddSong)}
              className="add-song-button"
            >
              ➕ Add Song
            </button>
          )}
        </div>
      </div>

      {showAddSong && (
        <div className="add-song-form">
          <form onSubmit={handleAddSong}>
            <div className="form-group">
              <label htmlFor="youtube-url">YouTube URL</label>
              <input
                id="youtube-url"
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                required
              />
              <small>Paste a YouTube video URL to add it to the queue</small>
            </div>
            <div className="form-actions">
              <button
                type="button"
                onClick={() => {
                  setShowAddSong(false);
                  setYoutubeUrl('');
                }}
                className="cancel-button"
              >
                Cancel
              </button>
              <button type="submit" className="submit-button" disabled={addLoading}>
                {addLoading ? 'Adding...' : 'Add to Queue'}
              </button>
            </div>
          </form>
        </div>
      )}

      {queue.length > 5 && (
        <div className="queue-search">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search queue..."
            className="search-input"
          />
        </div>
      )}

      <div className="queue-list">
        {filteredQueue.length === 0 ? (
          <div className="queue-empty">
            <p>🎵 Queue is empty</p>
            <p>Add songs to get started!</p>
          </div>
        ) : (
          filteredQueue.map((entry, index) => (
            <div
              key={entry.id}
              className={`queue-item ${entry.id === currentSong?.id ? 'current' : ''}`}
            >
              <div className="queue-item-position">
                {entry.id === currentSong?.id ? '▶️' : `${index + 1}`}
              </div>

              <div className="queue-item-thumbnail">
                {entry.videoThumbnailUrl ? (
                  <img src={entry.videoThumbnailUrl} alt={entry.videoTitle} />
                ) : (
                  <span>🎵</span>
                )}
              </div>

              <div className="queue-item-info">
                <h4>{entry.videoTitle}</h4>
                <div className="queue-item-meta">
                  <span>Added by {entry.userName}</span>
                  {entry.videoDuration && (
                    <>
                      <span>•</span>
                      <span>{Math.floor(entry.videoDuration / 60)}:{String(Math.floor(entry.videoDuration % 60)).padStart(2, '0')}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="queue-item-actions">
                {canVote(userRole) && entry.id !== currentSong?.id && (
                  <div className="vote-buttons">
                    <button
                      onClick={() => handleVote(entry.id, VoteType.UPVOTE)}
                      className={`vote-button upvote ${entry.userHasUpvoted ? 'active' : ''}`}
                      title="Upvote"
                    >
                      👍 {entry.upvoteCount}
                    </button>
                    <button
                      onClick={() => handleVote(entry.id, VoteType.SKIP)}
                      className={`vote-button skip ${entry.userHasVotedSkip ? 'active' : ''}`}
                      title="Vote to skip"
                    >
                      ⏭️ {entry.skipVoteCount}
                    </button>
                  </div>
                )}

                {entry.id === currentSong?.id && canVote(userRole) && (
                  <div className="vote-buttons">
                    <button
                      onClick={() => handleVote(entry.id, VoteType.SKIP)}
                      className={`vote-button skip ${entry.userHasVotedSkip ? 'active' : ''}`}
                      title="Vote to skip"
                    >
                      ⏭️ Skip ({entry.skipVoteCount})
                    </button>
                  </div>
                )}

                {(userRole === ParticipantRole.MODERATOR ||
                  userRole === ParticipantRole.LEADER) && (
                  <button
                    onClick={() => handleRemoveSong(entry.id)}
                    className="remove-button"
                    title="Remove from queue"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default WorshipQueue;
