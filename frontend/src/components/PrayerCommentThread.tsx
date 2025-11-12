import React, { useState, useEffect, useCallback } from 'react';
import {
  PrayerComment,
  PrayerInteraction,
  PrayerInteractionCreateRequest
} from '../types/Prayer';
import { prayerInteractionAPI, handleApiError } from '../services/prayerApi';
import { formatRelativeDate, safeParseDate } from '../utils/dateUtils';
import './CommentThread.css';
import './PrayerCommentThread.css';

interface PrayerCommentThreadProps {
  prayerId: string;
  currentUserId?: string;
  currentUserEmail?: string;
  maxDepth?: number;
  onCommentCountChange?: (count: number) => void;
}

const normalizeTimestamp = (timestamp: string | number[]): Date => {
  const parsed = safeParseDate(timestamp);
  return parsed ?? new Date(0);
};

const sortCommentTree = (nodes: PrayerComment[]): PrayerComment[] => {
  return [...nodes]
    .sort(
      (a, b) =>
        normalizeTimestamp(a.timestamp).getTime() -
        normalizeTimestamp(b.timestamp).getTime()
    )
    .map(node => ({
      ...node,
      replies: node.replies ? sortCommentTree(node.replies) : []
    }));
};

const buildCommentTree = (flatComments: PrayerInteraction[]): PrayerComment[] => {
  if (!flatComments || flatComments.length === 0) {
    return [];
  }

  const commentMap = new Map<string, PrayerComment>();
  const pendingChildren = new Map<string, PrayerComment[]>();
  const roots: PrayerComment[] = [];

  flatComments
    .filter(comment => comment.type === 'COMMENT')
    .forEach(raw => {
      const comment: PrayerComment = {
        ...raw,
        type: 'COMMENT',
        replies: raw.replies ? [...(raw.replies as PrayerComment[])] : []
      };

      commentMap.set(comment.id, comment);

      const waitingChildren = pendingChildren.get(comment.id);
      if (waitingChildren) {
        comment.replies = [...(comment.replies ?? []), ...waitingChildren];
        pendingChildren.delete(comment.id);
      }

      if (comment.parentInteractionId) {
        const parent = commentMap.get(comment.parentInteractionId);
        if (parent) {
          parent.replies = [...(parent.replies ?? []), comment];
        } else {
          const list = pendingChildren.get(comment.parentInteractionId) ?? [];
          list.push(comment);
          pendingChildren.set(comment.parentInteractionId, list);
        }
      } else {
        roots.push(comment);
      }
    });

  pendingChildren.forEach(children => {
    children.forEach(child => roots.push(child));
  });

  return sortCommentTree(roots);
};

const countComments = (nodes: PrayerComment[]): number =>
  nodes.reduce(
    (total, comment) =>
      total + 1 + (comment.replies ? countComments(comment.replies) : 0),
    0
  );

const PrayerCommentThread: React.FC<PrayerCommentThreadProps> = ({
  prayerId,
  currentUserId,
  currentUserEmail,
  maxDepth = 3,
  onCommentCountChange
}) => {
  const [comments, setComments] = useState<PrayerComment[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [collapsedComments, setCollapsedComments] = useState<Set<string>>(new Set());
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const canComment = Boolean(currentUserId || currentUserEmail);

  const loadComments = useCallback(async () => {
    if (!prayerId) return;

    try {
      setLoading(true);
      setError('');

      const response = await prayerInteractionAPI.getCommentsByPrayer(prayerId);
      const data = Array.isArray(response.data)
        ? response.data
        : response.data.content ?? [];

      const tree = buildCommentTree(data);
      setComments(tree);

      const total = countComments(tree);
      setTotalCount(total);

      if (onCommentCountChange) {
        onCommentCountChange(total);
      }
    } catch (err: any) {
      setError(handleApiError(err));
      console.error('Error loading prayer comments:', err);
    } finally {
      setLoading(false);
    }
  }, [prayerId, onCommentCountChange]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleAddComment = async (parentCommentId: string | null, content: string) => {
    if (!content.trim() || !canComment) return;

    try {
      setIsSubmitting(true);

      const payload: PrayerInteractionCreateRequest = {
        prayerRequestId: prayerId,
        type: 'COMMENT',
        content: content.trim()
      };

      if (parentCommentId) {
        payload.parentInteractionId = parentCommentId;
      }

      await prayerInteractionAPI.createInteraction(payload);

      if (parentCommentId) {
        setCollapsedComments(prev => {
          const updated = new Set(prev);
          updated.delete(parentCommentId);
          return updated;
        });
      }

      setReplyingTo(null);
      setNewCommentText('');

      await loadComments();
    } catch (err: any) {
      setError(handleApiError(err));
      console.error('Error posting prayer comment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this comment and its replies?');
    if (!confirmed) return;

    try {
      await prayerInteractionAPI.deleteInteraction(commentId);
      await loadComments();
    } catch (err: any) {
      setError(handleApiError(err));
      console.error('Error deleting prayer comment:', err);
    }
  };

  const toggleCollapse = (commentId: string) => {
    setCollapsedComments(prev => {
      const updated = new Set(prev);
      if (updated.has(commentId)) {
        updated.delete(commentId);
      } else {
        updated.add(commentId);
      }
      return updated;
    });
  };

  const formatTimestamp = (timestamp: string | number[]): string => {
    return formatRelativeDate(timestamp);
  };

  const renderComment = (
    comment: PrayerComment,
    depth: number = 0,
    isLastChild: boolean = true
  ): React.ReactNode => {
    const replies = comment.replies ?? [];
    const hasReplies = replies.length > 0;
    const isCollapsed = collapsedComments.has(comment.id);
    const showReplyForm = replyingTo === comment.id;
    const depthClass = `depth-${Math.min(depth, maxDepth)}`;
    const isOwner =
      currentUserId === comment.userId ||
      (!!currentUserEmail && currentUserEmail === comment.userId);

    const authorInitial = comment.userName?.charAt(0)?.toUpperCase() ?? 'U';
    const replyCount = typeof comment.replyCount === 'number' ? comment.replyCount : null;
    const scoreDisplay = replyCount !== null && replyCount > 0 ? replyCount.toString() : '·';
    const scoreLabel =
      replyCount !== null && replyCount > 0
        ? `${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`
        : 'reply';
    const timestampDate = normalizeTimestamp(comment.timestamp);

    return (
      <div
        key={comment.id}
        className={`thing comment ${depthClass} ${isCollapsed ? 'collapsed' : ''}`}
        data-id={`t1_${comment.id}`}
        data-depth={depth}
        data-has-children={hasReplies}
      >
        <div className="midcol unvoted">
          <button className="arrow up" type="button" aria-label="Upvote (display only)" disabled />
          <div className="score unvoted">{scoreDisplay}</div>
          <button className="arrow down" type="button" aria-label="Downvote (display only)" disabled />
        </div>

        <div className="entry">
          <p className="tagline">
            <span className="author-avatar" aria-hidden="true">
              {comment.userProfilePicUrl ? (
                <img
                  src={comment.userProfilePicUrl}
                  alt={comment.userName ?? 'Community member'}
                  className="author-avatar-image"
                />
              ) : (
                <span className="avatar-placeholder">{authorInitial}</span>
              )}
            </span>
            <span className="tagline-content">
              <span className="author-wrapper">
                <span className="author-label">{comment.userName ?? 'Community Member'}</span>
              </span>
              <span className="tag-separator" aria-hidden="true">
                •
              </span>
              <span className="score-text">{scoreLabel}</span>
              <span className="tag-separator" aria-hidden="true">
                •
              </span>
              <time className="time" dateTime={timestampDate.toISOString()}>
                {formatTimestamp(comment.timestamp)}
              </time>
            </span>
          </p>

          {!isCollapsed && (
            <div className="usertext body">
              <div className="md">
                {comment.content?.split('\n').map((line, index) => (
                  <p key={index} className="md-paragraph">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="comment-actions">
            <button
              className="reply-btn"
              onClick={() => setReplyingTo(comment.id)}
              disabled={!canComment || replyingTo !== null || depth >= maxDepth}
              type="button"
            >
              reply
            </button>

            {isOwner && (
              <button
                className="delete-btn"
                onClick={() => handleDeleteComment(comment.id)}
                type="button"
              >
                delete
              </button>
            )}

            <button
              className="collapse-btn"
              onClick={() => toggleCollapse(comment.id)}
              type="button"
            >
              {isCollapsed ? '[+]' : '[–]'}
            </button>
          </div>

          {showReplyForm && (
            <div className="reply-form-container">
              <form
                className="reply-form"
                onSubmit={event => {
                  event.preventDefault();
                  handleAddComment(comment.id, newCommentText);
                }}
              >
                <textarea
                  value={newCommentText}
                  onChange={event => setNewCommentText(event.target.value)}
                  placeholder={`Reply to ${comment.userName ?? 'this comment'}...`}
                  className="reply-textarea"
                  rows={3}
                  maxLength={1000}
                />
                <div className="reply-form-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingTo(null);
                      setNewCommentText('');
                    }}
                    className="cancel-reply-button"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newCommentText.trim() || isSubmitting}
                    className="submit-reply-button"
                  >
                    {isSubmitting ? 'Posting...' : 'Reply'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {!isCollapsed && hasReplies && (
            <div className="replies">
              {replies.map((reply, index) =>
                renderComment(reply as PrayerComment, depth + 1, index === replies.length - 1)
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="comment-thread loading">
        <div className="loading-spinner"></div>
        <p>Loading comments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="comment-thread error">
        <p className="error-message">{error}</p>
        <button onClick={loadComments} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="comment-thread">
      <div className="comment-thread-header">
        <h3>Comments ({totalCount})</h3>
        <button
          className="add-comment-button"
          onClick={() => setReplyingTo('root')}
          disabled={!canComment || replyingTo !== null}
        >
          {canComment ? 'Add Comment' : 'Login to comment'}
        </button>
      </div>

      {replyingTo === 'root' && canComment && (
        <div className="root-comment-form">
          <form
            onSubmit={event => {
              event.preventDefault();
              handleAddComment(null, newCommentText);
            }}
          >
            <textarea
              value={newCommentText}
              onChange={event => setNewCommentText(event.target.value)}
              placeholder="Share encouragement or a prayer."
              className="root-comment-textarea"
              rows={4}
              maxLength={1000}
            />
            <div className="root-comment-actions">
              <button
                type="button"
                onClick={() => {
                  setReplyingTo(null);
                  setNewCommentText('');
                }}
                className="cancel-root-comment-button"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newCommentText.trim() || isSubmitting}
                className="submit-root-comment-button"
              >
                {isSubmitting ? 'Posting...' : 'Comment'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="comments-list">
        {comments.length === 0 ? (
          <div className="no-comments">
            <p>No comments yet. {canComment ? 'Be the first to comment!' : 'Login to add a comment.'}</p>
          </div>
        ) : (
          <div className="comment-section">
            <div className="commentarea">
              <div className="sitetable nestable">
                {comments.map((comment, index) =>
                  renderComment(comment, 0, index === comments.length - 1)
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrayerCommentThread;

