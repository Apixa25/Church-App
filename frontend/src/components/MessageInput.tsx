import React, { useState, useRef, useCallback } from 'react';

interface MessageInputProps {
  onSendMessage: (content: string, file?: File, parentMessageId?: string) => void;
  onTyping: () => void;
  placeholder?: string;
  disabled?: boolean;
  replyingTo?: any;
  onCancelReply?: () => void;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTyping,
  placeholder = 'Type a message...',
  disabled = false,
  replyingTo,
  onCancelReply
}) => {
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const commonEmojis = ['😊', '😂', '❤️', '👍', '👎', '😢', '😮', '😠', '🙏', '🎉', '💯', '🔥'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (disabled) return;
    
    const trimmedMessage = message.trim();
    if (!trimmedMessage && !selectedFile) return;

    try {
      setUploading(true);
      await onSendMessage(
        trimmedMessage, 
        selectedFile || undefined, 
        replyingTo?.id
      );
      
      // Clear input after successful send
      setMessage('');
      setSelectedFile(null);
      if (onCancelReply) onCancelReply();
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Error sending message:', error);
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
    
    // Trigger typing indicator
    if (value.length > 0) {
      onTyping();
    }
  }, [onTyping]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      
      // Check file type
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm',
        'audio/mp3', 'audio/wav', 'audio/ogg',
        'application/pdf', 'text/plain',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        alert('File type not supported');
        return;
      }
      
      setSelectedFile(file);
    }
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
            <span className="reply-label">Replying to {replyingTo.userName}:</span>
            <span className="reply-text">{replyingTo.content}</span>
          </div>
          <button onClick={onCancelReply} className="cancel-reply">✕</button>
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
          <button onClick={removeFile} className="remove-file">✕</button>
        </div>
      )}

      {/* Emoji picker */}
      {showEmojiPicker && (
        <div className="emoji-picker">
          <div className="emoji-grid">
            {commonEmojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => insertEmoji(emoji)}
                className="emoji-button"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message input */}
      <form onSubmit={handleSubmit} className="message-input-form">
        <div className="input-actions-left">
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
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
          />
        </div>

        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={disabled ? "You don't have permission to post" : placeholder}
            disabled={disabled || uploading}
            rows={1}
            className="message-textarea"
          />
        </div>

        <div className="input-actions-right">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="emoji-button"
            disabled={disabled || uploading}
            title="Add emoji"
          >
            😊
          </button>
          <button
            type="submit"
            className="send-button"
            disabled={disabled || uploading || (!message.trim() && !selectedFile)}
            title="Send message"
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