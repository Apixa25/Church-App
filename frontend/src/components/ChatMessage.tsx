import React, { useState } from 'react';
import { ChatMessage as MessageType } from '../services/chatApi';

interface ChatMessageProps {
  message: MessageType;
  currentUser: any;
  onEdit: (messageId: string, content: string) => void;
  onDelete: (messageId: string) => void;
  onReply: (message: MessageType) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  currentUser, 
  onEdit, 
  onDelete, 
  onReply 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showActions, setShowActions] = useState(false);

  const isOwnMessage = currentUser?.email === message.userId;
  const isSystemMessage = message.messageType === 'SYSTEM';
  
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
    <div className={`message ${isOwnMessage ? 'own-message' : 'other-message'}`}>
      {!isOwnMessage && (
        <div className="message-avatar">
          {message.userProfilePicUrl ? (
            <img src={message.userProfilePicUrl} alt={message.userName} />
          ) : (
            <div className="avatar-placeholder">
              {message.userName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      )}
      
      <div className="message-content">
        {!isOwnMessage && (
          <div className="message-header">
            <span className="message-author">{message.userDisplayName}</span>
            <span className="message-time">{formatTime(message.timestamp)}</span>
            {message.isEdited && <span className="edited-indicator">(edited)</span>}
          </div>
        )}
        
        <div 
          className="message-bubble"
          onMouseEnter={() => setShowActions(true)}
          onMouseLeave={() => setShowActions(false)}
        >
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
                  <img src={message.mediaUrl} alt="Shared image" className="message-image" />
                  {message.content && <p className="media-caption">{message.content}</p>}
                </div>
              )}
              
              {message.messageType === 'VIDEO' && message.mediaUrl && (
                <div className="media-content">
                  <video controls className="message-video">
                    <source src={message.mediaUrl} type={message.mediaType} />
                  </video>
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
              
              {(message.messageType === 'TEXT' || !message.messageType) && (
                <p className="message-text">{message.content}</p>
              )}
            </>
          )}
          
          {isOwnMessage && (
            <div className="own-message-footer">
              <span className="message-time">{formatTime(message.timestamp)}</span>
              {message.isEdited && <span className="edited-indicator">(edited)</span>}
            </div>
          )}
          
          {showActions && !isEditing && (
            <div className="message-actions">
              <button onClick={() => onReply(message)} className="action-btn reply-btn">
                💬
              </button>
              {message.canEdit && (
                <button onClick={() => setIsEditing(true)} className="action-btn edit-btn">
                  ✏️
                </button>
              )}
              {message.canDelete && (
                <button 
                  onClick={() => {
                    if (confirm('Delete this message?')) {
                      onDelete(message.id);
                    }
                  }} 
                  className="action-btn delete-btn"
                >
                  🗑️
                </button>
              )}
            </div>
          )}
        </div>
        
        {message.replyCount > 0 && (
          <div className="reply-count">
            {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;