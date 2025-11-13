import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ClickableAvatar.css';

interface ClickableAvatarProps {
  userId?: string;
  profilePicUrl?: string;
  userName: string;
  size?: 'small' | 'medium' | 'large';
  isAnonymous?: boolean;
  disabled?: boolean;
  className?: string;
}

const ClickableAvatar: React.FC<ClickableAvatarProps> = ({
  userId,
  profilePicUrl,
  userName,
  size = 'medium',
  isAnonymous = false,
  disabled = false,
  className = '',
}) => {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent parent click handlers from firing

    if (disabled || isAnonymous || !userId) {
      return;
    }

    navigate(`/profile/${userId}`);
  };

  const getInitial = () => {
    if (isAnonymous) {
      return '🙏';
    }
    return userName ? userName.charAt(0).toUpperCase() : '?';
  };

  const isClickable = !disabled && !isAnonymous && userId;

  return (
    <div
      className={`clickable-avatar ${size} ${isClickable ? 'interactive' : 'non-interactive'} ${className}`}
      onClick={handleClick}
      role={isClickable ? 'button' : 'img'}
      tabIndex={isClickable ? 0 : -1}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick(e as any);
        }
      }}
      aria-label={isAnonymous ? 'Anonymous user' : `View ${userName}'s profile`}
      title={isAnonymous ? 'Anonymous' : userName}
    >
      {profilePicUrl ? (
        <img
          src={profilePicUrl}
          alt={isAnonymous ? 'Anonymous' : userName}
          className="avatar-image"
        />
      ) : (
        <div className="avatar-placeholder">
          {getInitial()}
        </div>
      )}
    </div>
  );
};

export default ClickableAvatar;
