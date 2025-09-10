import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import chatApi from '../services/chatApi';

interface User {
  id: string;
  name: string;
  email: string;
  profilePicUrl?: string;
  role: 'MEMBER' | 'MODERATOR' | 'ADMIN';
  isOnline?: boolean;
  lastSeen?: string;
}

interface UserListProps {
  onUserSelect?: (user: User) => void;
}

const UserList: React.FC<UserListProps> = ({ onUserSelect }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingDM, setCreatingDM] = useState<string | null>(null);
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const formatLastSeen = (lastSeenString: string): string => {
    try {
      const lastSeen = new Date(lastSeenString);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 60) {
        return `${diffInMinutes} minutes ago`;
      } else if (diffInMinutes < 1440) { // 24 hours
        const hours = Math.floor(diffInMinutes / 60);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
      } else {
        const days = Math.floor(diffInMinutes / 1440);
        return `${days} day${days > 1 ? 's' : ''} ago`;
      }
    } catch {
      return 'some time ago';
    }
  };

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get real users from the backend API
      const realUsers = await chatApi.getUsers();
      
      // Convert to our User interface format
      const formattedUsers: User[] = realUsers.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        profilePicUrl: user.profilePicUrl,
        role: user.role as 'MEMBER' | 'MODERATOR' | 'ADMIN',
        isOnline: user.isOnline,
        lastSeen: user.lastSeen ? formatLastSeen(user.lastSeen) : undefined,
      }));
      
      setUsers(formattedUsers);
      
    } catch (err) {
      setError('Failed to load church members');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.email]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleUserClick = async (user: User) => {
    try {
      setCreatingDM(user.id);
      setError(null);
      
      console.log('Starting direct message with:', user.name);
      
      if (onUserSelect) {
        onUserSelect(user);
      } else {
        // Create or get direct message conversation
        const dmGroup = await chatApi.createDirectMessage(user.email);
        
        // Navigate to the direct message chat
        navigate(`/chats/${dmGroup.id}`);
      }
    } catch (err: any) {
      console.error('Error starting direct message:', err);
      const errorMessage = err.response?.data?.error || 'Failed to start direct message';
      setError(`Failed to start conversation with ${user.name}: ${errorMessage}`);
    } finally {
      setCreatingDM(null);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN': return '👑';
      case 'MODERATOR': return '🛡️';
      default: return '👤';
    }
  };

  const getOnlineStatus = (user: User) => {
    if (user.isOnline) {
      return <span className="online-indicator">🟢 Online</span>;
    } else if (user.lastSeen) {
      return <span className="offline-indicator">⚫ {user.lastSeen}</span>;
    } else {
      return <span className="offline-indicator">⚫ Offline</span>;
    }
  };

  if (loading) {
    return (
      <div className="user-list loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading church members...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-list error">
        <p>{error}</p>
        <button onClick={loadUsers} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="user-list">
      <div className="user-list-header">
        <h3>Church Members ({users.length})</h3>
        <p>Start a direct conversation with any member</p>
      </div>
      
      {users.length === 0 ? (
        <div className="empty-state">
          <p>👥 No other members found</p>
          <p>Invite more people to join your church community!</p>
        </div>
      ) : (
        <div className="users-grid">
          {users.map((user) => (
            <div 
              key={user.id} 
              className="user-item"
              onClick={() => handleUserClick(user)}
            >
              <div className="user-avatar">
                {user.profilePicUrl ? (
                  <img src={user.profilePicUrl} alt={user.name} />
                ) : (
                  <div className="avatar-placeholder">
                    {getRoleIcon(user.role)}
                  </div>
                )}
                {user.isOnline && <div className="online-dot"></div>}
              </div>
              
              <div className="user-info">
                <div className="user-name">
                  {user.name}
                  {user.role !== 'MEMBER' && (
                    <span className="role-badge">{user.role}</span>
                  )}
                </div>
                <div className="user-status">
                  {getOnlineStatus(user)}
                </div>
              </div>
              
              <div className="user-actions">
                <button 
                  className="message-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUserClick(user);
                  }}
                  disabled={creatingDM === user.id}
                >
                  {creatingDM === user.id ? '⏳' : '💬'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserList;
