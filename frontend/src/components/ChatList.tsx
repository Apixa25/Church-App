import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import chatApi, { ChatGroup } from '../services/chatApi';
import UserList from './UserList';
import CreateGroup from './CreateGroup';

interface ChatListProps {
  onGroupSelect?: (group: ChatGroup) => void;
  selectedGroupId?: string;
}

const ChatList: React.FC<ChatListProps> = ({ onGroupSelect, selectedGroupId }) => {
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [joinableGroups, setJoinableGroups] = useState<ChatGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Removed showJoinable state as we now use activeView for navigation
  const [activeView, setActiveView] = useState<'myChats' | 'joinGroups' | 'directMessages' | 'createGroup'>('myChats');
  const navigate = useNavigate();

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const [userGroups, availableGroups] = await Promise.all([
        chatApi.getGroups(),
        chatApi.getJoinableGroups()
      ]);
      setGroups(userGroups);
      setJoinableGroups(availableGroups);
    } catch (err) {
      setError('Failed to load chat groups');
      console.error('Error loading groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGroupClick = (group: ChatGroup) => {
    if (onGroupSelect) {
      onGroupSelect(group);
    } else {
      navigate(`/chats/${group.id}`);
    }
  };

  const handleJoinGroup = async (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await chatApi.joinGroup(groupId);
      loadGroups(); // Refresh the lists
    } catch (err) {
      console.error('Error joining group:', err);
    }
  };

  const getGroupIcon = (type: string) => {
    const icons: Record<string, string> = {
      MAIN: '⛪',
      SUBGROUP: '👥',
      PRIVATE: '🔒',
      PRAYER: '🙏',
      MINISTRY: '✝️',
      STUDY: '📖',
      YOUTH: '🌟',
      MENS: '👨‍👥',
      WOMENS: '👩‍👥',
      LEADERSHIP: '👑',
      ANNOUNCEMENT: '📢',
      EVENT: '📅',
      DIRECT_MESSAGE: '💬'
    };
    return icons[type] || '💬';
  };

  const formatLastMessageTime = (timestamp: string) => {
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
      
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
      
      if (diffInMinutes < 1) {
        return 'Just now';
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes}m`;
      } else if (diffInHours < 24) {
        return `${diffInHours}h`;
      } else {
        return diffInDays === 1 ? '1d' : `${diffInDays}d`;
      }
    } catch (error) {
      console.error('Error formatting timestamp:', timestamp, error);
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <div className="chat-list loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading chats...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chat-list error">
        <p>{error}</p>
        <button onClick={loadGroups} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="chat-list">
      <div className="chat-list-header">
        <div className="header-left">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="back-home-button"
          >
            🏠 Back Home
          </button>
          <h2>💬 Chats</h2>
        </div>
        <div className="header-actions">
          <button 
            onClick={() => setActiveView('myChats')}
            className={`nav-btn ${activeView === 'myChats' ? 'active' : ''}`}
          >
            👥 My Chats
          </button>
          <button 
            onClick={() => setActiveView('directMessages')}
            className={`nav-btn ${activeView === 'directMessages' ? 'active' : ''}`}
          >
            💬 Direct Messages
          </button>
          <button 
            onClick={() => setActiveView('joinGroups')}
            className={`nav-btn ${activeView === 'joinGroups' ? 'active' : ''}`}
          >
            🔍 Join Groups
          </button>
          <button 
            onClick={() => setActiveView('createGroup')}
            className={`nav-btn create-btn ${activeView === 'createGroup' ? 'active' : ''}`}
          >
            ➕ Create Group
          </button>
        </div>
      </div>

      {activeView === 'joinGroups' ? (
        <div className="joinable-groups">
          <h3>Available Groups</h3>
          {joinableGroups.length === 0 ? (
            <div className="empty-state">
              <p>🌟 No new groups to join</p>
              <p>You're part of all available public groups!</p>
            </div>
          ) : (
            <div className="groups-list">
              {joinableGroups.map((group) => (
                <div key={group.id} className="chat-item joinable">
                  <div className="chat-icon">
                    {group.imageUrl ? (
                      <img src={group.imageUrl} alt={group.name} />
                    ) : (
                      <span>{getGroupIcon(group.type)}</span>
                    )}
                  </div>
                  <div className="chat-content">
                    <div className="chat-header">
                      <h4>{group.name}</h4>
                      <span className="member-count">{group.memberCount} members</span>
                    </div>
                    <p className="group-description">{group.description || 'No description'}</p>
                    <div className="group-type">{group.type.replace('_', ' ').toLowerCase()}</div>
                  </div>
                  <div className="chat-actions">
                    <button 
                      onClick={(e) => handleJoinGroup(group.id, e)}
                      className="join-button"
                    >
                      Join
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeView === 'directMessages' ? (
        <UserList />
      ) : activeView === 'createGroup' ? (
        <CreateGroup 
          onGroupCreated={(groupId) => {
            // Refresh groups and switch to My Chats view
            loadGroups();
            setActiveView('myChats');
          }}
          onCancel={() => setActiveView('myChats')}
        />
      ) : (
        <div className="user-groups">
          {groups.length === 0 ? (
            <div className="empty-state">
              <p>👋 Welcome to Church Chat!</p>
              <p>Join a group to start chatting with your church family</p>
              <button 
                onClick={() => setActiveView('joinGroups')}
                className="primary-button"
              >
                Find Groups to Join
              </button>
            </div>
          ) : (
            <div className="groups-list">
              {groups.map((group) => (
                <div 
                  key={group.id} 
                  className={`chat-item ${selectedGroupId === group.id ? 'selected' : ''}`}
                  onClick={() => handleGroupClick(group)}
                >
                  <div className="chat-icon">
                    {group.imageUrl ? (
                      <img src={group.imageUrl} alt={group.name} />
                    ) : (
                      <span>{getGroupIcon(group.type)}</span>
                    )}
                    {group.unreadCount > 0 && (
                      <span className="unread-badge">{group.unreadCount}</span>
                    )}
                  </div>
                  <div className="chat-content">
                    <div className="chat-header">
                      <h4>{group.name}</h4>
                      {group.lastMessageTime && (
                        <span className="last-message-time">
                          {formatLastMessageTime(group.lastMessageTime)}
                        </span>
                      )}
                    </div>
                    {group.lastMessage ? (
                      <p className="last-message">
                        <span className="last-message-by">{group.lastMessageBy}:</span>
                        {group.lastMessage}
                      </p>
                    ) : (
                      <p className="no-messages">No messages yet</p>
                    )}
                  </div>
                  {group.unreadCount > 0 && (
                    <div className="unread-indicator">
                      <span className="unread-count">{group.unreadCount}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatList;