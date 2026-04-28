import React, { useState } from 'react';
import chatApi, { ChatMessage as MessageType } from '../services/chatApi';
import MediaViewer from './MediaViewer';

interface ChatMessageProps {
  message: MessageType;
  currentUser: any;
  isCompact?: boolean;
  showAuthor?: boolean;
  onEdit: (messageId: string, content: string) => void;
  onDelete: (messageId: string) => void;
  onReply: (message: MessageType) => void;
  onReport?: (message: MessageType) => void;
  onMediaLoad?: () => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  currentUser,
  isCompact = false,
  showAuthor = true,
  onEdit,
  onDelete,
  onReply,
  onReport,
  onMediaLoad
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isDownloadingDocument, setIsDownloadingDocument] = useState(false);

  // Use userId (not id) from currentUser to match message.userId
  const isOwnMessage = currentUser?.userId === message.userId;
  const isSystemMessage = message.messageType === 'SYSTEM';

  const formatTime = (timestamp: string) => {
    try {
      // Handle null/undefined timestamp (new messages before server confirms)
      if (!timestamp) {
        return 'Just now';
      }

      // Handle different timestamp formats that might come from backend
      let date: Date;

      if (Array.isArray(timestamp)) {
        // Handle array format [year, month, day, hour, minute, second, nanosecond]
        const [year, month, day, hour = 0, minute = 0, second = 0] = timestamp as number[];
        // Create as UTC then convert to local
        date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
      } else {
        // Handle string format (ISO-8601 or other)
        // Backend sends UTC timestamps without 'Z' suffix - append it to parse correctly
        if (typeof timestamp === 'string' && timestamp.includes('T') && !timestamp.includes('Z') && !timestamp.includes('+') && !timestamp.includes('-', timestamp.indexOf('T'))) {
          date = new Date(timestamp + 'Z');
        } else {
          date = new Date(timestamp);
        }
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
    setShowActions(false);
  };

  const handleDocumentDownload = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!message.mediaUrl) return;

    const fallbackFilename = 'chat-document';
    const filename = (message.mediaFilename || fallbackFilename).replace(/[\\/:*?"<>|]/g, '_');

    try {
      setIsDownloadingDocument(true);

      console.info('[ChatDocumentDownload] Starting backend download', {
        messageId: message.id,
        filename,
        mediaType: message.mediaType,
        mediaSize: message.mediaSize
      });

      const blob = await chatApi.downloadMessageMedia(message.id);
      console.info('[ChatDocumentDownload] Backend download succeeded', {
        messageId: message.id,
        blobSize: blob.size,
        blobType: blob.type
      });

      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('[ChatDocumentDownload] Backend download failed without navigating away', {
        messageId: message.id,
        filename,
        mediaUrl: message.mediaUrl,
        error
      });
      window.alert('We could not download this file yet, but the app stayed open. Please send the console log to support.');
    } finally {
      setIsDownloadingDocument(false);
    }
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
      className={`message ${isOwnMessage ? 'own-message' : 'other-message'} ${isCompact ? 'message-compact' : ''}`}
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        marginBottom: isCompact ? '3px' : '12px',
        justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
        flexDirection: 'row',
        width: '100%'
      }}
    >
      <div
        className={`message-content ${showActions ? 'actions-open' : ''}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          order: 1,
          alignItems: isOwnMessage ? 'flex-end' : 'flex-start'
        }}
      >
        {!isOwnMessage && showAuthor && !isCompact && (
          <div className="message-header">
            <span className="message-author">{message.userDisplayName}</span>
          </div>
        )}
        
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
              
              {message.isDeleted ? (
                <p className="message-text deleted-message-text">Message deleted</p>
              ) : message.messageType === 'IMAGE' && message.mediaUrl && (
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

              {!message.isDeleted && message.messageType === 'AUDIO' && message.mediaUrl && (
                <div className="media-content">
                  <audio controls className="message-audio">
                    <source src={message.mediaUrl} type={message.mediaType} />
                  </audio>
                  {message.content && <p className="media-caption">{message.content}</p>}
                </div>
              )}
              
              {!message.isDeleted && message.messageType === 'DOCUMENT' && message.mediaUrl && (
                <div className="media-content">
                  <div className="document-preview">
                    <span className="document-icon">📄</span>
                    <div className="document-info">
                      <span className="document-name">{message.mediaFilename}</span>
                      <span className="document-size">
                        {message.mediaSize ? Math.round(message.mediaSize / 1024) + ' KB' : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="document-download"
                      onClick={handleDocumentDownload}
                      disabled={isDownloadingDocument}
                    >
                      {isDownloadingDocument ? 'Opening...' : 'Download'}
                    </button>
                  </div>
                  {message.content && <p className="media-caption">{message.content}</p>}
                </div>
              )}
              
              {!message.isDeleted && (message.messageType === 'TEXT' || !message.messageType) && message.content && (
                <p className="message-text">{message.content}</p>
              )}

              {!message.isDeleted && (
                <>
                  <span className="message-inline-time">
                    {formatTime(message.timestamp)}
                    {message.isEdited && <span className="edited-indicator"> edited</span>}
                  </span>

                  <button
                    type="button"
                    className="message-options-button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setShowActions(prev => !prev);
                    }}
                    aria-label="Message options"
                    aria-expanded={showActions}
                  >
                    ...
                  </button>

                  {showActions && (
                    <div className="message-actions">
                      <button className="action-btn" onClick={() => { onReply(message); setShowActions(false); }} title="Reply">
                        Reply
                      </button>
                      {message.canEdit && (
                        <button className="action-btn" onClick={() => { setIsEditing(true); setShowActions(false); }} title="Edit">
                          Edit
                        </button>
                      )}
                      {message.canDelete && (
                        <button className="action-btn danger" onClick={() => { onDelete(message.id); setShowActions(false); }} title="Delete">
                          Delete
                        </button>
                      )}
                      {!isOwnMessage && onReport && (
                        <button className="action-btn danger" onClick={() => { onReport(message); setShowActions(false); }} title="Report">
                          Report
                        </button>
                      )}
                    </div>
                  )}
                </>
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