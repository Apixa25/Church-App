import React, { useState, useEffect, useCallback } from 'react';
import { Comment } from '../types/Post';
import { getPostComments, addComment, deleteComment } from '../services/postApi';
import { formatRelativeDate } from '../utils/dateUtils';
import ClickableAvatar from './ClickableAvatar';
import './CommentThread.css';

interface CommentThreadProps {
  postId: string;
  currentUserId?: string;
  currentUserEmail?: string;
  initialComments?: Comment[];
  maxDepth?: number;
  showReplyForms?: boolean;
  onCommentCountChange?: (count: number) => void;
}

const sortCommentTree = (nodes: Comment[]): Comment[] => {
  return [...nodes]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map(node => ({
      ...node,
      replies: node.replies ? sortCommentTree(node.replies) : []
    }));
};

const buildCommentTree = (flatComments: Comment[]): Comment[] => {
  if (!flatComments || flatComments.length === 0) {
    return [];
  }

  const commentMap = new Map<string, Comment>();
  const pendingChildren = new Map<string, Comment[]>();
  const roots: Comment[] = [];

  flatComments.forEach(raw => {
    const comment: Comment = {
      ...raw,
      replies: raw.replies ? [...raw.replies] : []
    };

    commentMap.set(comment.id, comment);

    const waiting = pendingChildren.get(comment.id);
    if (waiting) {
      comment.replies = [...(comment.replies ?? []), ...waiting];
      pendingChildren.delete(comment.id);
    }

    if (comment.parentCommentId) {
      const parent = commentMap.get(comment.parentCommentId);
      if (parent) {
        parent.replies = [...(parent.replies ?? []), comment];
      } else {
        const list = pendingChildren.get(comment.parentCommentId) ?? [];
        list.push(comment);
        pendingChildren.set(comment.parentCommentId, list);
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

const countComments = (nodes: Comment[]): number =>
  nodes.reduce(
    (total, comment) =>
      total + 1 + (comment.replies ? countComments(comment.replies) : 0),
    0
  );

const CommentThread: React.FC<CommentThreadProps> = ({
  postId,
  currentUserId,
  currentUserEmail,
  initialComments = [],
  maxDepth = 8,
  showReplyForms = true,
  onCommentCountChange
}) => {
  const [comments, setComments] = useState<Comment[]>(() => buildCommentTree(initialComments));
  const [totalCount, setTotalCount] = useState<number>(() => countComments(buildCommentTree(initialComments)));
  const [loading, setLoading] = useState(initialComments.length === 0);
  const [error, setError] = useState<string>('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [collapsedComments, setCollapsedComments] = useState<Set<string>>(new Set());
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(initialComments.length > 0);

  const canComment = Boolean(currentUserId || currentUserEmail);

  const loadComments = useCallback(async () => {
    if (!postId) return;

    try {
      setLoading(true);
      setError('');
      const response = await getPostComments(postId);
      const tree = buildCommentTree(response.content);
      setComments(tree);
      const total = countComments(tree);
      setTotalCount(total);
      setInitialized(true);

      if (onCommentCountChange) {
        onCommentCountChange(total);
      }
    } catch (err: any) {
      setError('Failed to load comments');
      console.error('Error loading comments:', err);
    } finally {
      setLoading(false);
    }
  }, [postId, onCommentCountChange]);

  useEffect(() => {
    if (!initialized) {
      if (initialComments.length === 0) {
        loadComments();
      } else {
        const tree = buildCommentTree(initialComments);
        setComments(tree);
        const total = countComments(tree);
        setTotalCount(total);
        setInitialized(true);
        setLoading(false);
        if (onCommentCountChange) {
          onCommentCountChange(total);
        }
      }
    }
  }, [initialized, initialComments, loadComments, onCommentCountChange]);

  const handleAddComment = async (parentCommentId: string | null, content: string) => {
    if (!content.trim() || !canComment) return;

    try {
      setIsSubmitting(true);

      await addComment(postId, {
        content: content.trim(),
        parentCommentId: parentCommentId || undefined,
        anonymous: false
      });

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
      setError('Failed to post comment');
      console.error('Error posting comment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this comment and its replies?');
    if (!confirmed) return;

    try {
      await deleteComment(commentId);
      await loadComments();
    } catch (err: any) {
      setError('Failed to delete comment');
      console.error('Error deleting comment:', err);
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

  const formatTimestamp = (timestamp: string): string => {
    return formatRelativeDate(timestamp);
  };

  const renderComment = (
    comment: Comment,
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
    const replyCount = typeof comment.repliesCount === 'number' ? comment.repliesCount : null;
    const scoreLabel =
      replyCount !== null && replyCount > 0
        ? `${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`
        : 'reply';

    // Check if we should show "Continue this thread" link
    const shouldShowContinueThread = depth >= maxDepth && hasReplies;
    const isThreadExpanded = expandedThreads.has(comment.id);

    return (
      <div
        key={comment.id}
        className={`thing comment ${depthClass} ${isCollapsed ? 'collapsed' : ''}`}
        data-id={`t1_${comment.id}`}
        data-depth={depth}
        data-has-children={hasReplies ? "true" : "false"}
      >
        {/* Circular collapse button - Reddit style */}
        <button
          className="collapse-thread-btn"
          onClick={() => toggleCollapse(comment.id)}
          type="button"
          aria-label={isCollapsed ? 'Expand thread' : 'Collapse thread'}
        >
          <span className="collapse-icon">{isCollapsed ? '+' : '−'}</span>
        </button>

        <div className="entry">
          <p className="tagline">
            <ClickableAvatar
              userId={comment.userId}
              profilePicUrl={comment.userProfilePicUrl}
              userName={comment.userName ?? 'Community Member'}
              size="small"
              isAnonymous={comment.isAnonymous}
              className="comment-avatar"
            />
            <span className="tagline-content">
              <span className="author-wrapper">
                <span className="author-label">
                  {comment.isAnonymous ? 'Anonymous' : (comment.userName ?? 'Community Member')}
                </span>
              </span>
              <span className="tag-separator" aria-hidden="true">
                •
              </span>
              <span className="score-text">{scoreLabel}</span>
              <span className="tag-separator" aria-hidden="true">
                •
              </span>
              <time className="time" dateTime={comment.createdAt}>
                {formatTimestamp(comment.createdAt)}
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

              {/* Media support */}
              {comment.mediaUrls && comment.mediaUrls.length > 0 && (
                <div className="comment-media">
                  {comment.mediaUrls.map((url, index) => (
                    <div key={index} className="comment-media-item">
                      {comment.mediaTypes?.[index]?.startsWith('image') ? (
                        <img
                          src={url}
                          alt={`Comment media ${index + 1}`}
                          className="comment-media-image"
                        />
                      ) : (
                        <video
                          src={url}
                          controls
                          className="comment-media-video"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="comment-actions">
            <button
              className="reply-btn"
              onClick={() => setReplyingTo(comment.id)}
              disabled={!canComment || replyingTo !== null}
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
                  placeholder={`Reply to ${comment.isAnonymous ? 'Anonymous' : comment.userName ?? 'this comment'}...`}
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
              {shouldShowContinueThread && !isThreadExpanded ? (
                <div className="continue-thread-container">
                  <button
                    className="continue-thread-link"
                    onClick={() => setExpandedThreads(prev => new Set(prev).add(comment.id))}
                    type="button"
                  >
                    <span className="continue-arrow">→</span> Continue this thread ({replies.length} {replies.length === 1 ? 'reply' : 'replies'})
                  </button>
                </div>
              ) : (
                replies.map((reply, index) =>
                  renderComment(reply as Comment, depth + 1, index === replies.length - 1)
                )
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
        {showReplyForms && (
          <button
            className="add-comment-button"
            onClick={() => setReplyingTo('root')}
            disabled={!canComment || replyingTo !== null}
          >
            {canComment ? 'Add Comment' : 'Login to comment'}
          </button>
        )}
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
              placeholder="Share your thoughts..."
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

export default CommentThread;
