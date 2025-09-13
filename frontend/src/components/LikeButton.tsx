import React, { useState, useEffect } from 'react';
import './LikeButton.css';

interface LikeButtonProps {
  isLiked: boolean;
  likesCount: number;
  onLikeToggle: () => Promise<void>;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  showCount?: boolean;
  variant?: 'default' | 'minimal' | 'animated';
}

const LikeButton: React.FC<LikeButtonProps> = ({
  isLiked,
  likesCount,
  onLikeToggle,
  disabled = false,
  size = 'medium',
  showCount = true,
  variant = 'default'
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);

    try {
      // Trigger animation for like action
      if (!isLiked) {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 600);
      }

      await onLikeToggle();
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatLikesCount = (count: number): string => {
    if (count === 0) return '';
    if (count < 1000) return count.toString();
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
    return `${(count / 1000000).toFixed(1)}M`;
  };

  const getSizeClass = () => {
    switch (size) {
      case 'small': return 'like-button-small';
      case 'large': return 'like-button-large';
      default: return 'like-button-medium';
    }
  };

  const getVariantClass = () => {
    switch (variant) {
      case 'minimal': return 'like-button-minimal';
      case 'animated': return 'like-button-animated';
      default: return 'like-button-default';
    }
  };

  return (
    <button
      className={`like-button ${getSizeClass()} ${getVariantClass()} ${isLiked ? 'liked' : ''} ${isAnimating ? 'animating' : ''} ${isLoading ? 'loading' : ''}`}
      onClick={handleClick}
      disabled={disabled || isLoading}
      aria-label={isLiked ? `Unlike (${likesCount} likes)` : `Like (${likesCount} likes)`}
      aria-pressed={isLiked}
    >
      {/* Heart Icon */}
      <span className="like-icon" role="img" aria-hidden="true">
        {isLiked ? '❤️' : '🤍'}
      </span>

      {/* Animated Heart Particles */}
      {variant === 'animated' && isAnimating && (
        <div className="heart-particles">
          <span className="particle">💖</span>
          <span className="particle">💕</span>
          <span className="particle">💗</span>
          <span className="particle">💓</span>
        </div>
      )}

      {/* Loading Spinner */}
      {isLoading && (
        <div className="like-spinner"></div>
      )}

      {/* Like Count */}
      {showCount && likesCount > 0 && (
        <span className="like-count">
          {formatLikesCount(likesCount)}
        </span>
      )}

      {/* Ripple Effect */}
      <span className="like-ripple"></span>
    </button>
  );
};

export default LikeButton;
