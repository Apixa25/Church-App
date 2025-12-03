import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../contexts/WebSocketContext';
import './ClickableAvatar.css';

interface ClickableAvatarProps {
  userId?: string;
  profilePicUrl?: string;
  userName: string;
  size?: 'small' | 'medium' | 'large';
  isAnonymous?: boolean;
  disabled?: boolean;
  className?: string;
  showConnectionStatus?: boolean; // Show WebSocket connection status indicator
}

const ClickableAvatar: React.FC<ClickableAvatarProps> = ({
  userId,
  profilePicUrl,
  userName,
  size = 'medium',
  isAnonymous = false,
  disabled = false,
  className = '',
  showConnectionStatus = false,
}) => {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);
  
  // Reset image error when profilePicUrl changes
  useEffect(() => {
    setImageError(false);
  }, [profilePicUrl]);
  
  // Use WebSocket hook - must be called unconditionally (React hooks rule)
  // Note: This requires component to be used inside WebSocketProvider
  // If used outside provider, this will throw an error (expected behavior)
  const wsContext = useWebSocket();
  
  // Only use connection status if showConnectionStatus is true
  const isConnected = showConnectionStatus ? wsContext.isConnected : false;
  const connectionStatus = showConnectionStatus ? wsContext.connectionStatus : { reconnectAttempts: -1 };

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
      {profilePicUrl && !imageError ? (
        <img
          src={profilePicUrl}
          alt={isAnonymous ? 'Anonymous' : userName}
          className="avatar-image"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          onError={(e) => {
            // 🛡️ Fallback: If Google OAuth image fails to load, show placeholder
            // This handles cases where:
            // - Google image URL is invalid/expired
            // - CORS issues prevent loading
            // - Network errors
            console.warn('⚠️ Profile image failed to load, falling back to placeholder:', profilePicUrl);
            setImageError(true);
          }}
        />
      ) : (
        <div className="avatar-placeholder">
          {getInitial()}
        </div>
      )}
      {showConnectionStatus && (
        <div 
          className={`connection-status-indicator ${isConnected ? 'connected' : 'disconnected'}`}
          title={isConnected ? 'WebSocket Connected' : 'WebSocket Disconnected'}
        />
      )}
    </div>
  );
};

export default ClickableAvatar;
