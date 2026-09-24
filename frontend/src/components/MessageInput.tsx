import React, { useState, useRef, useCallback, useMemo } from 'react';
import { GroupMember } from '../services/chatApi';

export interface OutgoingMessage {
  content: string;
  file?: File;
  parentMessageId?: string;
  mentionedUserIds: string[];
}

interface MessageInputProps {
  onSendMessage: (message: OutgoingMessage) => void | Promise<void>;
  onTyping: () => void;
  placeholder?: string;
  disabled?: boolean;
  replyingTo?: any;
  onCancelReply?: () => void;
  /** Group members offered in the @mention autocomplete. */
  members?: GroupMember[];
  currentUserId?: string;
}

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  // Videos intentionally excluded - use posts for video sharing
  'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg',
  'application/pdf', 'text/plain',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];
const MAX_MENTION_SUGGESTIONS = 6;

/** Finds an "@query" token that ends at the caret, if any. */
const findMentionQuery = (text: string, caret: number): { start: number; query: string } | null => {
  const before = text.slice(0, caret);
  const match = /(?:^|\s)@([^\s@]*)$/.exec(before);
  if (!match) return null;
  const start = before.length - match[1].length - 1;
  return { start, query: match[1] };
};

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTyping,
  placeholder = 'Type a message...',
  disabled = false,
  replyingTo,
  onCancelReply,
  members = [],
  currentUserId
}) => {
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [mentionQuery, setMentionQuery] = useState<{ start: number; query: string } | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  // displayName -> userId for names actually inserted through the picker
  const [mentionedUsers, setMentionedUsers] = useState<Record<string, string>>({});
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const commonEmojis = ['😊', '😂', '❤️', '👍', '👎', '😢', '😮', '😠', '🙏', '🎉', '💯', '🔥'];

  const mentionSuggestions = useMemo(() => {
    if (!mentionQuery) return [];
    const q = mentionQuery.query.toLowerCase();
    return members
      .filter(m => m.isActive !== false && m.userId !== currentUserId)
      .filter(m => !q || (m.displayName || m.userName || '').toLowerCase().includes(q))
      .slice(0, MAX_MENTION_SUGGESTIONS);
  }, [members, mentionQuery, currentUserId]);

  const resolveMentionedUserIds = (text: string): string[] => {
    const ids = new Set<string>();
    Object.entries(mentionedUsers).forEach(([name, userId]) => {
      if (text.includes(`@${name}`)) {
        ids.add(userId);
      }
    });
    return Array.from(ids);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (disabled) return;
    
    const trimmedMessage = message.trim();
    if (!trimmedMessage && !selectedFile) return;

    try {
      setUploading(true);
      setInputError(null);
      await onSendMessage({
        content: trimmedMessage,
        file: selectedFile || undefined,
        parentMessageId: replyingTo?.id,
        mentionedUserIds: resolveMentionedUserIds(trimmedMessage)
      });
      
      // Clear input after successful send
      setMessage('');
      setSelectedFile(null);
      setMentionedUsers({});
      setMentionQuery(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (onCancelReply) onCancelReply();
      
      // Reset textarea height - keep focus to prevent keyboard from closing on mobile
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        // Using requestAnimationFrame ensures we don't lose focus during React re-render
        requestAnimationFrame(() => {
          if (textareaRef.current && document.activeElement !== textareaRef.current) {
            textareaRef.current.focus({ preventScroll: true });
          }
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setInputError('Message could not be sent. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';

    const query = members.length > 0 ? findMentionQuery(value, textarea.selectionStart ?? value.length) : null;
    setMentionQuery(query);
    setMentionIndex(0);
    
    // Trigger typing indicator
    if (value.length > 0) {
      onTyping();
    }
  }, [onTyping, members.length]);

  const insertMention = (member: GroupMember) => {
    if (!mentionQuery) return;
    const name = member.displayName || member.userName;
    const before = message.slice(0, mentionQuery.start);
    const after = message.slice(mentionQuery.start + 1 + mentionQuery.query.length);
    const next = `${before}@${name} ${after}`;
    setMessage(next);
    setMentionedUsers(prev => ({ ...prev, [name]: member.userId }));
    setMentionQuery(null);

    const caret = before.length + name.length + 2;
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.focus({ preventScroll: true });
        textarea.selectionStart = textarea.selectionEnd = caret;
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery && mentionSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(i => (i + 1) % mentionSuggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(i => (i - 1 + mentionSuggestions.length) % mentionSuggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(mentionSuggestions[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      setInputError('File size must be less than 50MB');
      e.target.value = '';
      return;
    }
    
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setInputError('That file type is not supported');
      e.target.value = '';
      return;
    }
    
    setInputError(null);
    setSelectedFile(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const cursorPos = textarea.selectionStart;
      const textBefore = message.substring(0, cursorPos);
      const textAfter = message.substring(cursorPos);
      const newMessage = textBefore + emoji + textAfter;
      
      setMessage(newMessage);
      
      // Set cursor position after emoji
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = cursorPos + emoji.length;
        textarea.focus();
      }, 0);
    }
    
    setShowEmojiPicker(false);
  };

  const getFilePreview = (file: File) => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return null;
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.type.startsWith('video/')) return '🎥';
    if (file.type.startsWith('audio/')) return '🎵';
    if (file.type === 'application/pdf') return '📄';
    return '📁';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="message-input-container">
      {/* Reply indicator */}
      {replyingTo && (
        <div className="reply-indicator">
          <div className="reply-content">
            <span className="reply-label">Replying to {replyingTo.userDisplayName || replyingTo.userName}:</span>
            <span className="reply-text">{replyingTo.content}</span>
          </div>
          <button type="button" onClick={onCancelReply} className="cancel-reply" aria-label="Cancel reply">✕</button>
        </div>
      )}

      {/* File preview */}
      {selectedFile && (
        <div className="file-preview">
          <div className="file-info">
            {getFilePreview(selectedFile) ? (
              <img 
                src={getFilePreview(selectedFile)!} 
                alt="Preview" 
                className="file-preview-image"
              />
            ) : (
              <div className="file-icon">
                {getFileIcon(selectedFile)}
              </div>
            )}
            <div className="file-details">
              <span className="file-name">{selectedFile.name}</span>
              <span className="file-size">{formatFileSize(selectedFile.size)}</span>
            </div>
          </div>
          <button type="button" onClick={removeFile} className="remove-file" aria-label="Remove file">✕</button>
        </div>
      )}

      {inputError && (
        <div className="message-input-error" role="alert">
          <span>⚠️ {inputError}</span>
          <button type="button" onClick={() => setInputError(null)} aria-label="Dismiss">✕</button>
        </div>
      )}

      {/* Emoji picker */}
      {showEmojiPicker && (
        <div className="emoji-picker">
          <div className="emoji-grid">
            {commonEmojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="emoji-button"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* @mention autocomplete */}
      {mentionQuery && mentionSuggestions.length > 0 && (
        <ul className="mention-suggestions" role="listbox" aria-label="Mention a member">
          {mentionSuggestions.map((member, index) => (
            <li
              key={member.userId}
              role="option"
              aria-selected={index === mentionIndex}
              className={`mention-suggestion ${index === mentionIndex ? 'active' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); insertMention(member); }}
            >
              {member.profilePicUrl ? (
                <img src={member.profilePicUrl} alt="" className="mention-avatar" />
              ) : (
                <span className="mention-avatar mention-avatar-placeholder">
                  {(member.displayName || member.userName || '?').charAt(0).toUpperCase()}
                </span>
              )}
              <span className="mention-name">{member.displayName || member.userName}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Message input */}
      <form onSubmit={handleSubmit} className="message-input-form">
        <div className="input-actions-left">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="emoji-button-left"
            disabled={disabled || uploading}
            title="Add emoji"
          >
            😊
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="file-button"
            disabled={disabled || uploading}
            title="Attach file"
          >
            📎
          </button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            accept="image/*,audio/*,.pdf,.doc,.docx,.txt"
          />
        </div>

        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "You don't have permission to post" : placeholder}
            disabled={disabled || uploading}
            rows={1}
            className="message-textarea"
            aria-autocomplete={members.length > 0 ? 'list' : undefined}
          />
        </div>

        <div className="input-actions-right">
          <button
            type="submit"
            className="send-button-large"
            disabled={disabled || uploading || (!message.trim() && !selectedFile)}
            title="Send message"
            // Prevent button from stealing focus from textarea (keeps keyboard open on mobile)
            onTouchStart={(e) => e.preventDefault()}
            onMouseDown={(e) => e.preventDefault()}
          >
            {uploading ? (
              <div className="sending-spinner">⏳</div>
            ) : (
              '➤'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MessageInput;
