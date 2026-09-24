import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import chatApi, { ChatGroup } from '../services/chatApi';
import UserList from './UserList';
import CreateGroup from './CreateGroup';
import { useOrganization } from '../contexts/OrganizationContext';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import ConfirmationModal from './ConfirmationModal';
import { formatRelativeShort } from '../utils/serverTime';

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
  const [joinableGroups, setJoinableGroups] = useState<ChatGroup[]>([]);
  const [activeView, setActiveView] = useState<'myChats' | 'joinGroups' | 'directory' | 'createGroup'>('myChats');
  const { allMemberships, loading: organizationLoading } = useOrganization();
  const { user } = useAuth();
  const hasAnyOrganization = allMemberships.length > 0;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [joinableLoaded, setJoinableLoaded] = useState(false);
  const [joinableLoading, setJoinableLoading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ groupId: string; name: string } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: groups = [],
    isLoading: loading,
    error: queryError,
    refetch: refetchGroups,
  } = useQuery({
    queryKey: ['chatGroups'],
    queryFn: () => chatApi.getGroups(),
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !organizationLoading,
  });

  const error = queryError ? 'Failed to load chat groups' : null;

  const loadGroups = async () => {
    refetchGroups();
  };

  const loadJoinableGroups = async () => {
    if (!hasAnyOrganization || joinableLoaded) return;
    try {
      setJoinableLoading(true);
      const available = await chatApi.getJoinableGroups();
      setJoinableGroups(available);
      setJoinableLoaded(true);
    } catch (err) {
      console.error('Error loading joinable groups:', err);
    } finally {
      setJoinableLoading(false);
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
      loadGroups();
      setJoinableLoaded(false);
      loadJoinableGroups();
    } catch (err: any) {
      console.error('Error joining group:', err);
      setActionError(err?.response?.data?.error || 'Could not join that group.');
    }
  };

  const handleDeleteChat = (groupId: string, groupName: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent navigation to chat
    setPendingDelete({ groupId, name: groupName });
  };

  const confirmDeleteChat = async () => {
    if (!pendingDelete) return;
    setDeleteBusy(true);
    try {
      await chatApi.leaveGroup(pendingDelete.groupId);

      queryClient.setQueryData<ChatGroup[]>(['chatGroups'], (old) =>
        old ? old.filter(g => g.id !== pendingDelete.groupId) : old
      );
      setPendingDelete(null);
    } catch (err) {
      console.error('Error deleting chat:', err);
      setPendingDelete(null);
      setActionError('Failed to delete conversation. Please try again.');
    } finally {
      setDeleteBusy(false);
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

  // DMs: prefer the other participant from the server, fall back to parsing "User1 & User2"
  const formatDirectMessageName = (group: ChatGroup): string => {
    if (group.type !== 'DIRECT_MESSAGE') {
      return group.name;
    }
    const other = group.recentMembers?.[0];
    if (other) {
      return other.displayName || other.userName;
    }
    if (!user?.name) {
      return group.name;
    }
    const names = group.name.split(' & ').map(n => n.trim());
    const otherNames = names.filter(name => name !== user.name);
    return otherNames.length > 0 ? otherNames.join(' & ') : group.name;
  };

  const getDirectMessageAvatar = (group: ChatGroup): string | undefined =>
    group.recentMembers?.[0]?.profilePicUrl || group.otherUserProfilePic;

  const formatLastMessageTime = (timestamp: string) => formatRelativeShort(timestamp);

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
            onClick={() => navigate('/chat/search')}
            className="nav-btn"
          >
            Search Chats
          </button>
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
            onClick={() => { setActiveView('joinGroups'); loadJoinableGroups(); }}
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
          ) : joinableLoading ? (
            <LoadingSpinner type="multi-ring" size="small" text="Finding groups..." />
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
                    {group.type === 'DIRECT_MESSAGE' && getDirectMessageAvatar(group) ? (
                      <img src={getDirectMessageAvatar(group)} alt={formatDirectMessageName(group)} className="user-avatar" />
                    ) : group.imageUrl ? (
                      <img src={group.imageUrl} alt={group.name} />
                    ) : (
                      <span>{getGroupIcon(group.type)}</span>
                    )}
                  </div>
                  <div className="chat-content">
                    <div className="chat-header">
                      <h4 className="chat-name">
                        {formatDirectMessageName(group)}
                        {group.notificationsEnabled === false && (
                          <span className="chat-muted-indicator" title="Notifications muted" aria-label="Notifications muted"> 🔕</span>
                        )}
                      </h4>
                    </div>
                    {group.lastMessageTime ? (
                      group.lastMessage ? (
                        <p className="last-message">
                          {group.type !== 'DIRECT_MESSAGE' && group.lastMessageBy && (
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
                  <div className="chat-row-meta">
                    {group.lastMessageTime && (
                      <span className="last-message-time">
                        {formatLastMessageTime(group.lastMessageTime)}
                      </span>
                    )}
                    {group.unreadCount > 0 && (
                      <span className="unread-count">{group.unreadCount}</span>
                    )}
                    <button
                      className="chat-delete-btn"
                      onClick={(e) => handleDeleteChat(group.id, formatDirectMessageName(group), e)}
                      title="Delete conversation"
                      aria-label={`Delete ${formatDirectMessageName(group)}`}
                    >
                      ...
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {actionError && (
        <div className="chat-inline-error" role="alert">
          <span>⚠️ {actionError}</span>
          <button type="button" onClick={() => setActionError(null)} aria-label="Dismiss error">✕</button>
        </div>
      )}

      <ConfirmationModal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDeleteChat}
        title="Delete conversation"
        message={pendingDelete ? `This will remove "${pendingDelete.name}" from your chats.` : ''}
        confirmText="Delete"
        confirmButtonVariant="danger"
        isLoading={deleteBusy}
        icon="🗑️"
      />
    </div>
  );
};

export default ChatList;