import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import chatApi, { ChatGroup } from '../services/chatApi';
import UserList from './UserList';
import CreateGroup from './CreateGroup';
import { useOrganization } from '../contexts/OrganizationContext';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

interface ChatListProps {
  onGroupSelect?: (group: ChatGroup) => void;
  selectedGroupId?: string;
}

const formatGroupType = (type: string) => {
  return type
    .split('_')
    .map((segment) => segment.charAt(0) + segment.slice(1).toLowerCase())
    .join(' ');
};

const ChatList: React.FC<ChatListProps> = ({ onGroupSelect, selectedGroupId }) => {
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [joinableGroups, setJoinableGroups] = useState<ChatGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Removed showJoinable state as we now use activeView for navigation
  const [activeView, setActiveView] = useState<'myChats' | 'joinGroups' | 'directory' | 'createGroup'>('myChats');
  const { allMemberships, loading: organizationLoading } = useOrganization();
  const { user } = useAuth();
  const hasAnyOrganization = allMemberships.length > 0;
  const navigate = useNavigate();

  useEffect(() => {
    if (organizationLoading) {
      return;
    }
    loadGroups();
  }, [organizationLoading, hasAnyOrganization]);

  const loadGroups = async (shouldFetchJoinable: boolean = hasAnyOrganization) => {
    try {
      setLoading(true);
      const [userGroups, availableGroups] = await Promise.all([
        chatApi.getGroups(),
        shouldFetchJoinable ? chatApi.getJoinableGroups() : Promise.resolve([] as ChatGroup[])
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

  const handleDeleteChat = async (groupId: string, groupName: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent navigation to chat

    if (!window.confirm(`Delete this conversation?\n\nThis will remove "${groupName}" from your chats.`)) {
      return;
    }

    try {
      await chatApi.leaveGroup(groupId);

      // Remove from local state immediately for responsive UI
      setGroups(prev => prev.filter(g => g.id !== groupId));

      console.log(`Successfully deleted chat: ${groupName}`);
    } catch (err) {
      console.error('Error deleting chat:', err);
      alert('Failed to delete conversation. Please try again.');
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

  // Format group name for direct messages - remove current user's name
  const formatDirectMessageName = (group: ChatGroup): string => {
    if (group.type !== 'DIRECT_MESSAGE' || !user?.name) {
      return group.name;
    }
    
    // Direct message names are formatted as "User1 & User2"
    const names = group.name.split(' & ').map(n => n.trim());
    const otherNames = names.filter(name => name !== user.name);
    
    // Return the other person's name(s), or fallback to original if something went wrong
    return otherNames.length > 0 ? otherNames.join(' & ') : group.name;
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
        <LoadingSpinner type="multi-ring" size="medium" text="Loading chats..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="chat-list error">
        <p>{error}</p>
        <button onClick={() => loadGroups()} className="retry-button">
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
            onClick={() => setActiveView('directory')}
            className={`nav-btn ${activeView === 'directory' ? 'active' : ''}`}
          >
            📖 Directory
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
          {!hasAnyOrganization ? (
            <div className="empty-state">
              <p>🙏 Join an organization to discover its chat groups.</p>
              <p>You can still create a new group or accept invite links anytime.</p>
              <button
                onClick={() => setActiveView('createGroup')}
                className="primary-button"
              >
                Create a Group
              </button>
            </div>
          ) : joinableGroups.length === 0 ? (
            <div className="empty-state">
              <p>🌟 No new groups to join</p>
              <p>You're part of all available public groups!</p>
            </div>
          ) : (
            <div className="groups-list">
              {joinableGroups.map((group) => (
                <div key={group.id} className="chat-item joinable">
                  <div className="chat-icon joinable-icon">
                    {group.imageUrl ? (
                      <img src={group.imageUrl} alt={group.name} />
                    ) : (
                      <span>{getGroupIcon(group.type)}</span>
                    )}
                  </div>
                  <div className="joinable-body">
                    <div className="joinable-header">
                      <h4>{group.name}</h4>
                      <div className="joinable-badges">
                        <span className="badge members-badge">{group.memberCount} members</span>
                        <span className="badge type-badge">{formatGroupType(group.type)}</span>
                      </div>
                    </div>
                    <p className="group-description">{group.description || 'No description'}</p>
                    <div className="joinable-footer">
                      <span className="group-type">
                        {formatGroupType(group.type)} group
                      </span>
                      <div className="chat-actions joinable-actions">
                        <button 
                          onClick={(e) => handleJoinGroup(group.id, e)}
                          className="join-button"
                        >
                          Join
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeView === 'directory' ? (
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
            hasAnyOrganization ? (
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
            ) : null
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
                      <h4 className="chat-name">{formatDirectMessageName(group)}</h4>
                      {group.lastMessageTime && (
                        <span className="last-message-time">
                          {formatLastMessageTime(group.lastMessageTime)}
                        </span>
                      )}
                    </div>
                    {group.lastMessageTime ? (
                      group.lastMessage ? (
                        <p className="last-message">
                          {group.lastMessageBy && (
                            <span className="last-message-by">{group.lastMessageBy}: </span>
                          )}
                          <span className="last-message-text">{group.lastMessage}</span>
                        </p>
                      ) : (
                        <p className="last-message-empty">New conversation</p>
                      )
                    ) : (
                      <p className="no-messages">No messages yet</p>
                    )}
                  </div>
                  {group.unreadCount > 0 && (
                    <div className="unread-indicator">
                      <span className="unread-count">{group.unreadCount}</span>
                    </div>
                  )}
                  <button
                    className="chat-delete-btn"
                    onClick={(e) => handleDeleteChat(group.id, formatDirectMessageName(group), e)}
                    title="Delete conversation"
                    aria-label={`Delete ${formatDirectMessageName(group)}`}
                  >
                    🗑️
                  </button>
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