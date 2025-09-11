import React, { useState, useEffect } from 'react';
import { 
  PrayerRequest, 
  InteractionType,
  PRAYER_CATEGORY_LABELS,
  PRAYER_CATEGORY_COLORS,
  PRAYER_STATUS_LABELS,
  PRAYER_STATUS_COLORS,
  INTERACTION_TYPE_LABELS
} from '../types/Prayer';
import { prayerInteractionAPI, handleApiError } from '../services/prayerApi';
import { useAuth } from '../contexts/AuthContext';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwner = user?.email === prayer.userId || user?.userId === prayer.userId;
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

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      const now = new Date();
      const diffTime = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      return 'Invalid date';
    }
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
          {prayer.userProfilePicUrl && !prayer.isAnonymous ? (
            <img 
              src={prayer.userProfilePicUrl} 
              alt={prayer.userName}
              className="author-avatar"
            />
          ) : (
            <div className="author-avatar placeholder">
              {prayer.isAnonymous ? '🙏' : prayer.userName.charAt(0).toUpperCase()}
            </div>
          )}
          
          <div className="author-info">
            <span className="author-name">
              {prayer.isAnonymous ? 'Anonymous Request' : prayer.userName}
            </span>
            <span className="prayer-time">{formatDate(prayer.createdAt)}</span>
          </div>
        </div>

        {showActions && isOwner && (
          <div className="prayer-actions">
            {onEdit && (
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
                title="Delete prayer"
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
            <>
              <span className="stat">
                💬 {prayer.interactionSummary.totalComments} comments
              </span>
              <span className="stat">
                👥 {prayer.interactionSummary.uniqueParticipants} people
              </span>
            </>
          )}
          
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
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          padding: 1.5rem;
          margin-bottom: 1rem;
          transition: all 0.2s ease;
          border: 1px solid #e1e8ed;
        }

        .prayer-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transform: translateY(-2px);
        }

        .prayer-card.compact {
          padding: 1rem;
        }

        .error-banner {
          background-color: #fee;
          border: 1px solid #fcc;
          color: #c33;
          padding: 0.5rem;
          border-radius: 6px;
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
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
          color: #2c3e50;
          font-size: 0.95rem;
        }

        .prayer-time {
          font-size: 0.8rem;
          color: #7f8c8d;
        }

        .prayer-actions {
          display: flex;
          gap: 0.5rem;
        }

        .action-btn {
          background: none;
          border: none;
          padding: 0.5rem;
          border-radius: 6px;
          cursor: pointer;
          opacity: 0.7;
          transition: all 0.2s ease;
        }

        .action-btn:hover {
          opacity: 1;
          background-color: #f8f9fa;
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
          border-radius: 12px;
          color: white;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .prayer-title {
          margin: 0 0 0.5rem 0;
          color: #2c3e50;
          font-size: 1.1rem;
          line-height: 1.4;
          font-weight: 600;
        }

        .prayer-description {
          margin: 0;
          color: #34495e;
          line-height: 1.5;
          font-size: 0.95rem;
        }

        .prayer-description.truncated {
          color: #7f8c8d;
          font-style: italic;
        }

        .prayer-interactions {
          border-top: 1px solid #e1e8ed;
          padding-top: 1rem;
        }

        .interaction-buttons {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          flex-wrap: wrap;
        }

        .interaction-btn {
          background: #f8f9fa;
          border: 2px solid #e9ecef;
          border-radius: 20px;
          padding: 0.4rem 0.8rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .interaction-btn:hover:not(:disabled) {
          background: #e9ecef;
          border-color: #dee2e6;
        }

        .interaction-btn.active {
          background: #3498db;
          border-color: #3498db;
          color: white;
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
          color: #7f8c8d;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .view-details-btn {
          background: none;
          border: none;
          color: #3498db;
          font-size: 0.85rem;
          cursor: pointer;
          font-weight: 500;
          transition: color 0.2s ease;
        }

        .view-details-btn:hover {
          color: #2980b9;
          text-decoration: underline;
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