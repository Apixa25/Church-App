import React, { useState, useRef, useEffect } from 'react';
import { CreateCommentRequest } from '../types/Post';
import './CommentForm.css';

interface CommentFormProps {
  onSubmit: (comment: CreateCommentRequest) => Promise<void>;
  onCancel?: () => void;
  placeholder?: string;
  replyTo?: {
    userName: string;
    commentId?: string;
  };
  autoFocus?: boolean;
  compact?: boolean;
  showAnonymousOption?: boolean;
}

const CommentForm: React.FC<CommentFormProps> = ({
  onSubmit,
  onCancel,
  placeholder = "Share your thoughts...",
  replyTo,
  autoFocus = false,
  compact = false,
  showAnonymousOption = true
}) => {
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const maxLength = 1000;

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    if (content.length > maxLength) {
      setError(`Comment cannot exceed ${maxLength} characters`);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const commentRequest: CreateCommentRequest = {
        content: content.trim(),
        anonymous: isAnonymous
      };

      if (replyTo?.commentId) {
        commentRequest.parentCommentId = replyTo.commentId;
      }

      await onSubmit(commentRequest);

      // Reset form on success
      setContent('');
      setIsAnonymous(false);

      if (onCancel) {
        onCancel();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit(e);
    }
    if (e.key === 'Escape' && onCancel) {
      onCancel();
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setContent(value);
    }
  };

  const insertEmoji = (emoji: string) => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const newContent = content.substring(0, start) + emoji + content.substring(end);
      setContent(newContent);

      // Focus back to textarea and set cursor position
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    }
  };

  const characterCount = content.length;
  const isNearLimit = characterCount > maxLength * 0.9;

  return (
    <div className={`comment-form ${compact ? 'compact' : ''}`}>
      <form onSubmit={handleSubmit}>
        {/* Reply Header */}
        {replyTo && (
          <div className="reply-header">
            <span className="reply-indicator">Replying to @{replyTo.userName}</span>
          </div>
        )}

        {/* Textarea */}
        <div className="comment-input-container">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="comment-textarea"
            rows={compact ? 2 : 3}
            maxLength={maxLength}
            disabled={isSubmitting}
          />

          {/* Character Counter */}
          <div className={`character-counter ${isNearLimit ? 'near-limit' : ''}`}>
            {characterCount}/{maxLength}
          </div>
        </div>

        {/* Toolbar */}
        <div className="comment-toolbar">
          <div className="toolbar-left">
            <button
              type="button"
              onClick={() => insertEmoji('🙏')}
              className="emoji-button"
              title="Add prayer emoji"
              disabled={isSubmitting}
            >
              🙏
            </button>

            <button
              type="button"
              onClick={() => insertEmoji('❤️')}
              className="emoji-button"
              title="Add heart emoji"
              disabled={isSubmitting}
            >
              ❤️
            </button>

            <button
              type="button"
              onClick={() => insertEmoji('✨')}
              className="emoji-button"
              title="Add sparkle emoji"
              disabled={isSubmitting}
            >
              ✨
            </button>

            {showAnonymousOption && (
              <label className="anonymous-toggle">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  disabled={isSubmitting}
                />
                <span className="anonymous-label">Anonymous</span>
              </label>
            )}
          </div>

          <div className="toolbar-right">
            <span className="keyboard-hint">
              Ctrl+Enter to submit
            </span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="comment-actions">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="cancel-button"
              disabled={isSubmitting}
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            className="submit-button"
            disabled={!content.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="submit-spinner"></div>
                Posting...
              </>
            ) : replyTo ? (
              'Reply'
            ) : (
              'Comment'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CommentForm;
