import React, { useState, useEffect } from 'react';
import { getPostAnalytics } from '../services/postApi';
import './PostStatsModal.css';

interface PostStatsModalProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
}

const PostStatsModal: React.FC<PostStatsModalProps> = ({ postId, isOpen, onClose }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen && postId) {
      loadStats();
    } else {
      setStats(null);
      setError('');
    }
  }, [isOpen, postId]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getPostAnalytics(postId);
      setStats(data);
    } catch (err: any) {
      console.error('Error loading post stats:', err);
      setError('Failed to load post statistics');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content post-stats-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📊 Post Analytics</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="error-message">{error}</div>
          )}

          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <span>Loading statistics...</span>
            </div>
          ) : stats ? (
            <div className="post-stats-content">
              {/* Summary Stats */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">👁️</div>
                  <div className="stat-value">{stats.totalViews || 0}</div>
                  <div className="stat-label">Total Views</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">👥</div>
                  <div className="stat-value">{stats.uniqueViewers || 0}</div>
                  <div className="stat-label">Unique Viewers</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">❤️</div>
                  <div className="stat-value">{stats.likes || 0}</div>
                  <div className="stat-label">Likes</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">💬</div>
                  <div className="stat-value">{stats.comments || 0}</div>
                  <div className="stat-label">Comments</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">🔄</div>
                  <div className="stat-value">{stats.shares || 0}</div>
                  <div className="stat-label">Shares</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📈</div>
                  <div className="stat-value">{stats.engagementRate?.toFixed(1) || 0}%</div>
                  <div className="stat-label">Engagement Rate</div>
                </div>
              </div>

              {/* Time Period Stats */}
              <div className="time-period-stats">
                <h3>Views by Period</h3>
                <div className="period-grid">
                  <div className="period-item">
                    <span className="period-label">Today</span>
                    <span className="period-value">{stats.viewsToday || 0}</span>
                  </div>
                  <div className="period-item">
                    <span className="period-label">This Week</span>
                    <span className="period-value">{stats.viewsThisWeek || 0}</span>
                  </div>
                  <div className="period-item">
                    <span className="period-label">This Month</span>
                    <span className="period-value">{stats.viewsThisMonth || 0}</span>
                  </div>
                </div>
              </div>

              {/* Engagement Breakdown */}
              <div className="engagement-breakdown">
                <h3>Engagement Breakdown</h3>
                <div className="engagement-stats">
                  <div className="engagement-item">
                    <span className="engagement-label">Total Engagements</span>
                    <span className="engagement-value">{stats.totalEngagements || 0}</span>
                  </div>
                  <div className="engagement-item">
                    <span className="engagement-label">Engagement Rate</span>
                    <span className="engagement-value">{stats.engagementRate?.toFixed(2) || 0}%</span>
                  </div>
                </div>
              </div>

              {/* Post Info */}
              {stats.createdAt && (
                <div className="post-info">
                  <p>
                    <strong>Posted:</strong>{' '}
                    {new Date(stats.createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <p>No statistics available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostStatsModal;

