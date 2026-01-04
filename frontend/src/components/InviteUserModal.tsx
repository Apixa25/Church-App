import React, { useState, useCallback, useEffect } from 'react';
import { profileAPI } from '../services/api';
import groupInviteApi from '../services/groupInviteApi';
import './InviteUserModal.css';

interface User {
  id: string;
  name: string;
  email: string;
  profilePicUrl?: string;
}

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  onInviteSent?: () => void;
}

const InviteUserModal: React.FC<InviteUserModalProps> = ({
  isOpen,
  onClose,
  groupId,
  groupName,
  onInviteSent,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUser(null);
      setMessage('');
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await profileAPI.searchUsers(searchQuery, 0, 10);
        setSearchResults(response.data.content || []);
      } catch (err) {
        console.error('Error searching users:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSelectUser = useCallback((user: User) => {
    setSelectedUser(user);
    setSearchQuery('');
    setSearchResults([]);
    setError(null);
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedUser(null);
    setError(null);
  }, []);

  const handleSubmit = async () => {
    if (!selectedUser) {
      setError('Please select a user to invite');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await groupInviteApi.createInvitation(groupId, selectedUser.id, message || undefined);
      setSuccess(`Invitation sent to ${selectedUser.name}!`);
      setSelectedUser(null);
      setMessage('');
      onInviteSent?.();

      // Close modal after short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to send invitation';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content invite-user-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Invite to {groupName}</h2>
          <button
            className="modal-close-btn"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="invite-error">{error}</div>}
          {success && <div className="invite-success">{success}</div>}

          {!selectedUser ? (
            <div className="user-search-section">
              <label className="input-label">Search for a user</label>
              <input
                type="text"
                className="search-input"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />

              {isSearching && (
                <div className="search-status">Searching...</div>
              )}

              {searchResults.length > 0 && (
                <div className="search-results">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="search-result-item"
                      onClick={() => handleSelectUser(user)}
                    >
                      <div className="user-avatar">
                        {user.profilePicUrl ? (
                          <img src={user.profilePicUrl} alt={user.name} />
                        ) : (
                          <div className="avatar-placeholder">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="user-info">
                        <div className="user-name">{user.name}</div>
                        <div className="user-email">{user.email}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                <div className="no-results">No users found</div>
              )}
            </div>
          ) : (
            <div className="selected-user-section">
              <label className="input-label">Inviting</label>
              <div className="selected-user-card">
                <div className="user-avatar">
                  {selectedUser.profilePicUrl ? (
                    <img src={selectedUser.profilePicUrl} alt={selectedUser.name} />
                  ) : (
                    <div className="avatar-placeholder">
                      {selectedUser.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="user-info">
                  <div className="user-name">{selectedUser.name}</div>
                  <div className="user-email">{selectedUser.email}</div>
                </div>
                <button
                  className="clear-selection-btn"
                  onClick={handleClearSelection}
                  disabled={isSubmitting}
                >
                  ✕
                </button>
              </div>

              <div className="message-section">
                <label className="input-label">Add a message (optional)</label>
                <textarea
                  className="message-input"
                  placeholder="Hey! I'd love for you to join this group..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
                <div className="char-count">{message.length}/500</div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-confirm btn-primary"
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedUser}
          >
            {isSubmitting ? 'Sending...' : 'Send Invitation'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteUserModal;
