import React from 'react';
import { FeedType } from '../types/Post';
import './FeedHeader.css';

interface FeedHeaderProps {
  feedType: FeedType;
  totalPosts: number;
  onRefresh: () => void;
  loading?: boolean;
}

const FeedHeader: React.FC<FeedHeaderProps> = ({
  feedType,
  totalPosts,
  onRefresh,
  loading = false
}) => {
  const getFeedTitle = (type: FeedType): string => {
    switch (type) {
      case FeedType.CHRONOLOGICAL:
        return 'Community Feed';
      case FeedType.TRENDING:
        return 'Trending Posts';
      case FeedType.FOR_YOU:
        return 'For You';
      default:
        return 'Community Feed';
    }
  };

  const getFeedDescription = (type: FeedType): string => {
    switch (type) {
      case FeedType.CHRONOLOGICAL:
        return 'See what\'s happening in your church community';
      case FeedType.TRENDING:
        return 'Popular posts from your community';
      case FeedType.FOR_YOU:
        return 'Posts we think you\'ll enjoy';
      default:
        return 'See what\'s happening in your church community';
    }
  };

  const getFeedIcon = (type: FeedType): string => {
    switch (type) {
      case FeedType.CHRONOLOGICAL:
        return '🏛️';
      case FeedType.TRENDING:
        return '🔥';
      case FeedType.FOR_YOU:
        return '✨';
      default:
        return '🏛️';
    }
  };

  const formatPostCount = (count: number): string => {
    if (count === 0) return 'No posts yet';
    if (count === 1) return '1 post';
    if (count < 1000) return `${count} posts`;
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K posts`;
    return `${(count / 1000000).toFixed(1)}M posts`;
  };

  const getLastUpdatedTime = (): string => {
    // In a real app, this would be the actual last update time
    // For now, we'll just show "Just now" when refreshed
    return 'Just now';
  };

  return (
    <div className="feed-header">
      <div className="feed-header-content">
        <div className="feed-title-section">
          <div className="feed-icon">
            {getFeedIcon(feedType)}
          </div>

          <div className="feed-text">
            <h1 className="feed-title">
              {getFeedTitle(feedType)}
            </h1>
            <p className="feed-description">
              {getFeedDescription(feedType)}
            </p>
          </div>
        </div>

        <div className="feed-stats">
          <div className="post-count">
            <span className="count-number">{formatPostCount(totalPosts)}</span>
          </div>

          <div className="last-updated">
            <span className="update-label">Last updated:</span>
            <span className="update-time">{getLastUpdatedTime()}</span>
          </div>
        </div>
      </div>

      <div className="feed-actions">
        <button
          className="refresh-button"
          onClick={onRefresh}
          disabled={loading}
          aria-label="Refresh feed"
        >
          {loading ? (
            <>
              <div className="refresh-spinner"></div>
              <span>Refreshing...</span>
            </>
          ) : (
            <>
              <span className="refresh-icon">🔄</span>
              <span>Refresh</span>
            </>
          )}
        </button>
      </div>

      {/* Progress indicator for loading */}
      {loading && (
        <div className="feed-loading-progress">
          <div className="progress-bar">
            <div className="progress-fill"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedHeader;
