import React, { useState, useEffect } from 'react';
import { getBlockedUsers, unblockUser } from '../services/postApi';
import { UserProfile } from '../types/Profile';
import ClickableAvatar from './ClickableAvatar';
import './BlockedUsersList.css';

interface BlockedUsersListProps {
  isOpen: boolean;
  onClose: () => void;
}

const BlockedUsersList: React.FC<BlockedUsersListProps> = ({ isOpen, onClose }) => {
  const [blockedUsers, setBlockedUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  const USERS_PER_PAGE = 20;

  useEffect(() => {
    if (isOpen) {
      loadBlockedUsers(true);
    } else {
      // Reset state when modal closes
      setBlockedUsers([]);
      setPage(0);
      setHasMore(true);
      setError('');
    }
  }, [isOpen]);

  const loadBlockedUsers = async (reset: boolean = false) => {
    try {
      setLoading(true);
      setError('');

      const currentPage = reset ? 0 : page;
      const response = await getBlockedUsers(currentPage, USERS_PER_PAGE);

      if (reset) {
        setBlockedUsers(response.content || []);
        setPage(1);
      } else {
        setBlockedUsers(prev => [...prev, ...(response.content || [])]);
        setPage(prev => prev + 1);
      }

      setHasMore(
        response.currentPage !== undefined &&
        response.currentPage < (response.totalPages || 0) - 1
      );
    } catch (err: any) {
      console.error('Error loading blocked users:', err);
      setError('Failed to load blocked users');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (userId: string, userName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to unblock ${userName}? You will see their posts again and they will see yours.`
    );

    if (!confirmed) return;

    try {
      setUnblockingId(userId);
      await unblockUser(userId);
      
      // Remove from list
      setBlockedUsers(prev => prev.filter(user => user.userId !== userId));
    } catch (err: any) {
      console.error('Error unblocking user:', err);
      alert('Failed to unblock user. Please try again.');
    } finally {
      setUnblockingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content blocked-users-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🚫 Blocked Users</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {blockedUsers.length === 0 && !loading ? (
            <div className="empty-state">
              <div className="empty-icon">🚫</div>
              <p>You haven't blocked any users</p>
              <small>Blocked users won't be able to see your posts or interact with you</small>
            </div>
          ) : (
            <div className="blocked-users-list">
              {blockedUsers.map((user) => (
                <div key={user.userId} className="blocked-user-item">
                  <ClickableAvatar
                    userId={user.userId}
                    profilePicUrl={user.profilePicUrl}
                    userName={user.name}
                    size="medium"
                  />
                  <div className="blocked-user-info">
                    <div className="blocked-user-name">{user.name}</div>
                    {user.bio && (
                      <div className="blocked-user-bio">{user.bio}</div>
                    )}
                  </div>
                  <button
                    className="unblock-btn"
                    onClick={() => handleUnblock(user.userId, user.name)}
                    disabled={unblockingId === user.userId}
                    title="Unblock user"
                  >
                    {unblockingId === user.userId ? (
                      <span className="loading-spinner">...</span>
                    ) : (
                      'Unblock'
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {loading && (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <span>Loading blocked users...</span>
            </div>
          )}

          {hasMore && !loading && blockedUsers.length > 0 && (
            <button
              className="load-more-btn"
              onClick={() => loadBlockedUsers(false)}
            >
              Load More
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlockedUsersList;

