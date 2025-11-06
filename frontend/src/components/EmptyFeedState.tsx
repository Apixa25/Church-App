import React from 'react';
import { FeedType } from '../types/Post';
import './EmptyFeedState.css';

interface EmptyFeedStateProps {
  feedType: FeedType;
  onCreatePost?: () => void;
  onRefresh?: () => void;
}

const EmptyFeedState: React.FC<EmptyFeedStateProps> = ({
  feedType,
  onCreatePost,
  onRefresh
}) => {
  const getEmptyStateContent = (type: FeedType) => {
    switch (type) {
      case FeedType.CHRONOLOGICAL:
        return {
          icon: '🌾',
          title: 'Welcome to Your Church Community!',
          subtitle: 'Your community feed is ready',
          message: 'Be the first to share something with your church family. Post a prayer request, share a testimony, or announce an upcoming event.',
          primaryAction: 'Share Something',
          secondaryAction: 'Refresh Feed'
        };

      case FeedType.TRENDING:
        return {
          icon: '🔥',
          title: 'No Trending Posts Yet',
          subtitle: 'Trending posts will appear here',
          message: 'As your community grows and people engage with posts, the most popular content will be highlighted here.',
          primaryAction: null,
          secondaryAction: 'Check Again Later'
        };

      case FeedType.FOR_YOU:
        return {
          icon: '✨',
          title: 'Personalized Feed Coming Soon',
          subtitle: 'Your personalized feed is being prepared',
          message: 'As you interact with posts and follow community members, we\'ll curate content just for you.',
          primaryAction: 'Explore Community',
          secondaryAction: 'Refresh Feed'
        };

      default:
        return {
          icon: '📝',
          title: 'No Posts to Show',
          subtitle: 'This feed is empty',
          message: 'There are no posts available in this feed at the moment.',
          primaryAction: null,
          secondaryAction: 'Refresh Feed'
        };
    }
  };

  const content = getEmptyStateContent(feedType);

  const handlePrimaryAction = () => {
    if (content.primaryAction && onCreatePost) {
      onCreatePost();
    }
  };

  const handleSecondaryAction = () => {
    if (content.secondaryAction && onRefresh) {
      onRefresh();
    }
  };

  return (
    <div className="empty-feed-state">
      <div className="empty-state-content">
        {/* Main Icon */}
        <div className="empty-state-icon">
          {content.icon}
        </div>

        {/* Title and Subtitle */}
        <div className="empty-state-text">
          <h2 className="empty-state-title">
            {content.title}
          </h2>
          <p className="empty-state-subtitle">
            {content.subtitle}
          </p>
          <p className="empty-state-message">
            {content.message}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="empty-state-actions">
          {content.primaryAction && (
            <button
              className="primary-action-button"
              onClick={handlePrimaryAction}
              aria-label={content.primaryAction}
            >
              {content.primaryAction}
            </button>
          )}

          {content.secondaryAction && (
            <button
              className="secondary-action-button"
              onClick={handleSecondaryAction}
              aria-label={content.secondaryAction}
            >
              {content.secondaryAction}
            </button>
          )}
        </div>

        {/* Church-themed decorative elements */}
        <div className="empty-state-decoration">
          <div className="decoration-element">🙏</div>
          <div className="decoration-element">✨</div>
          <div className="decoration-element">💝</div>
        </div>

        {/* Encouraging message */}
        <div className="empty-state-encouragement">
          <p>
            <strong>Remember:</strong> Your church community grows stronger when we share our faith,
            support each other through prayer, and celebrate God's work in our lives together.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmptyFeedState;
