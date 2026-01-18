import React, { useEffect, useRef } from 'react';
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
  const filtersOptionsRef = useRef<HTMLDivElement>(null);

  // 🔧 FIX: Allow wheel events on .filters-options to propagate to page scroll
  // Chrome may prevent wheel events from bubbling when they hit an element with overflow: hidden
  useEffect(() => {
    const element = filtersOptionsRef.current;
    if (!element) return;

    const handleWheel = (e: WheelEvent) => {
      // Don't prevent default - let the browser handle page scrolling
      // This allows wheel events to bubble up to the document for page scrolling
      // Only stop propagation if the element itself needs to scroll (which it doesn't)
    };

    element.addEventListener('wheel', handleWheel, { passive: true });
    return () => {
      element.removeEventListener('wheel', handleWheel);
    };
  }, []);
  const feedOptions: Array<{
    type: FeedType;
    label: string;
    description: string;
    icon: string | JSX.Element;
    color: string;
  }> = [
    {
      type: FeedType.CHRONOLOGICAL,
      label: 'Community',
      description: 'All Posts',
      icon: (
        <img 
          src="/app-logo.png" 
          alt="Community Feed" 
          className="filter-logo-icon"
          onError={(e) => {
            // Fallback to existing logo if app-logo.png doesn't exist
            const target = e.target as HTMLImageElement;
            if (target.src !== `${window.location.origin}/logo192.png`) {
              target.src = '/logo192.png';
            }
          }}
        />
      ),
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
      <div className="filters-options" ref={filtersOptionsRef}>
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
