import React from 'react';
import { FeedType } from '../types/Post';
import './FeedFilters.css';

interface FeedFiltersProps {
  currentFeedType: FeedType;
  onFeedTypeChange: (feedType: FeedType) => void;
  disabled?: boolean;
}

const FeedFilters: React.FC<FeedFiltersProps> = ({
  currentFeedType,
  onFeedTypeChange,
  disabled = false
}) => {
  const feedOptions = [
    {
      type: FeedType.CHRONOLOGICAL,
      label: 'Community',
      description: 'All Posts',
      icon: '🌾',
      color: '#2196f3'
    },
    {
      type: FeedType.FOLLOWING,
      label: 'Following',
      description: 'People You Follow',
      icon: '👥',
      color: '#4caf50'
    },
    {
      type: FeedType.TRENDING,
      label: 'Trending',
      description: 'Popular (7 Days)',
      icon: '🔥',
      color: '#ff9800'
    }
  ];

  const handleFeedChange = (feedType: FeedType) => {
    if (disabled || feedType === currentFeedType) return;
    onFeedTypeChange(feedType);
  };

  return (
    <div className="feed-filters">
      <div className="filters-options">
        {feedOptions.map((option) => (
          <button
            key={option.type}
            className={`filter-option ${currentFeedType === option.type ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
            onClick={() => handleFeedChange(option.type)}
            disabled={disabled}
            style={{
              '--filter-color': option.color
            } as React.CSSProperties}
            aria-label={`Switch to ${option.label} feed`}
          >
            <div className="filter-icon">
              {option.icon}
            </div>

            <div className="filter-content">
              <div className="filter-label">
                {option.label}
              </div>
              <div className="filter-description">
                {option.description}
              </div>
            </div>

            {currentFeedType === option.type && (
              <div className="filter-indicator">
                <div className="indicator-dot"></div>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Loading overlay */}
      {disabled && (
        <div className="filters-loading-overlay">
          <div className="loading-spinner"></div>
          <span>Loading...</span>
        </div>
      )}
    </div>
  );
};

export default FeedFilters;
