import React, { useState, useEffect } from 'react';
import {
  PrayerRequest,
  InteractionType,
  PrayerParticipant,
  PRAYER_CATEGORY_LABELS,
  PRAYER_CATEGORY_COLORS,
  PRAYER_STATUS_LABELS,
  PRAYER_STATUS_COLORS,
  INTERACTION_TYPE_LABELS
} from '../types/Prayer';
import { formatRelativeDate } from '../utils/dateUtils';
import { prayerInteractionAPI, handleApiError } from '../services/prayerApi';
import { useAuth } from '../contexts/AuthContext';
import ClickableAvatar from './ClickableAvatar';
import AvatarStack from './AvatarStack';
import { getImageUrlWithFallback } from '../utils/imageUrlUtils';

interface PrayerRequestCardProps {
  prayer: PrayerRequest;
  onEdit?: (prayer: PrayerRequest) => void;
  onDelete?: (prayerId: string) => void;
  onViewDetails?: (prayer: PrayerRequest) => void;
  showActions?: boolean;
  compact?: boolean;
}

const PrayerRequestCard: React.FC<PrayerRequestCardProps> = ({
  prayer,
  onEdit,
  onDelete,
  onViewDetails,
  showActions = true,
  compact = false
}) => {
  const { user } = useAuth();
  const [userInteractions, setUserInteractions] = useState<Record<InteractionType, boolean>>({} as Record<InteractionType, boolean>);
  const [participants, setParticipants] = useState<PrayerParticipant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fix owner check: only compare UUIDs (not email to UUID)
  const isOwner = user?.userId === prayer.userId;
  const isAdmin = user?.role === 'PLATFORM_ADMIN' || user?.role === 'MODERATOR';
  const isModerator = user?.role === 'MODERATOR';
  const canDelete = isOwner || isAdmin || isModerator;
  const categoryColor = PRAYER_CATEGORY_COLORS[prayer.category];
  const statusColor = PRAYER_STATUS_COLORS[prayer.status];

  // Load user interactions for this prayer
  useEffect(() => {
    const loadUserInteractions = async () => {
      if (!user) return;

      try {
        const interactions: Record<InteractionType, boolean> = {} as Record<InteractionType, boolean>;
        
        // Check each interaction type
        const interactionTypes: InteractionType[] = ['PRAY', 'ENCOURAGE', 'AMEN', 'HEART', 'PRAISE'];
        
        await Promise.all(
          interactionTypes.map(async (type) => {
            try {
              const response = await prayerInteractionAPI.checkUserInteraction(prayer.id, type);
              interactions[type] = response.data.hasInteracted;
            } catch (err) {
              interactions[type] = false;
            }
          })
        );

        setUserInteractions(interactions);
      } catch (err) {
        console.error('Error loading user interactions:', err);
      }
    };

    loadUserInteractions();
  }, [prayer.id, user]);

  // Load participants for avatar stack
  useEffect(() => {
    const loadParticipants = async () => {
      try {
        const response = await prayerInteractionAPI.getParticipants(prayer.id);
        setParticipants(response.data);
      } catch (err) {
        console.error('Error loading participants:', err);
      }
    };

    loadParticipants();
  }, [prayer.id]);

  const handleInteraction = async (type: InteractionType) => {
    if (!user || loading) return;

    setLoading(true);
    setError(null);

    try {
      await prayerInteractionAPI.createInteraction({
        prayerRequestId: prayer.id,
        type,
        content: undefined
      });

      // Update local state - toggle the interaction
      setUserInteractions(prev => ({
        ...prev,
        [type]: !prev[type]
      }));

      // Update interaction counts in the prayer object if available
      if (prayer.interactionSummary) {
        const currentCount = prayer.interactionSummary.interactionCounts[type] || 0;
        prayer.interactionSummary.interactionCounts[type] = userInteractions[type] 
          ? Math.max(0, currentCount - 1)  // Remove interaction
          : currentCount + 1;              // Add interaction
          
        // Update total interactions count
        prayer.interactionSummary.totalInteractions = Object.values(prayer.interactionSummary.interactionCounts)
          .reduce((total, count) => total + count, 0);
      }
    } catch (err: any) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  // Use the robust date utility function
  const formatDate = (dateString: string | number[]) => {
    return formatRelativeDate(dateString);
  };

  const getInteractionCount = (type: InteractionType): number => {
    return prayer.interactionSummary?.interactionCounts[type] || 0;
  };

  return (
    <div className={`prayer-card ${compact ? 'compact' : ''}`}>
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <div className="prayer-header">
        <div className="prayer-author">
          <ClickableAvatar
            userId={prayer.userId}
            profilePicUrl={prayer.userProfilePicUrl}
            userName={prayer.userName}
            size="medium"
            isAnonymous={prayer.isAnonymous}
          />

          <div className="author-info">
            <span className="author-name">
              {prayer.isAnonymous ? 'Anonymous Request' : prayer.userName}
            </span>
            <span className="prayer-time">{formatDate(prayer.createdAt)}</span>
          </div>
        </div>

        {showActions && canDelete && (
          <div className="prayer-actions">
            {onEdit && isOwner && (
              <button 
                className="action-btn edit-btn"
                onClick={() => onEdit(prayer)}
                title="Edit prayer"
              >
                ✏️
              </button>
            )}
            {onDelete && (
              <button 
                className="action-btn delete-btn"
                onClick={() => onDelete(prayer.id)}
                title={(isAdmin || isModerator) && !isOwner ? "Delete prayer (Admin)" : "Delete prayer"}
              >
                🗑️
              </button>
            )}
          </div>
        )}
      </div>

      <div className="prayer-content">
        <div className="prayer-meta">
          <span 
            className="category-tag"
            style={{ backgroundColor: categoryColor }}
          >
            {PRAYER_CATEGORY_LABELS[prayer.category]}
          </span>
          
          <span 
            className="status-tag"
            style={{ backgroundColor: statusColor }}
          >
            {PRAYER_STATUS_LABELS[prayer.status]}
          </span>
        </div>

        <h3 className="prayer-title">{prayer.title}</h3>
        
        {prayer.imageUrl && (() => {
          const { primary, fallback } = getImageUrlWithFallback(prayer.imageUrl);
          return (
            <div className="prayer-image-container">
              <img 
                src={primary} 
                alt={prayer.title}
                className="prayer-image"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  // Try fallback URL if primary failed
                  if (fallback && fallback !== primary && img.src === primary) {
                    console.warn('⚠️ CloudFront URL failed, trying S3 fallback:', {
                      primary,
                      fallback,
                      prayerId: prayer.id
                    });
                    img.src = fallback;
                  } else {
                    console.error('❌ Failed to load prayer image (both URLs failed):', {
                      primary,
                      fallback,
                      prayerId: prayer.id,
                      currentSrc: img.src
                    });
                    // Hide broken image after trying both URLs
                    img.style.display = 'none';
                  }
                }}
                onLoad={(e) => {
                  console.log('✅ Prayer image loaded successfully:', {
                    url: (e.target as HTMLImageElement).src,
                    prayerId: prayer.id
                  });
                }}
              />
            </div>
          );
        })()}
        
        {prayer.description && !compact && (
          <p className="prayer-description">{prayer.description}</p>
        )}

        {compact && prayer.description && (
          <p className="prayer-description truncated">
            {prayer.description.length > 100 
              ? `${prayer.description.substring(0, 100)}...`
              : prayer.description
            }
          </p>
        )}
      </div>

      <div className="prayer-interactions">
        <div className="interaction-buttons">
          {(['PRAY', 'ENCOURAGE', 'AMEN', 'HEART', 'PRAISE'] as InteractionType[]).map((type) => {
            const typeInfo = INTERACTION_TYPE_LABELS[type];
            const count = getInteractionCount(type);
            const isActive = userInteractions[type];
            
            return (
              <button
                key={type}
                className={`interaction-btn ${isActive ? 'active' : ''}`}
                onClick={() => handleInteraction(type)}
                disabled={loading}
                title={`${typeInfo.label} for this prayer`}
              >
                <span className="interaction-emoji">{typeInfo.emoji}</span>
                {count > 0 && <span className="interaction-count">{count}</span>}
              </button>
            );
          })}
        </div>

        <div className="prayer-stats">
          {prayer.interactionSummary && (
            <span className="stat">
              💬 {prayer.interactionSummary.totalComments} comments
            </span>
          )}

          <div
            className="participants-preview"
            onClick={() => onViewDetails?.(prayer)}
            title="Click to see who's praying"
          >
            <AvatarStack
              participants={participants}
              maxDisplay={4}
              size="small"
            />
            {prayer.interactionSummary && prayer.interactionSummary.uniqueParticipants > 0 && (
              <span className="participant-count">
                {prayer.interactionSummary.uniqueParticipants} praying
              </span>
            )}
          </div>

          {onViewDetails && (
            <button
              className="view-details-btn"
              onClick={() => onViewDetails(prayer)}
            >
              View Details →
            </button>
          )}
        </div>
      </div>

      <style>{`
        .prayer-card {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          border-radius: var(--border-radius-md);
          box-shadow: var(--shadow-sm);
          padding: 1.5rem;
          margin-bottom: 1rem;
          transition: all var(--transition-base);
        }

        .prayer-card:hover {
          box-shadow: var(--shadow-md), var(--glow-blue);
          transform: translateY(-2px);
          border-color: var(--border-glow);
        }

        .prayer-card.compact {
          padding: 1rem;
        }

        .error-banner {
          background-color: rgba(239, 68, 68, 0.2);
          border: 1px solid var(--error);
          color: var(--error);
          padding: 0.5rem;
          border-radius: var(--border-radius-sm);
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
        }

        .prayer-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .prayer-author {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .author-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
        }

        .author-avatar.placeholder {
          background: var(--gradient-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 1.2rem;
        }

        .author-info {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .author-name {
          font-weight: 600;
          color: var(--text-primary) !important;
          font-size: 0.95rem;
        }

        .prayer-time {
          font-size: 0.8rem;
          color: var(--text-tertiary);
        }

        .prayer-actions {
          display: flex;
          gap: 0.5rem;
        }

        .action-btn {
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          padding: 0.5rem;
          border-radius: var(--border-radius-sm);
          cursor: pointer;
          opacity: 0.7;
          transition: all var(--transition-base);
          color: var(--text-secondary);
        }

        .action-btn:hover {
          opacity: 1;
          background: var(--bg-elevated);
          border-color: var(--border-glow);
          color: var(--text-primary);
        }

        .prayer-content {
          margin-bottom: 1rem;
        }

        .prayer-meta {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .category-tag, .status-tag {
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
          border-radius: var(--border-radius-pill);
          color: white;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .prayer-title {
          margin: 0 0 0.5rem 0;
          color: var(--text-primary);
          font-size: 1.1rem;
          line-height: 1.4;
          font-weight: 600;
        }

        .prayer-image-container {
          margin: 0.75rem 0;
          border-radius: var(--border-radius-md);
          overflow: hidden;
          border: 1px solid var(--border-primary);
        }

        .prayer-image {
          width: 100%;
          max-height: 400px;
          object-fit: cover;
          display: block;
          cursor: pointer;
          transition: transform var(--transition-base);
        }

        .prayer-image:hover {
          transform: scale(1.02);
        }

        .prayer-description {
          margin: 0;
          color: var(--text-secondary);
          line-height: 1.5;
          font-size: 0.95rem;
        }

        .prayer-description.truncated {
          color: var(--text-tertiary);
          font-style: italic;
        }

        .prayer-interactions {
          border-top: 1px solid var(--border-primary);
          padding-top: 1rem;
        }

        .interaction-buttons {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          flex-wrap: wrap;
        }

        .interaction-btn {
          background: var(--bg-secondary);
          border: 2px solid var(--border-primary);
          border-radius: var(--border-radius-pill);
          padding: 0.4rem 0.8rem;
          cursor: pointer;
          transition: all var(--transition-base);
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .interaction-btn:hover:not(:disabled) {
          background: var(--bg-tertiary);
          border-color: var(--border-glow);
          color: var(--text-primary);
        }

        .interaction-btn.active {
          background: var(--accent-primary);
          border-color: var(--accent-primary);
          color: white;
          box-shadow: 0 0 12px var(--button-primary-glow);
        }

        .interaction-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .interaction-emoji {
          font-size: 1rem;
        }

        .interaction-count {
          font-size: 0.8rem;
          font-weight: 600;
        }

        .prayer-stats {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .stat {
          font-size: 0.8rem;
          color: var(--text-tertiary);
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .participants-preview {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          padding: 0.25rem 0.5rem;
          border-radius: var(--border-radius-sm);
          transition: background var(--transition-base);
        }

        .participants-preview:hover {
          background: var(--bg-secondary);
        }

        .participant-count {
          font-size: 0.8rem;
          color: var(--text-tertiary);
          font-weight: 500;
        }

        .view-details-btn {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border: none;
          color: white;
          font-size: 0.85rem;
          cursor: pointer;
          font-weight: 600;
          padding: 0.5rem 1rem;
          border-radius: var(--border-radius-pill);
          transition: all var(--transition-base);
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
        }

        .view-details-btn:hover {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }

        .view-details-btn:active {
          transform: translateY(0);
        }

        @media (max-width: 768px) {
          .prayer-card {
            padding: 1rem;
          }

          .prayer-header {
            flex-direction: column;
            gap: 0.75rem;
          }

          .prayer-actions {
            align-self: flex-end;
          }

          .interaction-buttons {
            justify-content: center;
          }

          .prayer-stats {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
};

export default PrayerRequestCard;