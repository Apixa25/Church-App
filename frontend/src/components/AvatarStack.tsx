import React from 'react';
import { PrayerParticipant } from '../types/Prayer';

interface AvatarStackProps {
  participants: PrayerParticipant[];
  maxDisplay?: number;
  size?: 'small' | 'medium';
  onClick?: () => void;
}

const AvatarStack: React.FC<AvatarStackProps> = ({
  participants,
  maxDisplay = 4,
  size = 'small',
  onClick
}) => {
  const displayedParticipants = participants.slice(0, maxDisplay);
  const remainingCount = participants.length - maxDisplay;
  const avatarSize = size === 'small' ? 24 : 32;
  const overlap = size === 'small' ? 8 : 10;

  if (participants.length === 0) {
    return null;
  }

  return (
    <div
      className={`avatar-stack ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
      title={`${participants.length} people supporting this prayer`}
    >
      <div className="avatars-container">
        {displayedParticipants.map((participant, index) => (
          <div
            key={participant.userId}
            className="avatar-item"
            style={{
              zIndex: displayedParticipants.length - index,
              marginLeft: index === 0 ? 0 : -overlap,
            }}
            title={participant.userName}
          >
            {participant.userProfilePicUrl ? (
              <img
                src={participant.userProfilePicUrl}
                alt={participant.userName}
                className="avatar-image"
              />
            ) : (
              <div className="avatar-placeholder">
                {participant.userName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        ))}
        {remainingCount > 0 && (
          <div
            className="avatar-item overflow-count"
            style={{
              zIndex: 0,
              marginLeft: -overlap,
            }}
          >
            +{remainingCount}
          </div>
        )}
      </div>

      <style>{`
        .avatar-stack {
          display: inline-flex;
          align-items: center;
        }

        .avatar-stack.clickable {
          cursor: pointer;
        }

        .avatar-stack.clickable:hover .avatar-item {
          transform: translateY(-2px);
        }

        .avatars-container {
          display: flex;
          align-items: center;
        }

        .avatar-item {
          width: ${avatarSize}px;
          height: ${avatarSize}px;
          border-radius: 50%;
          border: 2px solid var(--bg-tertiary);
          position: relative;
          transition: transform var(--transition-base);
        }

        .avatar-image {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }

        .avatar-placeholder {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: var(--gradient-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: ${size === 'small' ? '0.7rem' : '0.85rem'};
        }

        .overflow-count {
          background: var(--bg-secondary);
          border: 2px solid var(--border-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${size === 'small' ? '0.65rem' : '0.75rem'};
          font-weight: 600;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
};

export default AvatarStack;
