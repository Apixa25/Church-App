import React, { useState, useEffect, useCallback } from 'react';
import { Comment } from '../types/Post';
import { getPostComments, addComment } from '../services/postApi';
import { formatRelativeDate } from '../utils/dateUtils';
import './CommentThread.css';

interface CommentThreadProps {
  postId: string;
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
  initialComments = [],
  maxDepth = 3,
  showReplyForms = true,
  onCommentCountChange
}) => {
  const [comments, setComments] = useState<Comment[]>(() => buildCommentTree(initialComments));
  const [totalCount, setTotalCount] = useState<number>(() => countComments(buildCommentTree(initialComments)));
  const [loading, setLoading] = useState(initialComments.length === 0);
  const [error, setError] = useState<string>('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [newCommentText, setNewCommentText] = useState('');
  const [initialized, setInitialized] = useState(initialComments.length > 0);

  const loadComments = useCallback(async () => {
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
  }, [initialized, initialComments, loadComments]);

  const handleReply = async (parentCommentId: string | null, content: string) => {
    if (!content.trim()) return;

    try {
      const comment = await addComment(postId, {
        content: content.trim(),
        parentCommentId: parentCommentId || undefined,
        anonymous: false
      });

      const normalizedComment: Comment = { ...comment, replies: [] };

      if (parentCommentId) {
        setComments(prevComments =>
          sortCommentTree(addReplyToComment(prevComments, parentCommentId, normalizedComment))
        );
        setExpandedThreads(prev => {
          const updated = new Set(prev);
          updated.add(parentCommentId);
          return updated;
        });
      } else {
        setComments(prev => sortCommentTree([...prev, normalizedComment]));
      }

      setReplyingTo(null);
      setNewCommentText('');

      setTotalCount(prev => {
        const updated = prev + 1;
        if (onCommentCountChange) {
          onCommentCountChange(updated);
        }
        return updated;
      });
    } catch (err: any) {
      setError('Failed to post comment');
      console.error('Error posting comment:', err);
    }
  };

  const addReplyToComment = (comments: Comment[], parentId: string, reply: Comment): Comment[] => {
    return comments.map(comment => {
      if (comment.id === parentId) {
        const replies = [...(comment.replies ?? []), reply];
        return { ...comment, replies };
      }
      if (comment.replies) {
        return {
          ...comment,
          replies: addReplyToComment(comment.replies, parentId, reply)
        };
      }
      return comment;
    });
  };

  const toggleThreadExpansion = (commentId: string) => {
    setExpandedThreads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const renderComment = (comment: Comment, depth: number = 0): React.ReactNode => {
    const hasReplies = comment.replies && comment.replies.length > 0;
    const isExpanded = expandedThreads.has(comment.id) || depth === 0;
    const showReplyForm = replyingTo === comment.id;
    const indentClass = depth > 0 ? `comment-indent-${Math.min(depth, maxDepth)}` : '';

    return (
      <div key={comment.id} className={`comment-item ${indentClass}`}>
        <div className="comment-header">
          <div className="comment-author">
            {comment.userProfilePicUrl ? (
              <img
                src={comment.userProfilePicUrl}
                alt={comment.userName}
                className="comment-avatar"
              />
            ) : (
              <div className="comment-avatar-placeholder">
                {comment.userName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="comment-author-info">
              <span className="comment-author-name">
                {comment.isAnonymous ? 'Anonymous' : comment.userName}
              </span>
              <span className="comment-timestamp">
                {formatTimestamp(comment.createdAt)}
              </span>
            </div>
          </div>

          {depth < maxDepth && (
            <button
              className="reply-button"
              onClick={() => setReplyingTo(comment.id)}
              disabled={replyingTo !== null}
            >
              Reply
            </button>
          )}
        </div>

        <div className="comment-content">
          <p className="comment-text">{comment.content}</p>

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

        {showReplyForm && (
          <div className="reply-form-container">
            <form
              className="reply-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleReply(comment.id, newCommentText);
              }}
            >
              <textarea
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder={`Reply to ${comment.isAnonymous ? 'Anonymous' : comment.userName}...`}
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
                  disabled={!newCommentText.trim()}
                  className="submit-reply-button"
                >
                  Reply
                </button>
              </div>
            </form>
          </div>
        )}

        {hasReplies && (
          <div className="comment-replies">
            {comment.replies!.length > 0 && depth < maxDepth && (
              <button
                className="toggle-replies-button"
                onClick={() => toggleThreadExpansion(comment.id)}
              >
                {isExpanded ? '▼' : '▶'} {comment.replies!.length} repl{comment.replies!.length === 1 ? 'y' : 'ies'}
              </button>
            )}

            {isExpanded && (
              <div className="replies-container">
                {comment.replies!.map(reply => renderComment(reply, depth + 1))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const formatTimestamp = (timestamp: string): string => {
    return formatRelativeDate(timestamp);
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
            disabled={replyingTo !== null}
          >
            Add Comment
          </button>
        )}
      </div>

      {replyingTo === 'root' && (
        <div className="root-comment-form">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleReply(null, newCommentText);
            }}
          >
            <textarea
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
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
                disabled={!newCommentText.trim()}
                className="submit-root-comment-button"
              >
                Comment
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="comments-list">
        {comments.length === 0 ? (
          <div className="no-comments">
            <p>No comments yet. Be the first to share your thoughts!</p>
          </div>
        ) : (
          comments.map(comment => renderComment(comment))
        )}
      </div>
    </div>
  );
};

export default CommentThread;
