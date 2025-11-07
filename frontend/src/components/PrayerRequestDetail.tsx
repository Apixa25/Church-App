import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  PrayerRequest, 
  PrayerInteraction,
  InteractionType,
  PrayerInteractionCreateRequest,
  PrayerStatus,
  PrayerRequestUpdateRequest,
  PRAYER_CATEGORY_LABELS,
  PRAYER_CATEGORY_COLORS,
  PRAYER_STATUS_LABELS,
  PRAYER_STATUS_COLORS,
  INTERACTION_TYPE_LABELS
} from '../types/Prayer';
import { prayerAPI, prayerInteractionAPI, handleApiError } from '../services/prayerApi';
import { useAuth } from '../contexts/AuthContext';
import { formatFullDate, formatRelativeDate } from '../utils/dateUtils';
import { usePrayerNotifications } from '../hooks/usePrayerNotifications';

interface PrayerRequestDetailProps {
  prayerId?: string;
  onClose?: () => void;
  onEdit?: (prayer: PrayerRequest) => void;
}

const PrayerRequestDetail: React.FC<PrayerRequestDetailProps> = ({
  prayerId: propPrayerId,
  onClose,
  onEdit
}) => {
  const { prayerId: paramPrayerId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscribeToSpecificPrayer } = usePrayerNotifications();

  const prayerId = propPrayerId || paramPrayerId;

  const [prayer, setPrayer] = useState<PrayerRequest | null>(null);
  const [interactions, setInteractions] = useState<PrayerInteraction[]>([]);
  const [comments, setComments] = useState<PrayerInteraction[]>([]);
  const [userInteractions, setUserInteractions] = useState<Record<InteractionType, boolean>>({} as Record<InteractionType, boolean>);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [commenting, setCommenting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const isOwner = user && prayer && (user.email === prayer.userId || user.userId === prayer.userId);

  const loadUserInteractions = useCallback(async () => {
    if (!user || !prayerId) return;

    try {
      const interactions: Record<InteractionType, boolean> = {} as Record<InteractionType, boolean>;
      const interactionTypes: InteractionType[] = ['PRAY', 'ENCOURAGE', 'AMEN', 'HEART', 'PRAISE'];
      
      await Promise.all(
        interactionTypes.map(async (type) => {
          try {
            const response = await prayerInteractionAPI.checkUserInteraction(prayerId, type);
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
  }, [user, prayerId]);

  const loadPrayerDetail = useCallback(async () => {
    if (!prayerId) return;

    try {
      setLoading(true);
      setError(null);

      // Load prayer details
      const prayerResponse = await prayerAPI.getPrayerRequest(prayerId);
      setPrayer(prayerResponse.data);

      // Load interactions and comments
      const [interactionsResponse, commentsResponse] = await Promise.all([
        prayerInteractionAPI.getReactionsByPrayer(prayerId),
        prayerInteractionAPI.getCommentsByPrayer(prayerId)
      ]);

      setInteractions(interactionsResponse.data);
      // Handle comments response - it might be PrayerInteractionListResponse or PrayerInteraction[]
      const commentsData = Array.isArray(commentsResponse.data) 
        ? commentsResponse.data
        : commentsResponse.data.content || [];
      setComments(commentsData);

      // Load user interactions if logged in
      if (user) {
        await loadUserInteractions();
      }
    } catch (err: any) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [prayerId, user, loadUserInteractions]);

  useEffect(() => {
    if (prayerId) {
      loadPrayerDetail();
    }
  }, [prayerId, loadPrayerDetail]);

  // Set up real-time updates for this specific prayer
  useEffect(() => {
    if (!prayerId || !user) return;

    const unsubscribe = subscribeToSpecificPrayer(prayerId);
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [prayerId, user, subscribeToSpecificPrayer]);

  const handleInteraction = async (type: InteractionType) => {
    if (!user || !prayerId || !prayer) return;

    try {
      await prayerInteractionAPI.createInteraction({
        prayerRequestId: prayerId,
        type,
        content: undefined
      });

      // Update local state
      setUserInteractions(prev => ({
        ...prev,
        [type]: !prev[type]
      }));

      // Reload interactions to get updated counts
      const interactionsResponse = await prayerInteractionAPI.getReactionsByPrayer(prayerId);
      setInteractions(interactionsResponse.data);

      // Update prayer interaction summary
      if (prayer.interactionSummary) {
        const currentCount = prayer.interactionSummary.interactionCounts[type] || 0;
        prayer.interactionSummary.interactionCounts[type] = userInteractions[type] 
          ? Math.max(0, currentCount - 1)
          : currentCount + 1;
      }
    } catch (err: any) {
      setError(handleApiError(err));
    }
  };

  const handleSubmitComment = async () => {
    if (!user || !prayerId || !commentText.trim()) return;

    setSubmittingComment(true);
    try {
      const commentRequest: PrayerInteractionCreateRequest = {
        prayerRequestId: prayerId,
        type: 'COMMENT',
        content: commentText.trim()
      };

      await prayerInteractionAPI.createInteraction(commentRequest);
      
      // Reload comments
      const commentsResponse = await prayerInteractionAPI.getCommentsByPrayer(prayerId);
      const commentsData = Array.isArray(commentsResponse.data) 
        ? commentsResponse.data
        : commentsResponse.data.content || [];
      setComments(commentsData);
      
      // Clear comment form
      setCommentText('');
      setCommenting(false);
    } catch (err: any) {
      setError(handleApiError(err));
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (interactionId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      await prayerInteractionAPI.deleteInteraction(interactionId);
      setComments(prev => prev.filter(c => c.id !== interactionId));
    } catch (err: any) {
      setError(handleApiError(err));
    }
  };

  const handleStatusChange = async (newStatus: PrayerStatus) => {
    if (!prayer || !prayerId) return;
    
    try {
      const updateRequest: PrayerRequestUpdateRequest = {
        status: newStatus
      };
      
      const response = await prayerAPI.updatePrayerRequest(prayerId, updateRequest);
      setPrayer(response.data);
      
      // Show success message
      const statusLabel = PRAYER_STATUS_LABELS[newStatus];
      setSuccess(`Prayer status updated to "${statusLabel}"!`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(handleApiError(err));
    }
  };

  // Use the robust date utility functions
  const formatDate = (dateString: string | number[]) => {
    return formatFullDate(dateString);
  };
  
  const formatRelativeTime = (dateString: string | number[]) => {
    return formatRelativeDate(dateString);
  };

  const getInteractionCount = (type: InteractionType): number => {
    return interactions.filter(i => i.type === type).length;
  };

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else {
      navigate('/prayers');
    }
  };

  if (loading) {
    return (
      <div className="prayer-detail-loading">
        <div className="loading-spinner"></div>
        <p>Loading prayer details...</p>
      </div>
    );
  }

  if (error || !prayer) {
    return (
      <div className="prayer-detail-error">
        <h2>Prayer Not Found</h2>
        <p>{error || 'The prayer request you are looking for could not be found.'}</p>
        <button onClick={handleBack} className="btn btn-primary">
          ← Back to Prayers
        </button>
      </div>
    );
  }

  return (
    <div className="prayer-request-detail">
      <div className="detail-header">
        <button onClick={handleBack} className="back-btn">
          ← Back
        </button>
        
        {isOwner && (
          <div className="owner-actions">
            {onEdit && (
              <button onClick={() => onEdit(prayer)} className="edit-btn">
                ✏️ Edit Prayer
              </button>
            )}
            <select 
              value={prayer.status} 
              onChange={(e) => handleStatusChange(e.target.value as PrayerStatus)}
              className="status-change-select"
              title="Change prayer status"
            >
              {Object.entries(PRAYER_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {success && (
        <div className="success-message">
          <span className="success-icon">✅</span>
          {success}
        </div>
      )}

      <div className="prayer-content">
        <div className="prayer-meta">
          <div className="author-section">
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
              <h4 className="author-name">
                {prayer.isAnonymous ? 'Anonymous Prayer Request' : prayer.userName}
              </h4>
              <p className="prayer-date">Submitted {formatDate(prayer.createdAt)}</p>
            </div>
          </div>

          <div className="tags">
            <span 
              className="category-tag"
              style={{ backgroundColor: PRAYER_CATEGORY_COLORS[prayer.category] }}
            >
              {PRAYER_CATEGORY_LABELS[prayer.category]}
            </span>
            
            <span 
              className="status-tag"
              style={{ backgroundColor: PRAYER_STATUS_COLORS[prayer.status] }}
            >
              {PRAYER_STATUS_LABELS[prayer.status]}
            </span>
          </div>
        </div>

        <div className="prayer-body">
          <h1 className="prayer-title">{prayer.title}</h1>
          
          {prayer.description && (
            <div className="prayer-description">
              {prayer.description.split('\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
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
                  disabled={!user}
                  title={user ? `${typeInfo.label} for this prayer` : 'Login to interact'}
                >
                  <span className="interaction-emoji">{typeInfo.emoji}</span>
                  <span className="interaction-label">{typeInfo.label}</span>
                  {count > 0 && <span className="interaction-count">{count}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="comments-section">
        <h3 className="comments-title">
          💬 Comments ({comments.length})
        </h3>

        {user && (
          <div className="comment-form">
            {!commenting ? (
              <button 
                className="start-comment-btn"
                onClick={() => setCommenting(true)}
              >
                💬 Add a comment...
              </button>
            ) : (
              <div className="comment-input-section">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Share your thoughts, encouragement, or support..."
                  className="comment-textarea"
                  rows={3}
                />
                <div className="comment-actions">
                  <button 
                    onClick={() => {
                      setCommenting(false);
                      setCommentText('');
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSubmitComment}
                    disabled={!commentText.trim() || submittingComment}
                    className="btn btn-primary"
                  >
                    {submittingComment ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="comments-list">
          {comments.map((comment) => {
            const isOwnerComment = user && (user.email === comment.userId || user.userId === comment.userId);
            
            return (
              <div key={comment.id} className="comment">
                <div className="comment-header">
                  <div className="comment-author">
                    {comment.userProfilePicUrl ? (
                      <img 
                        src={comment.userProfilePicUrl} 
                        alt={comment.userName}
                        className="comment-avatar"
                      />
                    ) : (
                      <div className="comment-avatar placeholder">
                        {comment.userName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    
                    <div className="comment-info">
                      <span className="comment-author-name">{comment.userName}</span>
                      <span className="comment-date">{formatRelativeTime(comment.timestamp)}</span>
                    </div>
                  </div>

                  {isOwnerComment && (
                    <button 
                      onClick={() => handleDeleteComment(comment.id)}
                      className="delete-comment-btn"
                      title="Delete comment"
                    >
                      🗑️
                    </button>
                  )}
                </div>

                <div className="comment-content">
                  {comment.content?.split('\n').map((line, index) => (
                    <p key={index}>{line}</p>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {comments.length === 0 && (
          <div className="no-comments">
            <p>No comments yet. {user ? 'Be the first to comment!' : 'Login to add a comment.'}</p>
          </div>
        )}
      </div>

      <style>{`
        .prayer-request-detail {
          max-width: 800px;
          margin: 0 auto;
          padding: 1.5rem;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          border-radius: var(--border-radius-md);
          box-shadow: var(--shadow-md);
        }

        .detail-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid var(--border-primary);
        }

        .back-btn, .edit-btn {
          background: var(--bg-secondary);
          border: 2px solid var(--border-primary);
          border-radius: var(--border-radius-md);
          padding: 0.5rem 1rem;
          cursor: pointer;
          font-weight: 600;
          color: var(--text-secondary);
          transition: all var(--transition-base);
        }

        .back-btn:hover, .edit-btn:hover {
          background: var(--bg-tertiary);
          border-color: var(--border-glow);
          color: var(--text-primary);
        }

        .edit-btn {
          background: var(--accent-primary);
          border-color: var(--accent-primary);
          color: white;
          box-shadow: 0 2px 8px var(--button-primary-glow);
        }

        .edit-btn:hover {
          background: var(--accent-primary-dark);
          border-color: var(--accent-primary-dark);
          box-shadow: var(--glow-blue);
        }

        .owner-actions {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        .status-change-select {
          background: var(--bg-secondary);
          border: 2px solid var(--border-primary);
          border-radius: var(--border-radius-md);
          padding: 0.5rem 0.75rem;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          color: var(--text-primary);
          transition: all var(--transition-base);
          min-width: 120px;
        }

        .status-change-select:hover {
          background: var(--bg-tertiary);
          border-color: var(--border-glow);
        }

        .status-change-select:focus {
          outline: none;
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px rgba(91, 127, 255, 0.2);
        }

        .prayer-content {
          margin-bottom: 2rem;
        }

        .prayer-meta {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .author-section {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .author-avatar {
          width: 60px;
          height: 60px;
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
          font-size: 1.5rem;
        }

        .author-info h4 {
          margin: 0 0 0.25rem 0;
          color: var(--text-primary);
          font-size: 1.1rem;
        }

        .prayer-date {
          margin: 0;
          color: var(--text-tertiary);
          font-size: 0.9rem;
        }

        .tags {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .category-tag, .status-tag {
          font-size: 0.8rem;
          padding: 0.4rem 0.8rem;
          border-radius: var(--border-radius-pill);
          color: white;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .prayer-body {
          margin-bottom: 2rem;
        }

        .prayer-title {
          margin: 0 0 1rem 0;
          color: var(--text-primary);
          font-size: 1.75rem;
          line-height: 1.3;
          font-weight: 600;
        }

        .prayer-description p {
          margin: 0 0 1rem 0;
          color: var(--text-secondary);
          line-height: 1.6;
          font-size: 1.1rem;
        }

        .prayer-description p:last-child {
          margin-bottom: 0;
        }

        .prayer-interactions {
          padding: 1.5rem 0;
          border-top: 1px solid var(--border-primary);
          border-bottom: 1px solid var(--border-primary);
        }

        .interaction-buttons {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
          justify-content: center;
        }

        .interaction-btn {
          background: var(--bg-secondary);
          border: 2px solid var(--border-primary);
          border-radius: var(--border-radius-pill);
          padding: 0.75rem 1.25rem;
          cursor: pointer;
          transition: all var(--transition-base);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .interaction-btn:hover:not(:disabled) {
          background: var(--bg-tertiary);
          border-color: var(--border-glow);
          color: var(--text-primary);
          transform: translateY(-1px);
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
          font-size: 1.1rem;
        }

        .interaction-count {
          background: rgba(0, 0, 0, 0.3);
          padding: 0.2rem 0.5rem;
          border-radius: var(--border-radius-sm);
          font-size: 0.8rem;
          font-weight: 700;
        }

        .interaction-btn.active .interaction-count {
          background: rgba(255, 255, 255, 0.3);
        }

        .comments-section {
          margin-top: 2rem;
        }

        .comments-title {
          color: var(--text-primary);
          margin: 0 0 1.5rem 0;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .comment-form {
          margin-bottom: 2rem;
        }

        .start-comment-btn {
          width: 100%;
          background: var(--bg-secondary);
          border: 2px dashed var(--border-primary);
          border-radius: var(--border-radius-md);
          padding: 1rem;
          color: var(--text-tertiary);
          cursor: pointer;
          transition: all var(--transition-base);
          text-align: left;
          font-size: 1rem;
        }

        .start-comment-btn:hover {
          background: var(--bg-tertiary);
          border-color: var(--border-glow);
          color: var(--text-secondary);
        }

        .comment-input-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .comment-textarea {
          width: 100%;
          padding: 0.75rem;
          background: var(--bg-secondary);
          border: 2px solid var(--border-primary);
          border-radius: var(--border-radius-md);
          font-size: 1rem;
          color: var(--text-primary);
          resize: vertical;
          min-height: 80px;
          transition: all var(--transition-base);
        }

        .comment-textarea:focus {
          outline: none;
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px rgba(91, 127, 255, 0.2);
          background: var(--bg-tertiary);
        }

        .comment-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
        }

        .btn {
          padding: 0.6rem 1.2rem;
          border: none;
          border-radius: var(--border-radius-md);
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-base);
        }

        .btn-primary {
          background: var(--accent-primary);
          color: white;
          box-shadow: 0 2px 8px var(--button-primary-glow);
        }

        .btn-primary:hover:not(:disabled) {
          background: var(--accent-primary-dark);
          box-shadow: var(--glow-blue);
        }

        .btn-secondary {
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          color: var(--text-secondary);
        }

        .btn-secondary:hover {
          background: var(--bg-tertiary);
          border-color: var(--border-glow);
          color: var(--text-primary);
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .comments-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .comment {
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          border-radius: var(--border-radius-md);
          padding: 1rem;
        }

        .comment-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .comment-author {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .comment-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
        }

        .comment-avatar.placeholder {
          background: var(--gradient-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 1rem;
        }

        .comment-info {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }

        .comment-author-name {
          font-weight: 600;
          color: var(--text-primary) !important;
          font-size: 0.9rem;
        }

        .comment-date {
          font-size: 0.8rem;
          color: var(--text-tertiary);
        }

        .delete-comment-btn {
          background: none;
          border: none;
          padding: 0.25rem;
          cursor: pointer;
          opacity: 0.6;
          transition: opacity var(--transition-base);
          color: var(--text-secondary);
        }

        .delete-comment-btn:hover {
          opacity: 1;
          color: var(--error);
        }

        .comment-content p {
          margin: 0 0 0.5rem 0;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .comment-content p:last-child {
          margin-bottom: 0;
        }

        .no-comments {
          text-align: center;
          color: var(--text-tertiary);
          font-style: italic;
          padding: 2rem;
        }

        .prayer-detail-loading, .prayer-detail-error {
          text-align: center;
          padding: 3rem 1rem;
          color: var(--text-tertiary);
        }

        .success-message {
          background: rgba(16, 185, 129, 0.2);
          border: 1px solid var(--success);
          color: var(--success);
          padding: 0.75rem 1rem;
          border-radius: var(--border-radius-md);
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 500;
        }

        .success-icon {
          font-size: 1.1rem;
        }

        .loading-spinner {
          width: 2rem;
          height: 2rem;
          border: 3px solid var(--bg-tertiary);
          border-top: 3px solid var(--accent-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
          box-shadow: 0 0 12px var(--button-primary-glow);
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 768px) {
          .prayer-request-detail {
            padding: 1rem;
            margin: 0.5rem;
          }

          .detail-header {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }

          .prayer-meta {
            flex-direction: column;
            align-items: flex-start;
          }

          .interaction-buttons {
            justify-content: flex-start;
          }

          .comment-actions {
            flex-direction: column;
          }

          .btn {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
};

export default PrayerRequestDetail;