import React, { useState } from 'react';
import { ChatMessage as MessageType } from '../services/chatApi';
import ClickableAvatar from './ClickableAvatar';
import MediaViewer from './MediaViewer';

interface ChatMessageProps {
  message: MessageType;
  currentUser: any;
  onEdit: (messageId: string, content: string) => void;
  onDelete: (messageId: string) => void;
  onReply: (message: MessageType) => void;
  onMediaLoad?: () => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  currentUser,
  onEdit,
  onDelete,
  onReply,
  onMediaLoad
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showMediaViewer, setShowMediaViewer] = useState(false);

  // Use userId (not id) from currentUser to match message.userId
  const isOwnMessage = currentUser?.userId === message.userId;
  const isSystemMessage = message.messageType === 'SYSTEM';

  const formatTime = (timestamp: string) => {
    try {
      // Handle different timestamp formats that might come from backend
      let date: Date;

      if (Array.isArray(timestamp)) {
        // Handle array format [year, month, day, hour, minute, second, nanosecond]
        const [year, month, day, hour = 0, minute = 0, second = 0] = timestamp as number[];
        date = new Date(year, month - 1, day, hour, minute, second); // Month is 0-indexed in Date constructor
      } else {
        // Handle string format (ISO-8601 or other)
        date = new Date(timestamp);
      }

      // Validate the date
      if (isNaN(date.getTime())) {
        console.warn('Invalid timestamp format:', timestamp);
        return 'Invalid date';
      }

      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.error('Error formatting timestamp:', timestamp, error);
      return 'Invalid date';
    }
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowMediaViewer(true);
  };

  const handleEdit = () => {
    if (editContent.trim() !== message.content) {
      onEdit(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditContent(message.content);
    }
  };

  if (isSystemMessage) {
    return (
      <div className="message system-message">
        <div className="system-content">
          <span className="system-icon">ℹ️</span>
          <span className="system-text">{message.content}</span>
          <span className="system-time">{formatTime(message.timestamp)}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`message ${isOwnMessage ? 'own-message' : 'other-message'}`}
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        marginBottom: '15px',
        justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
        flexDirection: 'row',
        width: '100%'
      }}
    >
      {!isOwnMessage && (
        <ClickableAvatar
          userId={message.userId}
          profilePicUrl={message.userProfilePicUrl}
          userName={message.userName}
          size="small"
          className="message-avatar"
          style={{ order: 0, marginRight: '10px', marginLeft: 0, flexShrink: 0 }}
        />
      )}

      <div
        className="message-content"
        style={{
          maxWidth: '70%',
          display: 'flex',
          flexDirection: 'column',
          order: 1,
          alignItems: isOwnMessage ? 'flex-end' : 'flex-start'
        }}
      >
        {/* Always show header for all messages (both own and others) */}
        <div className="message-header">
          <span className="message-author">{message.userDisplayName}</span>
          <span className="message-time">{formatTime(message.timestamp)}</span>
          {message.isEdited && <span className="edited-indicator">(edited)</span>}
        </div>
        
        <div className="message-bubble">
          {isEditing ? (
            <div className="edit-mode">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleKeyPress}
                onBlur={handleEdit}
                autoFocus
                className="edit-textarea"
              />
              <div className="edit-actions">
                <button onClick={handleEdit} className="save-edit">Save</button>
                <button onClick={() => setIsEditing(false)} className="cancel-edit">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              {message.parentMessage && (
                <div className="reply-reference">
                  <div className="reply-line"></div>
                  <div className="reply-content">
                    <span className="reply-author">{message.parentMessage.userName}</span>
                    <span className="reply-text">{message.parentMessage.content}</span>
                  </div>
                </div>
              )}
              
              {message.messageType === 'IMAGE' && message.mediaUrl && (
                <div className="media-content">
                  <div
                    className="clickable-image-wrapper"
                    onClick={handleImageClick}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleImageClick(e as any);
                      }
                    }}
                    aria-label="View full image"
                    style={{ cursor: 'pointer' }}
                  >
                    <img
                      src={message.mediaUrl}
                      alt={message.content || "Shared image"}
                      className="message-image"
                      onLoad={() => onMediaLoad?.()}
                      onError={(e) => {
                        console.error('Failed to load image:', message.mediaUrl);
                        const target = e.currentTarget as HTMLImageElement;
                        target.style.display = 'none';
                        // Show fallback text
                        const fallback = document.createElement('div');
                        fallback.className = 'image-error-fallback';
                        fallback.innerHTML = `<span>🖼️ Image failed to load</span><br><small>${message.mediaFilename || 'Unknown file'}</small>`;
                        target.parentNode?.appendChild(fallback);
                        // Still trigger scroll even on error
                        onMediaLoad?.();
                      }}
                    />
                  </div>
                  {message.content && <p className="media-caption">{message.content}</p>}
                </div>
              )}

              {message.messageType === 'AUDIO' && message.mediaUrl && (
                <div className="media-content">
                  <audio controls className="message-audio">
                    <source src={message.mediaUrl} type={message.mediaType} />
                  </audio>
                  {message.content && <p className="media-caption">{message.content}</p>}
                </div>
              )}
              
              {message.messageType === 'DOCUMENT' && message.mediaUrl && (
                <div className="media-content">
                  <div className="document-preview">
                    <span className="document-icon">📄</span>
                    <div className="document-info">
                      <span className="document-name">{message.mediaFilename}</span>
                      <span className="document-size">
                        {message.mediaSize ? Math.round(message.mediaSize / 1024) + ' KB' : ''}
                      </span>
                    </div>
                    <a href={message.mediaUrl} download className="document-download">Download</a>
                  </div>
                  {message.content && <p className="media-caption">{message.content}</p>}
                </div>
              )}
              
              {(message.messageType === 'TEXT' || !message.messageType) && message.content && (
                <p className="message-text">{message.content}</p>
              )}
            </>
          )}
        </div>
        
        {message.replyCount > 0 && (
          <div className="reply-count">
            {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
          </div>
        )}
      </div>

      {isOwnMessage && (
        <ClickableAvatar
          userId={message.userId}
          profilePicUrl={message.userProfilePicUrl}
          userName={message.userName}
          size="small"
          className="message-avatar own-avatar"
          style={{ order: 2, marginLeft: '10px', marginRight: 0, flexShrink: 0 }}
        />
      )}

      {/* MediaViewer for full-screen image viewing */}
      {message.messageType === 'IMAGE' && message.mediaUrl && (
        <MediaViewer
          mediaUrls={[message.mediaUrl]}
          mediaTypes={[message.mediaType || 'image/jpeg']}
          isOpen={showMediaViewer}
          onClose={() => setShowMediaViewer(false)}
          initialIndex={0}
        />
      )}
    </div>
  );
};

export default ChatMessage;