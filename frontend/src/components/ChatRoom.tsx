import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import chatApi, { ChatGroup, ChatMessage, GroupMember } from '../services/chatApi';
import webSocketService from '../services/websocketService';
import MessageInput from './MessageInput';
import ChatMessageComponent from './ChatMessage';
import ChatMembers from './ChatMembers';
import LoadingSpinner from './LoadingSpinner';

const ChatRoom: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Format group name for direct messages - remove current user's name
  const formatDirectMessageName = (group: ChatGroup | null): string => {
    if (!group || group.type !== 'DIRECT_MESSAGE' || !user?.name) {
      return group?.name || '';
    }
    
    // Direct message names are formatted as "User1 & User2"
    const names = group.name.split(' & ').map(n => n.trim());
    const otherNames = names.filter(name => name !== user.name);
    
    // Return the other person's name(s), or fallback to original if something went wrong
    return otherNames.length > 0 ? otherNames.join(' & ') : group.name;
  };
  
  const [group, setGroup] = useState<ChatGroup | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastTypingTime = useRef<number>(0);

  // WebSocket cleanup functions
  const unsubscribeFunctions = useRef<(() => void)[]>([]);

  const connectWebSocket = useCallback(async () => {
    if (!groupId) return;

    try {
      await webSocketService.connect();

      // Subscribe to group messages
      const unsubMessages = webSocketService.subscribeToGroupMessages(groupId, (message: ChatMessage) => {
        console.log('💬 ChatRoom received message via WebSocket:', message);
        setMessages(prev => {
          // Check if message already exists (avoid duplicates)
          if (prev.find(m => m.id === message.id || m.tempId === message.tempId)) {
            console.log('🔄 Updating existing message:', message.id || message.tempId);
            // Update existing message (for edited messages)
            return prev.map(m =>
              (m.id === message.id || m.tempId === message.tempId) ? message : m
            );
          }
          console.log('✨ Adding new message to chat:', message.id || message.tempId);
          return [...prev, message];
        });

        // Auto-scroll if user is at bottom
        scrollToBottom();
      });

      // Subscribe to typing indicators
      const unsubTyping = webSocketService.subscribeToTyping(groupId, (typing) => {
        console.log('⌨️ Typing indicator received:', typing);
        if (typing.userId !== user?.email) {
          setTypingUsers(prev => {
            const newSet = new Set(prev);
            if (typing.isTyping) {
              newSet.add(typing.userId);
            } else {
              newSet.delete(typing.userId);
            }
            return newSet;
          });
        }
      });

      // Subscribe to group notifications
      const unsubNotifications = webSocketService.subscribeToGroupNotifications(groupId, (notification) => {
        console.log('Group notification:', notification);
        // Handle user join/leave notifications
        if (notification.type === 'user_joined' || notification.type === 'user_left') {
          loadMembers(); // Refresh member list
        }
      });

      // Subscribe to errors
      const unsubErrors = webSocketService.subscribeToErrors((error) => {
        console.error('WebSocket error:', error);
        setError(error.message || 'Connection error');
      });

      // Store unsubscribe functions
      unsubscribeFunctions.current = [unsubMessages, unsubTyping, unsubNotifications, unsubErrors];

    } catch (err) {
      console.error('Failed to connect to WebSocket:', err);
    }
  }, [groupId, user?.email]); // Add dependencies for loadMembers later

  const loadChatRoom = useCallback(async () => {
    if (!groupId) return;

    try {
      setLoading(true);
      setError(null);

      // Load group, messages, and members in parallel
      const [groupsResponse, messagesResponse, membersResponse] = await Promise.all([
        chatApi.getGroups(),
        chatApi.getMessages(groupId, 0, 50),
        chatApi.getGroupMembers(groupId)
      ]);

      const currentGroup = groupsResponse.find(g => g.id === groupId);
      if (!currentGroup) {
        setError('Chat group not found');
        return;
      }

      setGroup(currentGroup);
      setMessages(messagesResponse.content.reverse()); // Reverse to show oldest first
      setMembers(membersResponse);
      setHasMoreMessages(messagesResponse.number < messagesResponse.totalPages - 1);

      // Connect to WebSocket and subscribe to this group
      await connectWebSocket();

      // Mark messages as read
      chatApi.markAsRead(groupId);

    } catch (err) {
      setError('Failed to load chat room');
      console.error('Error loading chat room:', err);
    } finally {
      setLoading(false);
    }
  }, [groupId, connectWebSocket]);

  useEffect(() => {
    if (!groupId) {
      navigate('/chats');
      return;
    }

    loadChatRoom();
    
    return () => {
      // Cleanup WebSocket subscriptions
      unsubscribeFunctions.current.forEach(unsub => unsub());
      unsubscribeFunctions.current = [];
    };
  }, [groupId, loadChatRoom, navigate]);

  const loadMoreMessages = async () => {
    if (!groupId || !hasMoreMessages) return;

    try {
      const nextPage = page + 1;
      const response = await chatApi.getMessages(groupId, nextPage, 50);
      
      setMessages(prev => [...response.content.reverse(), ...prev]);
      setPage(nextPage);
      setHasMoreMessages(nextPage < response.totalPages - 1);
    } catch (err) {
      console.error('Error loading more messages:', err);
    }
  };

  const loadMembers = async () => {
    if (!groupId) return;
    
    try {
      const membersResponse = await chatApi.getGroupMembers(groupId);
      setMembers(membersResponse);
    } catch (err) {
      console.error('Error loading members:', err);
    }
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // 📱 Scroll to bottom when chat initially loads to show message input
  useEffect(() => {
    if (!loading && messages.length > 0) {
      // Small delay to ensure DOM has rendered
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [loading, scrollToBottom]); // Only trigger when loading state changes

  const handleSendMessage = async (content: string, file?: File, parentMessageId?: string) => {
    if (!groupId || (!content.trim() && !file)) return;

    const tempId = `temp-${Date.now()}`;
    
    try {
      if (file) {
        // Send media message
        await chatApi.sendMediaMessage(groupId, file, content || undefined, parentMessageId, tempId);
      } else {
        // Send text message
        const messageRequest = {
          chatGroupId: groupId,
          content: content.trim(),
          parentMessageId,
          tempId
        };

        // Send via WebSocket for real-time delivery
        webSocketService.sendMessage(groupId, messageRequest);
      }

      // Stop typing indicator
      webSocketService.sendTypingStatus(groupId, false);
      
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    }
  };

  const handleTyping = useCallback(() => {
    if (!groupId) return;

    const now = Date.now();
    lastTypingTime.current = now;

    // Send typing indicator
    webSocketService.sendTypingStatus(groupId, true);

    // Stop typing after 3 seconds of inactivity
    setTimeout(() => {
      if (Date.now() - lastTypingTime.current >= 2900) {
        webSocketService.sendTypingStatus(groupId, false);
      }
    }, 3000);
  }, [groupId]);

  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      await chatApi.editMessage(messageId, newContent);
    } catch (err) {
      console.error('Error editing message:', err);
      setError('Failed to edit message');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await chatApi.deleteMessage(messageId);
    } catch (err) {
      console.error('Error deleting message:', err);
      setError('Failed to delete message');
    }
  };

  const handleLeaveGroup = async () => {
    if (!groupId || !window.confirm('Are you sure you want to leave this group?')) return;

    try {
      await chatApi.leaveGroup(groupId);
      navigate('/chats');
    } catch (err) {
      console.error('Error leaving group:', err);
      setError('Failed to leave group');
    }
  };

  if (loading) {
    return (
      <div className="chat-room loading">
        <LoadingSpinner type="multi-ring" size="medium" text="Loading chat room..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="chat-room error">
        <div className="error-content">
          <h3>⚠️ Error</h3>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={loadChatRoom} className="retry-button">Try Again</button>
            <button onClick={() => navigate('/chats')} className="back-button">Back to Chats</button>
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="chat-room error">
        <div className="error-content">
          <h3>📭 Group Not Found</h3>
          <p>This chat group doesn't exist or you don't have access to it.</p>
          <button onClick={() => navigate('/chats')} className="back-button">Back to Chats</button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-room">
      {/* Chat Header */}
      <div className="chat-header">
        <div className="header-left">
          <button 
            onClick={() => navigate('/chats')} 
            className="back-button"
          >
            ← Back
          </button>
          <div className="group-info">
            <div className="group-icon">
              {group.imageUrl ? (
                <img src={group.imageUrl} alt={group.name} />
              ) : (
                <span>💬</span>
              )}
            </div>
            <div className="group-details">
              <h3>{formatDirectMessageName(group)}</h3>
              <p>{members.length} members</p>
            </div>
          </div>
        </div>
        <div className="header-right">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="back-home-button"
          >
            🏠 Home
          </button>
          <button 
            onClick={() => setShowMembers(!showMembers)}
            className={`members-button ${showMembers ? 'active' : ''}`}
          >
            👥 Members
          </button>
          {group.canModerate && (
            <button className="settings-button">⚙️</button>
          )}
          <button onClick={handleLeaveGroup} className="leave-button">
            🚪 Leave
          </button>
        </div>
      </div>

      <div className="chat-content">
        {/* Messages Area */}
        <div className="messages-section">
          <div 
            className="messages-container" 
            ref={messagesContainerRef}
            onScroll={(e) => {
              const { scrollTop } = e.currentTarget;
              if (scrollTop === 0 && hasMoreMessages) {
                loadMoreMessages();
              }
            }}
          >
            {hasMoreMessages && (
              <div className="load-more">
                <button onClick={loadMoreMessages} className="load-more-button">
                  Load Earlier Messages
                </button>
              </div>
            )}
            
            {messages.map((message) => (
              <ChatMessageComponent
                key={message.id || message.tempId}
                message={message}
                currentUser={user}
                onEdit={handleEditMessage}
                onDelete={handleDeleteMessage}
                onReply={(msg: ChatMessage) => {/* Handle reply */}}
              />
            ))}
            
            {/* Typing indicators */}
            {typingUsers.size > 0 && (
              <div className="typing-indicators">
                <div className="typing-animation">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="typing-text">
                  {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                </span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <MessageInput
            onSendMessage={handleSendMessage}
            onTyping={handleTyping}
            placeholder={`Message ${formatDirectMessageName(group)}...`}
            disabled={!group.canPost}
          />

          {!group.canPost && (
            <div className="cannot-post-notice">
              You don't have permission to post in this group
            </div>
          )}
        </div>

        {/* Members Panel */}
        {showMembers && (
          <ChatMembers 
            members={members}
            currentUser={user}
            group={group}
            onClose={() => setShowMembers(false)}
          />
        )}
      </div>
    </div>
  );
};

export default ChatRoom;