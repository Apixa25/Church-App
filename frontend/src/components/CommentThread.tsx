import React, { useState, useEffect } from 'react';
import { Comment } from '../types/Post';
import { getPostComments, addComment } from '../services/postApi';
import './CommentThread.css';

interface CommentThreadProps {
  postId: string;
  initialComments?: Comment[];
  maxDepth?: number;
  showReplyForms?: boolean;
  onCommentCountChange?: (count: number) => void;
}

const CommentThread: React.FC<CommentThreadProps> = ({
  postId,
  initialComments = [],
  maxDepth = 3,
  showReplyForms = true,
  onCommentCountChange
}) => {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [loading, setLoading] = useState(initialComments.length === 0);
  const [error, setError] = useState<string>('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [newCommentText, setNewCommentText] = useState('');

  useEffect(() => {
    if (initialComments.length === 0) {
      loadComments();
    }
  }, [postId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getPostComments(postId);
      setComments(response.content);

      if (onCommentCountChange) {
        onCommentCountChange(response.totalElements);
      }
    } catch (err: any) {
      setError('Failed to load comments');
      console.error('Error loading comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (parentCommentId: string | null, content: string) => {
    if (!content.trim()) return;

    try {
      const comment = await addComment(postId, {
        content: content.trim(),
        parentCommentId,
        anonymous: false
      });

      // Add the new comment to the appropriate place in the thread
      if (parentCommentId) {
        // It's a reply - find the parent and add it
        setComments(prevComments =>
          addReplyToComment(prevComments, parentCommentId, comment)
        );
      } else {
        // It's a top-level comment
        setComments(prev => [comment, ...prev]);
      }

      setReplyingTo(null);
      setNewCommentText('');

      if (onCommentCountChange) {
        onCommentCountChange(comments.length + 1);
      }
    } catch (err: any) {
      setError('Failed to post comment');
      console.error('Error posting comment:', err);
    }
  };

  const addReplyToComment = (comments: Comment[], parentId: string, reply: Comment): Comment[] => {
    return comments.map(comment => {
      if (comment.id === parentId) {
        return {
          ...comment,
          replies: comment.replies ? [...comment.replies, reply] : [reply]
        };
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
    const isExpanded = expandedThreads.has(comment.id);
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

          {/* Comment Media */}
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

        {/* Reply Form */}
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

        {/* Replies */}
        {hasReplies && (
          <div className="comment-replies">
            <button
              className="toggle-replies-button"
              onClick={() => toggleThreadExpansion(comment.id)}
            >
              {isExpanded ? '▼' : '▶'} {comment.replies!.length} repl{comment.replies!.length === 1 ? 'y' : 'ies'}
            </button>

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
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;

    return date.toLocaleDateString();
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
        <h3>Comments ({comments.length})</h3>
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

      {/* Root level comment form */}
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

      {/* Comments List */}
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
