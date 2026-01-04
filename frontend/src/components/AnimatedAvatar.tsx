import React from 'react';
import { WorshipAvatar } from '../types/Worship';
import './AnimatedAvatar.css';

interface AnimatedAvatarProps {
  avatar: WorshipAvatar;
  userName: string;
  showName?: boolean;
  size?: 'small' | 'medium' | 'large';
  isLeader?: boolean;
}

/**
 * AnimatedAvatar - Renders a plug.dj-style animated sprite avatar.
 * Uses CSS sprite sheet animation with the steps() timing function.
 *
 * The sprite sheet is a horizontal strip of animation frames.
 * CSS animates the background-position to show each frame in sequence.
 */
const AnimatedAvatar: React.FC<AnimatedAvatarProps> = ({
  avatar,
  userName,
  showName = true,
  size = 'medium',
  isLeader = false,
}) => {
  // Calculate dimensions based on size
  const sizeMultiplier = size === 'small' ? 0.75 : size === 'large' ? 1.5 : 1;
  const width = avatar.frameWidth * sizeMultiplier;
  const height = avatar.frameHeight * sizeMultiplier;
  const totalWidth = avatar.frameWidth * avatar.frameCount;

  // CSS custom properties for the animation
  const animationStyle = {
    '--frame-count': avatar.frameCount,
    '--frame-width': `${avatar.frameWidth}px`,
    '--animation-duration': `${avatar.animationDurationMs}ms`,
    '--total-width': `${totalWidth}px`,
    width: `${width}px`,
    height: `${height}px`,
    backgroundImage: `url(${avatar.spriteSheetUrl})`,
    backgroundSize: `${totalWidth * sizeMultiplier}px ${height}px`,
  } as React.CSSProperties;

  return (
    <div className={`animated-avatar-container ${size} ${isLeader ? 'leader' : ''}`}>
      <div
        className="animated-avatar-sprite"
        style={animationStyle}
        title={userName}
      />
      {showName && (
        <div className="animated-avatar-name">
          {isLeader && <span className="leader-crown">👑</span>}
          <span className="name-text">{userName}</span>
        </div>
      )}
    </div>
  );
};

export default AnimatedAvatar;
